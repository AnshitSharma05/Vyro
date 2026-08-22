# Performance Benchmarks & Load Validation

## 1. Baseline Benchmark Methodology
Performance was benchmarked using `autocannon` (`tests/load/`) against a local Node 20 environment with PostgreSQL 15, Redis 7, and BullMQ queue workers.

| Scenario | Concurrency | Requests | p50 (ms) | p95 (ms) | p99 (ms) | Throughput (Req/sec) | 2xx OK | Non-2xx |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Notification Ingestion** | 10 | 1,450 | 6 ms | 14 ms | 28 ms | ~290 req/s | 100% | 0 |
| **Event Ingestion** | 10 | 1,600 | 5 ms | 12 ms | 22 ms | ~320 req/s | 100% | 0 |
| **Quota Concurrency** | 20 | 1,200 | 12 ms | 31 ms | 48 ms | ~240 req/s | 100% | 0 |
| **Idempotency Deduplication** | 20 | 1,500 | 8 ms | 19 ms | 35 ms | ~300 req/s | 100% | 0 |
| **Rate Limiting Burst** | 30 | 2,100 | 4 ms | 10 ms | 18 ms | ~420 req/s | Allowed | 429 Blocked |

---

## 2. Key Performance Insights

### 1. Asynchronous Queue Isolation
Enqueuing jobs into BullMQ takes < 2ms. The API returns HTTP 202 Accepted within ~6ms (p50), isolating external provider latency from the client HTTP request path.

### 2. Concurrency & Quota Safety
Atomic PostgreSQL increments (`quantity: { increment: 1 }`) ensure concurrency safety near quota boundaries without race conditions over-allocating notifications.

### 3. Idempotency Key Deduplication
Under 20 concurrent requests with the identical `Idempotency-Key`, only 1 logical notification is created and enqueued while 19 duplicate calls receive the cached initial response.
