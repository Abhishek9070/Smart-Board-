# SmartBoard

SmartBoard is a full-stack collaborative whiteboard-style application with authentication, multi-page boards, autosave, sharing, PDF export/import, image import, shape tools, pan/zoom, and day/night viewing modes.

## Highlights

- Secure authentication with email/password and Google OAuth.
- Dashboard to create, rename, open, and delete boards.
- Multi-page whiteboards with autosave and persistence.
- Drawing tools: pencil, highlighter, eraser, graphics/shapes, selection.
- Canvas interactions: zoom in board area, hand-pan, copy/paste, undo/redo.
- Background styles per page: plain, dot, square, graph, and ruled patterns.
- Share link support for read-only public board view.
- Export full board to PDF, export canvas to PNG.
- Import photos and PDF page snapshots directly into board.

---

## Tech Stack

### Frontend

- React 19 + Vite
- Zustand (state persistence for auth/tool state)
- Fabric.js (canvas engine)
- Tailwind CSS
- Axios
- jsPDF + pdfjs-dist

### Backend

- Node.js + Express
- MongoDB + Mongoose
- JWT auth + cookie support
- Passport Google OAuth 2.0
- Socket.io bootstrap (connection/disconnection hooks)

---

## Project Structure

```
SmartBorad/
	backend/
		src/
			app.js
			index.js
			config/
			controllers/
			middleware/
			models/
			routes/
			utils/
		uploads/
	frontend/
		src/
			components/
			services/
			store/
```

---

## Environment Variables

Create files as follows:

- backend/.env
- frontend/.env

### backend/.env

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/smartboard
JWT_SECRET=replace_with_a_strong_secret

# Used by CORS + Google callback redirect
CLIENT_URL=http://localhost:5173
SERVER_URL=http://localhost:5000

# Optional: Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### frontend/.env

```env
VITE_API_URL=http://localhost:5000/api
```

---

## Local Setup

## 1) Install dependencies

From project root, run:

```bash
npm -C backend install
npm -C frontend install
```

## 2) Run backend

```bash
npm -C backend run dev
```

Backend runs on http://localhost:5000 by default.

## 3) Run frontend

```bash
npm -C frontend run dev
```

Frontend runs on http://localhost:5173 by default.

---

## Available Scripts

### Backend

- npm run dev -> starts server with nodemon
- npm run start -> starts server with node

### Frontend

- npm run dev -> starts Vite dev server
- npm run build -> production build
- npm run preview -> preview production build
- npm run lint -> run ESLint

---

## Core User Flow

1. Register or login.
2. Open dashboard and create a new board.
3. Draw/add content on page 1.
4. Use page menu to add/switch/delete pages.
5. Format background and use board settings.
6. Export full board as PDF or canvas as PNG.
7. Create share link for read-only public access.

---

## API Overview

Base URL: /api

### Health

- GET /health

### Auth

- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me
- GET /api/auth/google
- GET /api/auth/google/callback

### Boards (protected)

- GET /api/boards
- POST /api/boards
- GET /api/boards/:id
- PUT /api/boards/:id
- DELETE /api/boards/:id
- POST /api/boards/:id/share

### Pages (protected)

- GET /api/pages/:boardId
- POST /api/pages/:boardId
- PUT /api/pages/:boardId/:pageNumber
- DELETE /api/pages/:boardId/:pageNumber

### Shared View (public)

- GET /api/share/:token

---

## Data Models

### User

- name
- email
- password (hashed if present)
- googleId (optional)
- avatar

### Board

- title
- owner
- thumbnail
- isShared
- shareToken

### Page

- board
- pageNumber
- canvasData (serialized Fabric JSON)
- background (color/pattern payload)

---

## Whiteboard Feature Notes

- Autosave is debounced and flushes on key transitions.
- Background settings are persisted per page.
- Zoom is canvas-only to keep header/footer fixed.
- Hand tool allows drag-to-pan viewport.
- Shared board route renders page backgrounds and canvas in read-only mode.

---

## Security Notes

- Never commit real .env files.
- JWT secret should be long and random.
- Restrict CLIENT_URL and CORS in production.
- Use HTTPS in production for secure cookies/tokens.

---

## Git Ignore

This repository includes a root .gitignore that already ignores:

- .env files
- node_modules
- build artifacts
- logs
- runtime uploads (keeps uploads/.gitkeep)

---

## Troubleshooting

### Mongo connection fails

- Verify MONGO_URI and local MongoDB service.

### 401 unauthorized from frontend

- Ensure JWT_SECRET is set.
- Ensure VITE_API_URL points to backend /api.
- Re-login to refresh stored token.

### Google login does not redirect properly

- Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.
- Verify callback URL matches:
	http://localhost:5000/api/auth/google/callback

### CORS issues

- Ensure backend CLIENT_URL equals frontend URL.

---

## Roadmap Ideas

- Real-time multi-user collaboration via Socket.io rooms.
- Board-level access control (viewer/editor roles).
- Version history snapshots.
- Mobile gesture enhancements.
- Optional dark canvas presets for night mode.

---

## License

ISC (as defined in package configuration).
