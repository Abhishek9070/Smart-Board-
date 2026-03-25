import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import passport from './config/passport.js'
import authRoutes from './routes/auth.routes.js'
import boardRoutes from './routes/board.routes.js'
import pageRoutes from './routes/page.routes.js'
import shareRoutes from './routes/share.routes.js'

const app = express()


app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser())


app.use(passport.initialize())


app.use('/api/auth', authRoutes)


app.get('/health', (req, res) => {
  res.json({ message: 'Server is running' })
})
app.use('/api/boards', boardRoutes)
app.use('/api/pages', pageRoutes)
app.use('/api/share', shareRoutes)
export default app