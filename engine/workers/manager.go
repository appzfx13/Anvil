package workers

import (
	"context"
	"os"
	"encoding/json"
	"log"
	"sync"

	"github.com/redis/go-redis/v9"
)

type TaskManager struct {
	mu            sync.Mutex
	activeCtx     map[string]context.CancelFunc
	redisClient   *redis.Client
	backendURL    string
	broadcastFunc func([]byte)
}

func NewTaskManager(rdb *redis.Client, backendURL string, broadcaster func([]byte)) *TaskManager {
	return &TaskManager{
		activeCtx:     make(map[string]context.CancelFunc),
		redisClient:   rdb,
		backendURL:    backendURL,
		broadcastFunc: broadcaster,
	}
}

func (m *TaskManager) Listen(parentCtx context.Context) {
	if m.redisClient == nil {
		log.Println("[TASK-MANAGER] Warning: Redis client nil, skipping control listener.")
		return
	}

	pubsub := m.redisClient.Subscribe(parentCtx, "anvil:tasks:control")
	defer pubsub.Close()

	ch := pubsub.Channel()
	log.Println("[TASK-MANAGER] Subscribed to Redis channel 'anvil:tasks:control'...")

	for {
		select {
		case <-parentCtx.Done():
			return
		case msg, ok := <-ch:
			if !ok {
				return
			}
			m.handlePayload(parentCtx, msg.Payload)
		}
	}
}

func (m *TaskManager) handlePayload(parentCtx context.Context, payloadStr string) {
	var payload CommandPayload
	if err := json.Unmarshal([]byte(payloadStr), &payload); err != nil {
		log.Printf("[TASK-MANAGER] Invalid command payload: %v", err)
		return
	}

	log.Printf("[TASK-MANAGER] Received Command [%s] for Task #%s", payload.Command, payload.TaskID)

	switch payload.Command {
	case "START", "RETRY":
		m.startTask(parentCtx, payload)
	case "CANCEL":
		m.cancelTask(payload.TaskID)
	default:
		log.Printf("[TASK-MANAGER] Unknown command: %s", payload.Command)
	}
}

func (m *TaskManager) startTask(parentCtx context.Context, payload CommandPayload) {
	m.mu.Lock()
	if cancel, exists := m.activeCtx[payload.TaskID]; exists {
		cancel()
	}
	taskCtx, cancel := context.WithCancel(parentCtx)
	m.activeCtx[payload.TaskID] = cancel
	m.mu.Unlock()

	go func() {
		defer func() {
			m.mu.Lock()
			delete(m.activeCtx, payload.TaskID)
			m.mu.Unlock()
		}()

		// Get Fyers token from Redis or env if available
		fyersToken := ""
		if m.redisClient != nil {
			val, _ := m.redisClient.Get(taskCtx, "anvil:fyers:access_token").Result()
			fyersToken = val
		}
		if fyersToken == "" {
			fyersToken = os.Getenv("FYERS_ACCESS_TOKEN")
		}

		job := NewBackupJob(payload, m.redisClient, m.backendURL, fyersToken, m.broadcastFunc)
		job.Run(taskCtx)
	}()
}

func (m *TaskManager) cancelTask(taskID string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if cancel, exists := m.activeCtx[taskID]; exists {
		cancel()
		delete(m.activeCtx, taskID)
		log.Printf("[TASK-MANAGER] Cancelled context for Task #%s", taskID)
	}
}
