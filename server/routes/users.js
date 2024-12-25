import express from 'express'
import { auth } from '../middleware/auth.js'
import { User } from '../models/User.js'

const router = express.Router()

// Get user profile
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password')
    res.json(user)
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

// Update user preferences
router.put('/preferences', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    user.preferences = { ...user.preferences, ...req.body }
    await user.save()
    res.json(user.preferences)
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
