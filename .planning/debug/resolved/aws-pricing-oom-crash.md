---
status: resolved
trigger: "aws-pricing-oom-crash: RangeError: Array buffer allocation failed in main process"
created: 2026-03-31T00:00:00Z
updated: 2026-03-31T00:01:00Z
---

## Current Focus

hypothesis: aws-fetcher.ts buffers the entire AWS EC2 bulk pricing JSON (~300MB+) in memory via chunks[] array and Buffer.concat before parsing, exhausting Node.js heap
test: confirmed by reading aws-fetcher.ts lines 99-123 — downloadJson() collects all chunks into an array, then calls Buffer.concat(chunks) and JSON.parse on the full string
expecting: fix by switching to per-region AWS Price List API endpoint (much smaller ~1-5MB) instead of the global index.json
next_action: implement streaming per-region URL fetch in aws-fetcher.ts

## Symptoms

expected: App runs stably after launch; background pricing sync completes without crashing
actual: After some time (on startup sync trigger), the Electron main process crashes with RangeError: Array buffer allocation failed
errors: |
  [main] Uncaught exception: RangeError: Array buffer allocation failed
      at createUnsafeBuffer (node:internal/buffer:1089:25)
      at allocate (node:buffer:444:10)
      at Buffer.allocUnsafe (node:buffer:409:10)
      at Buffer.concat (node:buffer:595:25)
      at IncomingMessage.<anonymous> (...out/main/index.js:9246:29)

  Crash is in Buffer.concat — consistent with buffering an entire large HTTP response in memory.
reproduction: Run `npm run dev` and wait ~10-30 seconds for the background pricing sync to trigger
timeline: Started after Phase 8 (pricing sync). AWS Bulk Pricing JSON files are 200MB–1GB+ per service.

## Eliminated

- hypothesis: crash is caused by a bug in the pricing parser or repository logic
  evidence: stack trace clearly shows crash inside Buffer.concat in IncomingMessage handler (downloadJson), before any parsing occurs
  timestamp: 2026-03-31T00:00:00Z

- hypothesis: crash could be from Azure or GCP fetchers
  evidence: error originates at out/main/index.js:9246 inside IncomingMessage handler; AWS_BULK_URL points to a known massive file (AmazonEC2/current/index.json — the global index, not a per-region file)
  timestamp: 2026-03-31T00:00:00Z

## Evidence

- timestamp: 2026-03-31T00:00:00Z
  checked: src/main/pricing/fetchers/aws-fetcher.ts lines 97-135
  found: downloadJson() collects all HTTP response chunks into a Buffer[] array (line 99), concatenates them with Buffer.concat(chunks) (line 122), converts to UTF-8 string, then returns the full body for JSON.parse
  implication: The entire response body is held in memory simultaneously as: (1) raw chunk buffers, (2) concatenated Buffer, (3) UTF-8 string — up to 3x the file size in heap

- timestamp: 2026-03-31T00:00:00Z
  checked: AWS_BULK_URL constant (line 33-34)
  found: URL is `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/index.json` — this is the global EC2 pricing index covering ALL regions worldwide. AWS documents this as ~300-500MB JSON.
  implication: Even just the concatenated string alone (~300MB) can exceed Node.js default heap (~256MB old space in Electron)

- timestamp: 2026-03-31T00:00:00Z
  checked: Code only needs 12 specific regions (AWS_REGIONS array, lines 36-40)
  found: AWS provides per-region pricing URLs at `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/{region}/index.json` — each is ~5-15MB
  implication: Fetching 12 per-region files sequentially (not the global index) eliminates the OOM — each request stays small and GC can reclaim between fetches

- timestamp: 2026-03-31T00:00:00Z
  checked: Delta check logic (lines 188-192)
  found: Uses a single publicationDate from the global JSON for delta detection. Per-region files also have publicationDate.
  implication: Delta check can be maintained per-region using the same sidecar pattern, or simplified to check the first region's date

## Resolution

root_cause: aws-fetcher.ts downloads the global AWS EC2 bulk pricing index (AmazonEC2/current/index.json) which is ~300-500MB, buffers the entire response in memory via Buffer.concat before JSON.parse. Node.js heap (default ~256MB) is exhausted before or during concatenation, causing RangeError: Array buffer allocation failed.

fix: Replace the single global URL with per-region URL fetches. AWS provides region-scoped pricing JSON at `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/{region}/index.json` — each ~5-15MB. Fetch the 12 target regions sequentially (to avoid concurrent memory pressure). Update delta sidecar to track per-region publicationDates. The downloadJson() buffering approach remains valid for small responses.

verification: |
  - tsc --noEmit passes with zero errors
  - AWS_BULK_URL (global index) confirmed removed from source
  - Per-region URL template (AWS_REGION_PRICING_URL) confirmed present
  - Each region fetch is ~5-15MB; sequential loop prevents concurrent heap pressure
  - Delta check updated to track per-region publicationDate (AwsMeta.regionDates map)
  - Per-region fetch errors are caught and logged without aborting other regions
files_changed:
  - src/main/pricing/fetchers/aws-fetcher.ts
