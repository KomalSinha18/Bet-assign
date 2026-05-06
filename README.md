# 🎰 Bet-Split Proxy — Reverse Proxy Middleware for Bet Splitting

A production-ready Node.js (Express) middleware that transparently intercepts bet placement requests, splits the stake between an **SBO API** (fixed minimum stake) and an **Aggregator API** (remaining amount), all without modifying the frontend or core betting flow.

---

## Architecture

```
Client (Frontend)
       │
       ▼
┌─────────────────────────┐
│  Reverse Proxy (Express)│   ← Port 3000
│  Rate Limiter           │
│  Zod Validation         │
│  Bet Splitter           │
│  Retry Queue            │
└────────┬────────┬───────┘
         │        │
    ┌────▼──┐  ┌──▼──────────┐
    │ SBO   │  │ Aggregator  │
    │ API   │  │ API         │
    │:4001  │  │:4002        │
    └───────┘  └─────────────┘
```

**Key Design Decisions:**
- SBO response is **authoritative** — always returned to the client.
- Aggregator is **internal-only** — never exposed to the frontend.
- SBO failure → error to user immediately; Aggregator result ignored.
- Aggregator failure → success to user (if SBO ok); failure logged & retried.

---

## Project Structure

```
Bet-assign/
├── .env                          # Environment config
├── .env.example                  # Template for new developers
├── package.json
├── README.md
└── src/
    ├── index.js                  # Express app entry point
    ├── config/
    │   └── index.js              # Centralized configuration
    ├── controllers/
    │   └── betController.js      # Orchestration: split → fan-out → respond
    ├── middleware/
    │   ├── proxyMiddleware.js     # http-proxy-middleware (domain routing)
    │   ├── rateLimiter.js        # express-rate-limit
    │   └── requestValidator.js   # Zod schema validation
    ├── services/
    │   ├── betSplitter.js        # Pure splitting logic
    │   ├── sboService.js         # SBO API client (no retries)
    │   ├── aggregatorService.js  # Aggregator client (with retries)
    │   └── retryQueue.js         # In-memory background retry queue
    ├── utils/
    │   └── logger.js             # Winston structured logging
    ├── mock/
    │   ├── sboServer.js          # Mock SBO API (:4001)
    │   └── aggregatorServer.js   # Mock Aggregator API (:4002)
    └── demo/
        ├── testSuccess.js        # Happy-path test
        ├── testSboFail.js        # SBO failure scenario
        ├── testAggregatorFail.js # Aggregator failure scenario
        ├── testValidation.js     # Validation edge cases
        └── runAll.js             # Run all demos
```

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and adjust if needed:

```bash
cp .env.example .env
```

### 3. Start all servers (one command)

```bash
npm run demo
```

This starts:
- Mock SBO API on **:4001**
- Mock Aggregator API on **:4002**
- Bet-Split Proxy on **:3000**

### 4. Run demo scenarios

In a **separate terminal**:

```bash
# All scenarios
npm run test:all

# Individual scenarios
npm run test:success
npm run test:sbo-fail
npm run test:aggregator-fail
npm run test:validation
```

---

## API Reference

### `POST /place-bet`

**Request:**
```json
{
  "eventId": "EVT-12345",
  "odds": 2.5,
  "stake": 500,
  "transId": "TXN-001"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Bet placed successfully",
  "transId": "TXN-001",
  "data": {
    "success": true,
    "message": "Bet placed with SBO",
    "data": {
      "transId": "TXN-001",
      "eventId": "EVT-12345",
      "odds": 2.5,
      "stake": 100,
      "sboRefId": "SBO-1717000000000",
      "status": "ACCEPTED"
    }
  }
}
```

> **Note:** `stake` in the response is `100` (MIN_STAKE) because SBO only receives the minimum. The remaining `400` went to the Aggregator internally.

**SBO Failure Response (500/502):**
```json
{
  "success": false,
  "error": "SBO_BET_FAILED",
  "message": "SBO rejected the bet",
  "transId": "TXN-001"
}
```

**Validation Error (400):**
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Invalid request payload",
  "details": [
    { "field": "stake", "message": "stake must be a positive number" }
  ]
}
```

### `GET /health`

Returns system health including retry queue depth.

---

## Bet Splitting Logic

```
MIN_STAKE = 100 (configurable via .env)

if stake <= MIN_STAKE:
    SBO gets: stake
    Aggregator gets: 0 (not called)
else:
    SBO gets: MIN_STAKE
    Aggregator gets: stake - MIN_STAKE
```

| Original Stake | SBO Stake | Aggregator Stake | Aggregator Called? |
|:-:|:-:|:-:|:-:|
| 50 | 50 | 0 | ❌ |
| 100 | 100 | 0 | ❌ |
| 500 | 100 | 400 | ✅ |
| 1000 | 100 | 900 | ✅ |

---

## Failure Handling

| Scenario | User Response | Aggregator Action |
|---|---|---|
| SBO ✅ Aggregator ✅ | Success | Stored |
| SBO ✅ Aggregator ❌ | **Success** | Logged + enqueued for retry |
| SBO ❌ Aggregator ✅ | **Error** | Result ignored |
| SBO ❌ Aggregator ❌ | **Error** | Result ignored |

---

## Retry Strategy

1. **Inline retries:** Aggregator calls are retried up to `2` times (configurable) with `500ms` delay between attempts.
2. **Background queue:** After inline retries are exhausted, failed bets are pushed to an in-memory retry queue that drains every 30 seconds.
3. **SBO is never retried.**

---

## Reverse Proxy

All requests **except** `/place-bet` and `/health` are transparently forwarded to the upstream SBO API via `http-proxy-middleware`.

**Domain-based routing** is supported for:
- `bialanh.com`
- `onlinesbobet.com`
- `dapatceria.com`

The proxy inspects the `Host` header and routes accordingly.

---

## Outbound Proxy (Optional)

For geo-restricted environments, configure an HTTP proxy in `.env`:

```env
OUTBOUND_PROXY_HOST=209.50.185.190
OUTBOUND_PROXY_PORT=3129
OUTBOUND_PROXY_USER=uyqfukkl9k47
OUTBOUND_PROXY_PASS=p3t6eijg0rh3ntp
```

This routes SBO API calls through the specified proxy using `https-proxy-agent`.

---

## Configuration (.env)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Proxy server port |
| `SBO_API_URL` | `http://localhost:4001` | SBO upstream URL |
| `AGGREGATOR_API_URL` | `http://localhost:4002` | Aggregator upstream URL |
| `MIN_STAKE` | `100` | Minimum stake sent to SBO |
| `AGGREGATOR_MAX_RETRIES` | `2` | Retry attempts for Aggregator |
| `AGGREGATOR_RETRY_DELAY_MS` | `500` | Delay between retries |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max requests per window |
| `LOG_LEVEL` | `info` | Winston log level |
| `NODE_ENV` | `development` | Environment mode |

---

## Bonus Features

- ✅ **Zod request validation** with detailed error messages
- ✅ **Rate limiting** via `express-rate-limit`
- ✅ **In-memory retry queue** with background drain worker
- ✅ **Structured logging** (Winston) with JSON mode for production
- ✅ **Outbound proxy support** for geo-restricted SBO access
- ✅ **Domain-based routing** via Host header
- ✅ **Health endpoint** with queue depth metrics
- ✅ **Error simulation headers** for testing (`x-simulate-sbo-error`, `x-simulate-aggregator-error`)

---

## Scripts Reference

| Script | Description |
|---|---|
| `npm start` | Start proxy server |
| `npm run dev` | Start with file watching |
| `npm run mock:sbo` | Start mock SBO API only |
| `npm run mock:aggregator` | Start mock Aggregator API only |
| `npm run mock:all` | Start both mock servers |
| `npm run demo` | Start everything (proxy + both mocks) |
| `npm run test:success` | Run success scenario |
| `npm run test:sbo-fail` | Run SBO failure scenario |
| `npm run test:aggregator-fail` | Run Aggregator failure scenario |
| `npm run test:validation` | Run validation tests |
| `npm run test:all` | Run all demo scenarios |
