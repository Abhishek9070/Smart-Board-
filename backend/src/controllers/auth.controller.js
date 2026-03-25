import User from '../models/User.model.js'
import generateToken from '../utils/generateToken.js'

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body

    const userExists = await User.findOne({ email })
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' })
    }

    const user = await User.create({ name, email, password })

    const token = generateToken(user._id)

    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      token
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ message: error.message })
  }
}

export const login = async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email })
    if (!user || !await user.matchPassword(password)) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    const token = generateToken(user._id)

    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      token
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const logout = async (req, res) => {
  res.cookie('token', '', { maxAge: 0 })
  res.json({ message: 'Logged out successfully' })
}

export const getMe = async (req, res) => {
  res.json(req.user)
}