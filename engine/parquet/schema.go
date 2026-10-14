package parquet

type CandleRecord struct {
	Timestamp     int64   `parquet:"timestamp"`
	Symbol        string  `parquet:"symbol"`
	Underlying    string  `parquet:"underlying"`
	Expiry        int32   `parquet:"expiry"`
	StrikePrice   float64 `parquet:"strike_price"`
	OptionType    string  `parquet:"option_type"`
	Open          float64 `parquet:"open"`
	High          float64 `parquet:"high"`
	Low           float64 `parquet:"low"`
	Close         float64 `parquet:"close"`
	Volume        int64   `parquet:"volume"`
	OpenInterest  int64   `parquet:"open_interest"`
}
