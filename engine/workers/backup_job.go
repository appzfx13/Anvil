package workers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"anvil-engine/parquet"
	"anvil-engine/scrip"
	"github.com/redis/go-redis/v9"
)

type BackupJob struct {
	payload       CommandPayload
	redisClient   *redis.Client
	backendURL    string
	fyersToken    string
	broadcastFunc func([]byte)
}

func NewBackupJob(payload CommandPayload, rdb *redis.Client, backendURL, fyersToken string, broadcaster func([]byte)) *BackupJob {
	return &BackupJob{
		payload:       payload,
		redisClient:   rdb,
		backendURL:    backendURL,
		fyersToken:    fyersToken,
		broadcastFunc: broadcaster,
	}
}

func (j *BackupJob) emitProgress(ctx context.Context, status string, progress, processed, total int, message string, sizeMB float64) {
	evt := ProgressEvent{
		Event:            "BACKUP_PROGRESS",
		TaskID:           j.payload.TaskID,
		Status:           status,
		Progress:         progress,
		ProcessedStrikes: processed,
		TotalStrikes:     total,
		Message:          message,
		FileSizeMB:       sizeMB,
	}

	data, err := json.Marshal(evt)
	if err == nil {
		if j.broadcastFunc != nil {
			j.broadcastFunc(data)
		}
		if j.redisClient != nil {
			_ = j.redisClient.Publish(ctx, "anvil:tasks:telemetry", string(data)).Err()
		}
	}
}

func (j *BackupJob) updateDB(ctx context.Context, status string, progress int, filePath string, sizeMB float64, totalRecords int64, errLog string) {
	if j.backendURL == "" {
		return
	}

	payload := map[string]interface{}{
		"status":            status,
		"progress":          progress,
		"parquet_file_path": filePath,
		"file_size_mb":      sizeMB,
		"total_records":     totalRecords,
		"error_logs":        errLog,
	}

	data, err := json.Marshal(payload)
	if err != nil {
		return
	}

	targetURL := fmt.Sprintf("%s/api/v1/market/backups/%s/", strings.TrimRight(j.backendURL, "/"), j.payload.TaskID)
	req, err := http.NewRequestWithContext(ctx, "PATCH", targetURL, bytes.NewBuffer(data))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[BACKUP-JOB #%s] Warning: Failed to sync DB status via %s: %v", j.payload.TaskID, targetURL, err)
		return
	}
	defer resp.Body.Close()
	log.Printf("[BACKUP-JOB #%s] Synced status '%s' (%d%%) to DB (HTTP %d)", j.payload.TaskID, status, progress, resp.StatusCode)
}

func (j *BackupJob) Run(ctx context.Context) {
	taskID := j.payload.TaskID
	params := j.payload.Params
	userID := params.UserID
	if userID == "" {
		userID = "1"
	}

	log.Printf("[BACKUP-JOB #%s] Started F&O Market Data Pipeline for %s (%s to %s) | StrikeCount: +/- %d",
		taskID, params.IndexName, params.StartDate, params.EndDate, params.StrikeCount)

	j.updateDB(ctx, "RUNNING", 5, "", 0.0, 0, "")
	j.emitProgress(ctx, "RUNNING", 5, 0, 100, "Initializing date range & resolving F&O expiries...", 0.0)

	loc, _ := time.LoadLocation("Asia/Kolkata")
	if loc == nil {
		loc = time.FixedZone("IST", 5*3600+1800)
	}

	backupDir := fmt.Sprintf("/app/backup/%s/%s", userID, taskID)
	if err := os.MkdirAll(backupDir, 0755); err != nil {
		backupDir = filepath.Join("backup", userID, taskID)
		_ = os.MkdirAll(backupDir, 0755)
	}
	stagingDir := filepath.Join(backupDir, "staging")
	_ = os.MkdirAll(stagingDir, 0755)

	// Stage 1: Download Spot Candles
	j.emitProgress(ctx, "RUNNING", 15, 0, 100, fmt.Sprintf("Stage 1: Fetching Spot underlying candles for %s...", params.IndexName), 0.0)

	spotSymbol := fmt.Sprintf("NSE:%s-INDEX", strings.ToUpper(params.IndexName))
	if strings.ToUpper(params.IndexName) == "SENSEX" {
		spotSymbol = "BSE:SENSEX-INDEX"
	} else if strings.ToUpper(params.IndexName) == "NIFTY" {
		spotSymbol = "NSE:NIFTY50-INDEX"
	}

	resolution := "1"
	if params.Use30Days5s {
		resolution = "5S"
	} else if params.Use30Days1s {
		resolution = "1S"
	}

	var allRecords []parquet.CandleRecord

	// Check cancellation
	select {
	case <-ctx.Done():
		j.updateDB(context.Background(), "CANCELLED", 0, "", 0.0, 0, "Job cancelled by user.")
		j.emitProgress(context.Background(), "CANCELLED", 0, 0, 0, "Job cancelled by user.", 0.0)
		return
	default:
	}

	// Fetch Spot candles from Fyers or local cache
	spotRecords := j.fetchCandles(ctx, spotSymbol, params.IndexName, 0, 0, "SPOT", params.StartDate, params.EndDate, resolution, loc)
	if len(spotRecords) > 0 {
		allRecords = append(allRecords, spotRecords...)
		log.Printf("[BACKUP-JOB #%s] Stage 1 Spot: Ingested %d spot candles for %s", taskID, len(spotRecords), spotSymbol)
	}

	// Fetch India VIX if requested
	if params.IncludeVix {
		vixRecords := j.fetchCandles(ctx, "NSE:INDIAVIX-INDEX", "INDIAVIX", 0, 0, "VIX", params.StartDate, params.EndDate, resolution, loc)
		if len(vixRecords) > 0 {
			allRecords = append(allRecords, vixRecords...)
			log.Printf("[BACKUP-JOB #%s] Stage 1 VIX: Ingested %d candles for INDIA VIX", taskID, len(vixRecords))
		}
	}

	// Stage 2: Option Strikes Download
	j.emitProgress(ctx, "RUNNING", 35, 0, 100, "Stage 2: Resolving expiries & strikes sweep...", 0.0)

	expiries := scrip.GenerateIndexExpiries(params.IndexName, params.StartDate, params.EndDate, loc)
	step := scrip.GetStrikeInterval(params.IndexName)

	// Estimate ATM strike from spot
	basePrice := 25000.0
	if strings.ToUpper(params.IndexName) == "BANKNIFTY" {
		basePrice = 52000.0
	} else if strings.ToUpper(params.IndexName) == "FINNIFTY" {
		basePrice = 24000.0
	} else if strings.ToUpper(params.IndexName) == "MIDCPNIFTY" {
		basePrice = 13000.0
	} else if strings.ToUpper(params.IndexName) == "SENSEX" {
		basePrice = 82000.0
	}

	if len(spotRecords) > 0 {
		basePrice = spotRecords[len(spotRecords)/2].Close
	}
	atmStrike := math.Round(basePrice/step) * step

	totalStrikes := (params.StrikeCount * 2 + 1) * 2 * len(expiries)
	if totalStrikes == 0 {
		totalStrikes = 1
	}
	processedStrikes := 0

	for _, exp := range expiries {
		select {
		case <-ctx.Done():
			j.updateDB(context.Background(), "CANCELLED", 0, "", 0.0, 0, "Job cancelled by user.")
			j.emitProgress(context.Background(), "CANCELLED", 0, 0, 0, "Job cancelled by user.", 0.0)
			return
		default:
		}

		for i := -params.StrikeCount; i <= params.StrikeCount; i++ {
			strike := atmStrike + float64(i)*step
			expiryEpoch := int32(exp.Unix())

			for _, optType := range []string{"CE", "PE"} {
				optSymbol := scrip.BuildFyersOptionSymbol(params.IndexName, exp, strike, optType)
				optCandles := j.fetchCandles(ctx, optSymbol, params.IndexName, expiryEpoch, strike, optType, params.StartDate, params.EndDate, resolution, loc)
				if len(optCandles) > 0 {
					allRecords = append(allRecords, optCandles...)
				}
				processedStrikes++
			}

			progressPct := 35 + int((float64(processedStrikes)/float64(totalStrikes))*50.0)
			if progressPct > 85 {
				progressPct = 85
			}
			j.emitProgress(ctx, "RUNNING", progressPct, processedStrikes, totalStrikes, fmt.Sprintf("Processing %s strikes (Expiry: %s)...", params.IndexName, exp.Format("02-Jan")), 0.0)
		}
	}

	// Stage 3: Parquet Compaction
	j.emitProgress(ctx, "RUNNING", 90, processedStrikes, totalStrikes, "Stage 3: Compacting records into Snappy Apache Parquet binary...", 0.0)

	finalParquetPath := filepath.Join(backupDir, "dataset.parquet")
	err := parquet.WriteCandles(finalParquetPath, allRecords)
	if err != nil {
		log.Printf("[BACKUP-JOB #%s] Parquet compression error: %v", taskID, err)
		j.updateDB(ctx, "FAILED", 0, "", 0.0, 0, fmt.Sprintf("Parquet compression failed: %v", err))
		j.emitProgress(ctx, "FAILED", 0, processedStrikes, totalStrikes, fmt.Sprintf("Parquet compression failed: %v", err), 0.0)
		return
	}

	fileInfo, statErr := os.Stat(finalParquetPath)
	fileSizeMB := 0.0
	if statErr == nil {
		fileSizeMB = float64(fileInfo.Size()) / (1024 * 1024)
	}

	_ = os.RemoveAll(stagingDir)

	j.updateDB(ctx, "COMPLETED", 100, finalParquetPath, fileSizeMB, int64(len(allRecords)), "")
	j.emitProgress(ctx, "COMPLETED", 100, processedStrikes, totalStrikes, fmt.Sprintf("Parquet dataset generated successfully (%.2f MB, %d records)", fileSizeMB, len(allRecords)), fileSizeMB)

	log.Printf("[BACKUP-JOB #%s] COMPLETED: Created %s (%.2f MB, %d records)", taskID, finalParquetPath, fileSizeMB, len(allRecords))
}

func (j *BackupJob) fetchCandles(ctx context.Context, symbol, underlying string, expiry int32, strike float64, optType, startDate, endDate, res string, loc *time.Location) []parquet.CandleRecord {
	// Authenticated broker API or return nil (zero synthetic prices)
	if j.fyersToken == "" {
		return nil
	}

	tFrom, _ := time.ParseInLocation("2006-01-02", startDate, loc)
	tTo, _ := time.ParseInLocation("2006-01-02", endDate, loc)
	tTo = tTo.Add(23*time.Hour + 59*time.Minute)

	reqURL := fmt.Sprintf("https://api-t1.fyers.in/data/history?symbol=%s&resolution=%s&date_format=0&range_from=%d&range_to=%d&cont_flag=1",
		symbol, res, tFrom.Unix(), tTo.Unix())

	// Rate-limited with exponential backoff
	time.Sleep(25 * time.Millisecond)

	var lastBody []byte
	client := &http.Client{Timeout: 10 * time.Second}

	for attempt := 0; attempt < 3; attempt++ {
		if attempt > 0 {
			backoff := time.Duration(100*(1<<attempt)) * time.Millisecond
			time.Sleep(backoff)
		}

		req, err := http.NewRequestWithContext(ctx, "GET", reqURL, nil)
		if err != nil {
			return nil
		}
		req.Header.Set("Authorization", j.fyersToken)

		resp, err := client.Do(req)
		if err != nil {
			continue
		}
		if resp.StatusCode == 429 || resp.StatusCode >= 500 {
			resp.Body.Close()
			continue
		}
		if resp.StatusCode != http.StatusOK {
			resp.Body.Close()
			return nil
		}

		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err == nil {
			lastBody = body
			break
		}
	}

	if len(lastBody) == 0 {
		return nil
	}

	var fyersRes struct {
		S       string          `json:"s"`
		Candles [][]interface{} `json:"candles"`
	}
	if err := json.Unmarshal(lastBody, &fyersRes); err != nil || fyersRes.S != "ok" {
		return nil
	}

	var records []parquet.CandleRecord
	for _, c := range fyersRes.Candles {
		if len(c) < 5 {
			continue
		}
		ts := int64(c[0].(float64))
		o := c[1].(float64)
		h := c[2].(float64)
		l := c[3].(float64)
		closePrice := c[4].(float64)
		vol := int64(0)
		if len(c) >= 6 {
			vol = int64(c[5].(float64))
		}

		records = append(records, parquet.CandleRecord{
			Timestamp:    ts,
			Symbol:       symbol,
			Underlying:   underlying,
			Expiry:       expiry,
			StrikePrice:  strike,
			OptionType:   optType,
			Open:         o,
			High:         h,
			Low:          l,
			Close:        closePrice,
			Volume:       vol,
			OpenInterest: 0,
		})
	}
	return records
}
