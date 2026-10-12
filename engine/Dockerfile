FROM golang:1.23-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git ca-certificates

COPY go.mod ./
COPY . .

# Download dependencies and generate cryptographic checksums
RUN go mod tidy

# Build statically linked binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o anvil-engine main.go

# Production stage
FROM alpine:3.20

WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata
ENV TZ=Asia/Kolkata

COPY --from=builder /app/anvil-engine /app/anvil-engine

EXPOSE 8088

CMD ["/app/anvil-engine"]
