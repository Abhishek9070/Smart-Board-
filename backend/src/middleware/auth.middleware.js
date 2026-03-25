import jwt from 'jsonwebtoken'
import User from '../models/User.model.js'

const protect = async (req, res, next) => {
  try {
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1]

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = await User.findById(decoded.id).select('-password')
    next()
  } catch (error) {
    return res.status(401).json({ message: 'Token invalid or expired' })
  }
}

export default protect
