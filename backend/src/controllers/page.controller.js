import Page from '../models/Page.model.js'
import Board from '../models/Board.model.js'

export const getPages = async (req, res) => {
  try {
    const pages = await Page.find({ board: req.params.boardId }).sort({ pageNumber: 1 })
    res.json(pages)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const savePage = async (req, res) => {
  try {
    const { canvasData, background } = req.body
    const serializedCanvasData =
      typeof canvasData === 'string' ? canvasData : JSON.stringify(canvasData || {})

    const page = await Page.findOneAndUpdate(
      { board: req.params.boardId, pageNumber: req.params.pageNumber },
      { canvasData: serializedCanvasData, background },
      { new: true, upsert: true }
    )

    await Board.findByIdAndUpdate(req.params.boardId, { updatedAt: new Date() })

    res.json(page)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const addPage = async (req, res) => {
  try {
    const pages = await Page.find({ board: req.params.boardId })
    const newPageNumber = pages.length + 1

    const page = await Page.create({
      board: req.params.boardId,
      pageNumber: newPageNumber,
      canvasData: '',
      background: '#ffffff'
    })

    res.status(201).json(page)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const deletePage = async (req, res) => {
  try {
    await Page.findOneAndDelete({
      board: req.params.boardId,
      pageNumber: req.params.pageNumber
    })
    res.json({ message: 'Page deleted' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}