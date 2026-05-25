# Chat App

A real-time chat application built with React, Python (FastAPI), and Supabase.

## Tech Stack

| Layer    | Technology              |
|----------|-------------------------|
| Frontend | React + Vite            |
| Backend  | Python + FastAPI        |
| Database | Supabase (PostgreSQL)   |
| Realtime | WebSockets              |
| Deploy   | Coolify (Docker Compose)|

## Features

- Send and receive messages in real time
- Messages persist across page reloads
- Username stored in browser (no login required)
- Messages from others appear instantly without refreshing

## Project Structure

```
ChatAPP/
├── backend/
│   ├── main.py           # FastAPI app — REST API + WebSocket
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx       # Main chat UI
│   │   └── App.css
│   ├── nginx.conf        # Proxies /api and /ws to backend
│   └── Dockerfile
├── docker-compose.yml    # For Coolify deployment
└── supabase_schema.sql   # Run once in Supabase SQL editor
```

## Local Development

### 1. Supabase Setup (one time)

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase_schema.sql`
3. Go to **Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon / service_role key** (the `eyJ...` JWT) → `SUPABASE_KEY`

### 2. Backend

```bash
cd backend
```

Create a `.env` file:
```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=eyJ...
```

Install and run:
```bash
python3 -m pip install -r requirements.txt
python3 -m uvicorn main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

## Deployment on Coolify

1. Push this repo to GitHub
2. In Coolify, create a new service → **Docker Compose**
3. Point it to this repository
4. Add environment variables in Coolify:
   ```
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_KEY=eyJ...
   ```
5. Deploy — Coolify builds both services and exposes the frontend on port 80

## Environment Variables

| Variable       | Description                        |
|----------------|------------------------------------|
| `SUPABASE_URL` | Your Supabase project URL          |
| `SUPABASE_KEY` | Supabase anon or service role key  |
