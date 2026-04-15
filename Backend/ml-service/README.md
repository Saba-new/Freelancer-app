# Project Intelligence ML Service

This service provides ML-backed risk intelligence for project timelines.

## Endpoints

- `GET /health` - service and model status
- `POST /train` - train model from MongoDB `projects` collection
- `POST /predict` - predict project intelligence

## Setup

1. Install Python dependencies:

   `pip install -r ml-service/requirements.txt`

2. Ensure backend `.env` has:

   - `MONGO_URI`
   - `ML_SERVICE_URL=http://127.0.0.1:8001`
   - `AUTO_TRAIN_ON_START=1`

3. Train once (optional if auto-train is enabled):

   `npm run ml:train`

4. Start the service:

   `npm run ml:service`

The Node backend intelligence route will use this service and fall back to heuristic scoring if unavailable.
