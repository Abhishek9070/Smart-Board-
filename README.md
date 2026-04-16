# Class Flow

Class Flow is a full-stack whiteboard app for class notes and collaboration, with authentication, multi-page boards, autosave, share links, PDF export, image/PDF import, and day/night mode.

## Features

- Email/password and Google login
- Create, rename, and delete boards from dashboard
- Multi-page whiteboard with autosave
- Drawing tools: pencil, highlighter, eraser, shapes, select, hand-pan
- Per-page background patterns
- Read-only public share links
- Export board to PDF and canvas to PNG

## Tech Stack

- Frontend: React, Vite, Zustand, Fabric.js, Tailwind, Axios
- Backend: Node.js, Express, MongoDB, Mongoose, JWT, Passport Google OAuth

## Project Structure

```text
SmartBorad/
  backend/
    src/
  frontend/
    src/
    public/
```

## Environment Variables

Create these files:

- backend/.env
- frontend/.env

backend/.env

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/classflow
JWT_SECRET=replace_with_strong_secret

# CORS + OAuth redirect base
CLIENT_URL=http://localhost:5173
SERVER_URL=http://localhost:5000

# Optional Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

frontend/.env

```env
VITE_API_URL=http://localhost:5000/api
```

## Local Run

1. Install dependencies

```bash
npm -C backend install
npm -C frontend install
```

2. Start backend

```bash
npm -C backend run dev
```

3. Start frontend

```bash
npm -C frontend run dev
```

4. Open app

- Frontend: http://localhost:5173
- Backend health: http://localhost:5000/health

## How To Use

1. Register or login
2. Create a new board (default title: Class Flow)
3. Draw using toolbar tools
4. Add/switch pages from the page selector
5. Change page background from settings
6. Share board from settings using Share View Link
7. Open shared link in read-only mode
8. Export as PDF/PNG when needed

## Share Flow

- Owner generates share link from board settings
- Backend creates/reuses secure share token
- Public route serves read-only board by token
- Shared URL format: /shared/:token?page=pageNumber

## API Summary

Base URL: /api

- Health: GET /health
- Auth: /api/auth/*
- Boards: /api/boards/*
- Pages: /api/pages/*
- Public share: GET /api/share/:token

## Deploy Guide

Deploy backend first, then frontend.

### 1) Deploy Backend (Render/Railway/VM)

Set backend env vars in hosting platform:

- PORT
- MONGO_URI
- JWT_SECRET
- CLIENT_URL (your frontend production URL)
- SERVER_URL (your backend production URL)
- GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (if using Google login)

Backend start command:

```bash
npm start
```

### 2) Deploy Frontend (Vercel/Netlify)

Set frontend env var:

```env
VITE_API_URL=https://your-backend-domain/api
```

Build command:

```bash
npm run build
```

### 3) Final CORS Check

After frontend is live, set backend CLIENT_URL exactly to frontend domain and redeploy backend.

## Troubleshooting

- Blank shared page: ensure latest save is completed before sharing
- 401 issues: confirm JWT_SECRET and VITE_API_URL
- CORS errors: backend CLIENT_URL must match frontend domain exactly
- Google login issues: verify callback URL in Google console matches backend callback route

## Notes

- Browser tab branding uses frontend/public/logo.png and title Class Flow
- Do not commit real .env files

## License

ISC
