import express from 'express'
import { getSharedBoard } from '../controllers/board.controller.js'

const router = express.Router()

router.get('/:token', getSharedBoard)

export default router
