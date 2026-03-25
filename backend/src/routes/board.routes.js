import express from 'express'
import { createBoard, getBoards, getBoard, updateBoard, deleteBoard, createShareLink } from '../controllers/board.controller.js'
import protect from '../middleware/auth.middleware.js'

const router = express.Router()

router.use(protect)

router.get('/', getBoards)
router.post('/', createBoard)
router.get('/:id', getBoard)
router.put('/:id', updateBoard)
router.post('/:id/share', createShareLink)
router.delete('/:id', deleteBoard)

export default router