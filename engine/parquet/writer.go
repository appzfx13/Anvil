package parquet

import (
	"fmt"
	"os"

	"github.com/parquet-go/parquet-go"
)

// WriteCandles writes CandleRecord slice into an Apache Parquet file with Snappy compression
func WriteCandles(filePath string, records []CandleRecord) error {
	f, err := os.Create(filePath)
	if err != nil {
		return fmt.Errorf("create file error: %w", err)
	}
	defer f.Close()

	writer := parquet.NewGenericWriter[CandleRecord](f, parquet.Compression(&parquet.Snappy))
	defer writer.Close()

	_, err = writer.Write(records)
	if err != nil {
		return fmt.Errorf("write records error: %w", err)
	}

	return nil
}
