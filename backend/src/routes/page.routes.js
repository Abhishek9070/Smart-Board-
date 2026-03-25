import express from 'express'
import { getPages, savePage, addPage, deletePage } from '../controllers/page.controller.js'
import protect from '../middleware/auth.middleware.js'

const router = express.Router()

router.use(protect)

router.get('/:boardId', getPages)
router.post('/:boardId', addPage)
router.put('/:boardId/:pageNumber', savePage)
router.delete('/:boardId/:pageNumber', deletePage)

export default router