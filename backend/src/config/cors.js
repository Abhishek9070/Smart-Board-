const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:4173",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:4173",
  "http://127.0.0.1:5173",
  "https://smart-board-mishra.vercel.app",
  "https://smart-board-mishra-git-main-abhishek9070s-projects.vercel.app"
];


function normalizeOrigin(origin) {
  return origin?.trim().replace(/\/$/, "");
}


function parseOrigins(value) {
  if (!value) return [];
  return value.split(",").map(normalizeOrigin).filter(Boolean);
}


const envOrigins = [
  ...parseOrigins(process.env.CLIENT_URL),
  ...parseOrigins(process.env.CLIENT_URLS),
  ...parseOrigins(process.env.FRONTEND_URL),
  ...parseOrigins(process.env.FRONTEND_URLS),
];

// Handle Vercel preview URL automatically
const vercelOrigin = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, "")}`
  : null;

export const allowedOrigins = [
  ...new Set([
    ...DEFAULT_ALLOWED_ORIGINS,
    ...envOrigins,
    ...(vercelOrigin ? [vercelOrigin] : []),
  ]),
];

export const corsOptions = {
  origin: function (origin, callback) {
    const normalized = normalizeOrigin(origin);

    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(normalized)) {
      return callback(null, true);
    }

    console.log("CORS Blocked:", origin);
    return callback(null, false); 
  },

  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
};