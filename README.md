# Si Kaya / Dompet Harian

A modern offline-first Progressive Web App (PWA) for personal expense tracking.

**Dompet Harian** is a single-user expense tracker that works on both mobile and desktop browsers, allowing you to record expenses anytime, even without an internet connection. It stores expense data locally and provides a backend sync API for saving, retrieving, and clearing expense records.

## Features

- Offline-first PWA experience
- Add, edit, and delete daily expenses
- Track expenses by:
  - Date
  - Amount
  - Category
  - Note
- Automatic category suggestions from note keywords
- Monthly reports with:
  - Total spending
  - Transaction count
  - Category breakdown
  - Daily spending trends
  - Monthly transaction list
- Export monthly data to CSV
- Service worker caching for offline usage
- Backend API for syncing and managing expense data
- Mobile-friendly, standalone app installation via PWA manifest

## Tech Stack

### Frontend
- HTML
- CSS
- JavaScript
- Service Worker
- Web App Manifest

### Backend
- Python
- Flask
- Flask-CORS
- SQLite

## Project Structure

```text
si-kaya/
├── backend/
│   ├── app.py
│   ├── database.db
│   └── requirements.txt
└── frontend/
    ├── index.html
    ├── manifest.json
    ├── service-worker.js
    ├── css/
    └── js/
```

## How It Works

The app is designed as an offline-first personal expense tracker:

1. Users enter expense data in the frontend.
2. Data is stored locally for offline access.
3. When sync is triggered, expense records are sent to the backend API.
4. The backend stores and updates records in SQLite.
5. The app can continue to function even when the network is unavailable.

## Backend API

The backend is a Flask application that exposes the following routes:

### `GET /health`
Returns backend health information.

**Response example**
```json
{
  "status": "ok",
  "service": "dompet-harian-backend",
  "database": "database.db"
}
```

### `GET /expenses`
Returns all saved expenses ordered by newest date first.

**Response example**
```json
{
  "count": 2,
  "expenses": [
    {
      "id": "expense-1",
      "date": "2026-07-17",
      "category": "Makan",
      "amount": 25000,
      "note": "Nasi ayam",
      "created_at": "2026-07-17T10:00:00Z",
      "updated_at": "2026-07-17T10:00:00Z",
      "synced_at": "2026-07-17T10:01:00Z",
      "deleted": false
    }
  ]
}
```

### `GET /expenses/<expense_id>`
Returns a single expense by ID.

### `POST /sync`
Accepts a list of expenses and upserts them into SQLite.

**Request body**
```json
{
  "expenses": [
    {
      "id": "expense-1",
      "date": "2026-07-17",
      "category": "Makan",
      "amount": 25000,
      "note": "Nasi ayam",
      "created_at": "2026-07-17T10:00:00Z",
      "updated_at": "2026-07-17T10:00:00Z",
      "deleted": false
    }
  ]
}
```

**Response example**
```json
{
  "success": true,
  "synced_ids": ["expense-1"],
  "failed_items": []
}
```

### `DELETE /expenses`
Deletes all expense records from the database.

## Expense Data Model

Each expense record uses the following fields:

- `id` — unique expense identifier
- `date` — expense date
- `category` — expense category
- `amount` — positive numeric amount
- `note` — optional description
- `created_at` — record creation timestamp
- `updated_at` — last update timestamp
- `synced_at` — last sync timestamp
- `deleted` — soft delete flag

## Validation Rules

The backend validates expense payloads before syncing:

- `id`, `date`, `category`, `amount`, `created_at`, and `updated_at` are required
- `id`, `date`, and `category` cannot be empty
- `amount` must be greater than `0`

## PWA Features

The frontend includes:
- A web app manifest for installability
- A service worker for asset caching
- Offline support through cached frontend assets

## Getting Started

### Prerequisites
- Python 3.10+
- A modern browser
- Optional: a local static server for the frontend

### Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### Run the Backend

```bash
cd backend
python app.py
```

The backend will run on:

```text
http://0.0.0.0:5000
```

### Open the Frontend

Serve the `frontend/` directory using your preferred static file server, then open `index.html` in the browser.

Example using Python:

```bash
cd frontend
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Development Notes

- The backend uses SQLite via `backend/database.db`
- CORS is enabled for frontend-backend communication
- The service worker caches key frontend files for offline access
- The app is intended for a single-user personal finance workflow

## Offline Usage

When the app is installed or opened after the first visit:

- Core assets are cached by the service worker
- The app can still load offline
- Expense syncing resumes when connectivity is available

## Future Improvements

Possible enhancements:
- Better export and import tools
- Authentication for multi-user support
- More advanced analytics and charts
- PWA icon hosting improvements
- Server-side history filtering and pagination
- Cloud sync conflict resolution

## License

No license has been specified for this repository yet.
