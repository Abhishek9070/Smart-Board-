import 'dotenv/config'
import http from 'http'
import { Server } from 'socket.io'
import app from './app.js'
import connectDB from './config/db.js'

const PORT = process.env.PORT || 5000

connectDB()

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
})

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id)
  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id)
  })
})

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})