package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for sandbox
	},
}

// Client Hub for WebSocket streaming
type Hub struct {
	clients   map[*websocket.Conn]bool
	broadcast chan []byte
	lock      sync.RWMutex
}

func newHub() *Hub {
	return &Hub{
		clients:   make(map[*websocket.Conn]bool),
		broadcast: make(chan []byte, 256),
	}
}

func (h *Hub) run() {
	for msg := range h.broadcast {
		h.lock.RLock()
		for client := range h.clients {
			err := client.WriteMessage(websocket.TextMessage, msg)
			if err != nil {
				client.Close()
				delete(h.clients, client)
			}
		}
		h.lock.RUnlock()
	}
}

func (h *Hub) register(conn *websocket.Conn) {
	h.lock.Lock()
	h.clients[conn] = true
	h.lock.Unlock()
}

func (h *Hub) unregister(conn *websocket.Conn) {
	h.lock.Lock()
	if _, ok := h.clients[conn]; ok {
		delete(h.clients, conn)
		conn.Close()
	}
	h.lock.Unlock()
}

// Tick Packet structure matching Dhan / Fyers
type MarketTick struct {
	Type        string  `json:"type"`
	Index       string  `json:"index"`
	FyersSymbol string  `json:"fyers_symbol"`
	LTP         float64 `json:"ltp"`
	Open        float64 `json:"open"`
	High        float64 `json:"high"`
	Low         float64 `json:"low"`
	Change      float64 `json:"ch"`
	ChangePct   float64 `json:"chp"`
	Timestamp   int64   `json:"timestamp"`
}

var supportedIndices = []struct {
	Name        string
	Symbol      string
	FyersSymbol string
	BasePrice   float64
}{
	{"NIFTY 50", "NIFTY50", "NSE:NIFTY50-INDEX", 25200.00},
	{"BANK NIFTY", "BANKNIFTY", "NSE:NIFTYBANK-INDEX", 52100.00},
	{"FINNIFTY", "FINNIFTY", "NSE:FINNIFTY-INDEX", 24350.00},
	{"MIDCAP NIFTY", "MIDCAPNIFTY", "NSE:MIDCPNIFTY-INDEX", 13150.00},
	{"BSE SENSEX", "SENSEX", "BSE:SENSEX-INDEX", 82400.00},
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8088"
	}

	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "redis://redis:6379/0"
	}

	backendURL := os.Getenv("DJANGO_BACKEND_URL")
	if backendURL == "" {
		backendURL = "http://backend:8000"
	}

	log.Println("[ANVIL-ENGINE] Starting High-Speed Dhan-Compatible Engine...")
	log.Printf("[ANVIL-ENGINE] Listening Port: %s", port)
	log.Printf("[ANVIL-ENGINE] Redis Target: %s", redisURL)
	log.Printf("[ANVIL-ENGINE] Django Backend Target: %s", backendURL)

	// Redis client
	opts, err := redis.ParseURL(redisURL)
	var rdb *redis.Client
	if err == nil {
		rdb = redis.NewClient(opts)
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		if err := rdb.Ping(ctx).Err(); err != nil {
			log.Printf("[ANVIL-ENGINE] Warning: Redis connection failed (%v). Running in local tick mode.", err)
		} else {
			log.Println("[ANVIL-ENGINE] Redis connected successfully.")
		}
		cancel()
	}

	hub := newHub()
	go hub.run()

	// High-frequency tick generator & Redis broadcaster
	go startTickStreamer(hub, rdb)

	// Setup Reverse Proxy to Django for Dhan v2 endpoints
	target, err := url.Parse(backendURL)
	if err != nil {
		log.Fatalf("[ANVIL-ENGINE] Invalid backend URL: %v", err)
	}
	proxy := httputil.NewSingleHostReverseProxy(target)

	mux := http.NewServeMux()

	// Health Checks
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"online","service":"anvil-engine","version":"1.0.0"}`))
	})
	mux.HandleFunc("/mock/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"online","service":"anvil-engine","version":"1.0.0"}`))
	})

	// WebSocket Marketfeed
	wsHandler := func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("[ANVIL-WS] Upgrade error: %v", err)
			return
		}
		hub.register(conn)
		defer hub.unregister(conn)

		// Send initial welcome snapshot
		welcome := map[string]interface{}{
			"type":      "welcome",
			"connected": true,
			"indices":   []string{"NIFTY50", "BANKNIFTY", "FINNIFTY", "MIDCAPNIFTY", "SENSEX"},
		}
		if data, err := json.Marshal(welcome); err == nil {
			conn.WriteMessage(websocket.TextMessage, data)
		}

		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				break
			}
		}
	}

	mux.HandleFunc("/v2/marketfeed/ws", wsHandler)
	mux.HandleFunc("/mock/v2/marketfeed/ws", wsHandler)

	// Fast In-Memory Order Placement Interceptor
	mux.HandleFunc("/v2/orders", func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		// Delegate to proxy with sub-millisecond recording
		proxy.ServeHTTP(w, r)
		duration := time.Since(start)
		log.Printf("[ANVIL-ORDER] Handled %s /v2/orders in %v", r.Method, duration)
	})

	// Catch-all Dhan v2 and mock v2 routes proxying to backend
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		proxy.ServeHTTP(w, r)
	})

	addr := fmt.Sprintf("0.0.0.0:%s", port)
	log.Printf("[ANVIL-ENGINE] Server listening on %s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("[ANVIL-ENGINE] Listen error: %v", err)
	}
}

func startTickStreamer(hub *Hub, rdb *redis.Client) {
	ticker := time.NewTicker(1000 * time.Millisecond)
	defer ticker.Stop()

	prices := make(map[string]float64)
	for _, idx := range supportedIndices {
		prices[idx.Symbol] = idx.BasePrice
	}

	for range ticker.C {
		for _, idx := range supportedIndices {
			curr := prices[idx.Symbol]
			// Small brownian drift
			drift := (rand.Float64() - 0.5) * (curr * 0.001)
			newPrice := curr + drift
			prices[idx.Symbol] = newPrice

			ch := newPrice - idx.BasePrice
			chp := (ch / idx.BasePrice) * 100

			tick := MarketTick{
				Type:        "TICK",
				Index:       idx.Symbol,
				FyersSymbol: idx.FyersSymbol,
				LTP:         roundFloat(newPrice, 2),
				Open:        roundFloat(idx.BasePrice-25, 2),
				High:        roundFloat(newPrice+45, 2),
				Low:         roundFloat(newPrice-45, 2),
				Change:      roundFloat(ch, 2),
				ChangePct:   roundFloat(chp, 2),
				Timestamp:   time.Now().Unix(),
			}

			payload, err := json.Marshal(tick)
			if err == nil {
				hub.broadcast <- payload

				// Optionally store in Redis
				if rdb != nil {
					ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
					rdb.Set(ctx, fmt.Sprintf("anvil:fyers_quote:%s", idx.FyersSymbol), string(payload), 5*time.Second)
					cancel()
				}
			}
		}
	}
}

func roundFloat(val float64, precision uint) float64 {
	ratio := 1.0
	for i := uint(0); i < precision; i++ {
		ratio *= 10.0
	}
	return float64(int(val*ratio+0.5)) / ratio
}
