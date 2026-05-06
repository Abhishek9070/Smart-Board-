const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:4173',
  'http://localhost:4174',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:4173',
  'http://127.0.0.1:4174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'https://smart-board-mishra.vercel.app'
]

function normalizeOrigin(origin) {
  return origin.trim().replace(/\/$/, '')
}

function parseOrigins(rawValue) {
  if (!rawValue) return []
  return rawValue
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean)
}

const envOrigins = [
  ...parseOrigins(process.env.CLIENT_URL),
  ...parseOrigins(process.env.CLIENT_URLS),
  ...parseOrigins(process.env.FRONTEND_URL),
  ...parseOrigins(process.env.FRONTEND_URLS),
]

const vercelOrigin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, '')}` : null

export const frontendUrl = normalizeOrigin(
  envOrigins[0] ||
  process.env.CLIENT_URL ||
  process.env.FRONTEND_URL ||
  vercelOrigin ||
  'http://localhost:5173'
)

export const allowedOrigins = [...new Set([
  ...envOrigins,
  ...DEFAULT_ALLOWED_ORIGINS,
  ...(vercelOrigin ? [vercelOrigin] : []),
])]

function isAllowedOrigin(origin) {
  if (!origin) return true
  return allowedOrigins.includes(origin)
}

export const expressCorsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true)
      return
    }

    callback(new Error(`CORS blocked for origin: ${origin}`))
  },
  credentials: true,
}

export const socketCorsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'POST'],
  credentials: true,
}