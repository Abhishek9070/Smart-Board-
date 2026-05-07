// Allowed origins (keep it simple + explicit)
const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://smart-board-mishra.vercel.app",
  "https://smart-board-mishra-git-main-abhishek9070s-projects.vercel.app"
];

// Normalize origin (remove trailing slash)
function normalizeOrigin(origin) {
  return origin?.trim().replace(/\/$/, "");
}

// Parse env variables (optional, for scaling later)
function parseOrigins(value) {
  if (!value) return [];
  return value.split(",").map(normalizeOrigin).filter(Boolean);
}

// Env-based origins (optional)
const envOrigins = [
  ...parseOrigins(process.env.CLIENT_URL),
  ...parseOrigins(process.env.CLIENT_URLS),
  ...parseOrigins(process.env.FRONTEND_URL),
  ...parseOrigins(process.env.FRONTEND_URLS),
];

// Handle Vercel preview deployments automatically
const vercelOrigin = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, "")}`
  : null;

// Final allowed origins list
export const allowedOrigins = [
  ...new Set([
    ...DEFAULT_ALLOWED_ORIGINS,
    ...envOrigins,
    ...(vercelOrigin ? [vercelOrigin] : []),
  ]),
];

// ✅ MAIN CORS CONFIG (for Express)
export const corsOptions = {
  origin: function (origin, callback) {
    const normalized = normalizeOrigin(origin);

    // Allow requests without origin (Postman, mobile apps)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(normalized)) {
      return callback(null, true);
    }

    console.log("❌ CORS Blocked:", origin);
    return callback(null, false); // do NOT throw error
  },

  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
};

export const socketCorsOptions = {
  origin: allowedOrigins,
  methods: ["GET", "POST"],
  credentials: true,
};