# n8n Payload Contracts

## `POST /api/ingest/reddit-complaints`
Headers:
- `x-offertehulp-secret: <N8N_HEADER_SECRET or sha256 signature>`

Body:
```json
{
  "source": "n8n_reddit",
  "runId": "run_2026_02_21_01",
  "post": {
    "id": "t3_abc123",
    "subreddit": "carpentry",
    "title": "Frustratie over offerteproces",
    "url": "https://reddit.com/..."
  },
  "comment": {
    "id": "t1_def456",
    "body": "Carpenters keep losing jobs due to slow quoting...",
    "author": "reddit_user",
    "score": 21,
    "permalink": "https://reddit.com/..."
  },
  "enrichment": {
    "pain_topic": "planning",
    "sentiment": "negatief",
    "urgency_score": 8.6,
    "customer_stage": "non_customer"
  }
}
```

## `POST /api/ingest/n8n-incident`
Headers:
- `x-offertehulp-secret: <N8N_HEADER_SECRET or sha256 signature>`

Body:
```json
{
  "workflowId": "error_calvora",
  "executionId": "32841",
  "status": "failed",
  "error": "Authorization data is wrong",
  "payloadPreview": {
    "route": "support_feedback"
  },
  "sourceSystem": "n8n"
}
```

## `POST /api/ingest/website-demo-request`
Headers:
- `x-offertehulp-secret: <N8N_HEADER_SECRET or sha256 signature>`

Body:
```json
{
  "naam": "Dylan",
  "bedrijfsnaam": "Voorbeeld Bouw",
  "email": "info@voorbeeld.nl",
  "telefoonnummer": "06-12345678",
  "bericht": "Ik wil een demo",
  "source": "website_contact",
  "submittedAt": "2026-02-21T14:00:00.000Z"
}
```

## `POST /api/ingest/app-error`
Headers:
- `x-offertehulp-secret: <N8N_HEADER_SECRET or sha256 signature>`

Body:
```json
{
  "source": "studio:materials",
  "title": "Webhook timeout",
  "message": "Material upsert webhook timed out",
  "severity": "error",
  "route": "/materialen",
  "url": "https://studio.../materialen",
  "userId": "uid123",
  "context": {
    "status": 504
  },
  "createdAt": "2026-02-21T14:00:00.000Z"
}
```
