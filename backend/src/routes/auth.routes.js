import express from 'express'
import passport from 'passport'
import { register, login, logout, getMe } from '../controllers/auth.controller.js'
import protect from '../middleware/auth.middleware.js'
import generateToken from '../utils/generateToken.js'

const router = express.Router()

router.post('/register', register)
router.post('/login', login)
router.post('/logout', logout)
router.get('/me', protect, getMe)

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }))

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL}/login` }),
  (req, res) => {
    const token = generateToken(req.user._id)
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000
    })
    res.redirect(`${process.env.CLIENT_URL}/google-callback?token=${token}`)
  }
)

export default router