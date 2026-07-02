# CloudFarm AI Microservice

This microservice provides feed optimization and customer support assistance for the CloudFarm backend.

## Setup

1. Open a Python environment in `backend/ml-service`.
2. Install dependencies:
   ```bash
   python -m pip install -r requirements.txt
   ```

## Run

```bash
python app.py
```

The service listens on port `5001` by default.

## Endpoints

- `GET /health` - service health check
- `POST /predict/feed` - predict feed recommendation
- `POST /train/feed` - train the feed optimization model
- `POST /support/query` - ask support questions
- `POST /support/train` - train support FAQ entries
- `GET /support/faqs` - list support FAQs

## Example: Predict feed

Request body:
```json
{
  "animalType": "cattle",
  "ageMonths": 24,
  "weightKg": 450,
  "feedCategory": "standard",
  "pastureQuality": "good"
}
```

## Example: Support query

Request body:
```json
{
  "question": "How do I export data?"
}
```
