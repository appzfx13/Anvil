package scrip

import (
	"fmt"
	"strings"
	"time"
)

// Dynamic lot sizes reflecting regulatory timeline
func GetLotSize(indexName string, tradeDate time.Time) int {
	dStr := tradeDate.Format("2006-01-02")
	switch strings.ToUpper(indexName) {
	case "NIFTY", "NIFTY50":
		if dStr >= "2024-04-26" {
			return 25
		} else if dStr >= "2021-07-01" {
			return 50
		}
		return 75
	case "BANKNIFTY":
		if dStr >= "2024-11-20" {
			return 30
		} else if dStr >= "2023-07-01" {
			return 15
		}
		return 25
	case "FINNIFTY":
		if dStr >= "2024-08-01" {
			return 25
		}
		return 40
	case "MIDCPNIFTY":
		if dStr >= "2024-08-01" {
			return 50
		}
		return 75
	case "SENSEX":
		return 10
	default:
		return 25
	}
}

// GetStrikeInterval returns standard strike interval for index
func GetStrikeInterval(indexName string) float64 {
	switch strings.ToUpper(indexName) {
	case "BANKNIFTY", "SENSEX":
		return 100.0
	case "MIDCPNIFTY":
		return 25.0
	default: // NIFTY, FINNIFTY
		return 50.0
	}
}

// GetExpiryWeekday resolves weekly expiry weekday based on historical regulatory date
func GetExpiryWeekday(indexName string, tradeDate time.Time) time.Weekday {
	dStr := tradeDate.Format("2006-01-02")
	switch strings.ToUpper(indexName) {
	case "BANKNIFTY":
		if dStr >= "2023-09-04" && dStr < "2024-11-20" {
			return time.Wednesday
		}
		return time.Thursday
	case "FINNIFTY":
		return time.Tuesday
	case "MIDCPNIFTY":
		if dStr >= "2023-08-21" {
			return time.Monday
		}
		return time.Wednesday
	case "SENSEX":
		return time.Friday
	default: // NIFTY
		return time.Thursday
	}
}

func weeklyMonthCode(m time.Month) string {
	return [...]string{"", "1", "2", "3", "4", "5", "6", "7", "8", "9", "O", "N", "D"}[m]
}

func isMonthlyExpiry(t time.Time) bool {
	return t.AddDate(0, 0, 7).Month() != t.Month()
}

// BuildFyersOptionSymbol constructs canonical FYERS option scrip symbol
func BuildFyersOptionSymbol(indexName string, expiry time.Time, strike float64, optType string) string {
	yy := expiry.Format("06")
	strikeStr := fmt.Sprintf("%.0f", strike)
	cepe := strings.ToUpper(optType)
	if cepe == "CALL" {
		cepe = "CE"
	} else if cepe == "PUT" {
		cepe = "PE"
	}

	exch := "NSE"
	if strings.ToUpper(indexName) == "SENSEX" {
		exch = "BSE"
	}

	if isMonthlyExpiry(expiry) {
		mmm := strings.ToUpper(expiry.Format("Jan"))
		return fmt.Sprintf("%s:%s%s%s%s%s", exch, strings.ToUpper(indexName), yy, mmm, strikeStr, cepe)
	}

	mCode := weeklyMonthCode(expiry.Month())
	return fmt.Sprintf("%s:%s%s%s%02d%s%s", exch, strings.ToUpper(indexName), yy, mCode, expiry.Day(), strikeStr, cepe)
}

// GenerateIndexExpiries generates all weekly and monthly expiry days for the requested range
func GenerateIndexExpiries(indexName, startDate, endDate string, loc *time.Location) []time.Time {
	start, err1 := time.ParseInLocation("2006-01-02", startDate, loc)
	end, err2 := time.ParseInLocation("2006-01-02", endDate, loc)
	if err1 != nil || err2 != nil {
		return nil
	}

	seen := make(map[string]bool)
	var expiries []time.Time
	curr := start

	for !curr.After(end) {
		exp := curr
		targetWeekday := GetExpiryWeekday(indexName, exp)
		for exp.Weekday() != targetWeekday {
			exp = exp.AddDate(0, 0, 1)
			targetWeekday = GetExpiryWeekday(indexName, exp)
		}
		expKey := exp.Format("2006-01-02")
		if !seen[expKey] {
			seen[expKey] = true
			expiries = append(expiries, exp)
		}
		curr = curr.AddDate(0, 0, 1)
	}
	return expiries
}
