const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
]

function parseOrigins(rawValue) {
  if (!rawValue) return []
  return rawValue
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

const envOrigins = [
  ...parseOrigins(process.env.CLIENT_URL),
  ...parseOrigins(process.env.CLIENT_URLS),
]

export const allowedOrigins = [...new Set([...envOrigins, ...DEFAULT_ALLOWED_ORIGINS])]

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