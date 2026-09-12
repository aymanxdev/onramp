# What Onramp collects

Aggregate daily counters only. No accounts, no cookies, no IP storage, no user text, no third-party analytics scripts.

| Counter | Keyed by | Never stored |
|---|---|---|
| route_generated | surface, mode (type-it or guide-me), outcome (clear, question, fallback) | the text typed, the answers, IP, user agent |
| prompt_copied | use-case id | who copied it |
| radar_story_opened | feature id | seen state (device only) |
| score_completed | score bucket of 10 | individual answers |
| wrong_route_clicked | use-case id | anything automatic; the GitHub issue holds what the person writes |
| found_helpful | use-case id | who tapped it |
| llm_calls, llm_fallbacks, llm_schema_failures, llm_latency_bucket | day | inputs, outputs |
| abuse_honeypot | day | anything about the request |

Abuse controls keep a per-day counter against a salted hash of the IP that expires within 24 hours. The salt rotates daily and is never stored with the counter.

Running totals per counter are kept without expiry, alongside the daily ones above.

Counters are rolled up nightly into `public/data/stats.json` and shown publicly on the How it works page.

Changes to this file require an OpenSpec change approved by the owner and an update to the privacy page in the same PR.
