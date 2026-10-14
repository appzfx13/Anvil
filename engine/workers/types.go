package workers

type TaskParams struct {
	UserID       string `json:"user_id"`
	IndexName    string `json:"index_name"`
	StartDate    string `json:"start_date"`
	EndDate      string `json:"end_date"`
	StrikeCount  int    `json:"strike_count"`
	Use30Days5s  bool   `json:"use_30_days_5s"`
	Use30Days1s  bool   `json:"use_30_days_1s"`
	IncludeVix   bool   `json:"include_vix"`
}

type CommandPayload struct {
	TaskID  string     `json:"task_id"`
	Command string     `json:"command"`
	Params  TaskParams `json:"params"`
}

type ProgressEvent struct {
	Event            string  `json:"event"`
	TaskID           string  `json:"task_id"`
	Status           string  `json:"status"`
	Progress         int     `json:"progress"`
	ProcessedStrikes int     `json:"processed_strikes"`
	TotalStrikes     int     `json:"total_strikes"`
	Message          string  `json:"message"`
	FileSizeMB       float64 `json:"file_size_mb,omitempty"`
}
