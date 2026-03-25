import Board from '../models/Board.model.js'
import Page from '../models/Page.model.js'
import crypto from 'crypto'

export const createBoard = async (req, res) => {
  try {
    const board = await Board.create({
      title: req.body.title || 'Untitled Board',
      owner: req.user._id
    })

    await Page.create({
      board: board._id,
      pageNumber: 1,
      canvasData: '',
      background: '#ffffff'
    })

    res.status(201).json(board)
  } catch (error) {
    console.error('Create board error:', error)
    res.status(500).json({ message: error.message })
  }
}

export const getBoards = async (req, res) => {
  try {
    const boards = await Board.find({ owner: req.user._id }).sort({ updatedAt: -1 })
    res.json(boards)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const getBoard = async (req, res) => {
  try {
    const board = await Board.findOne({
      _id: req.params.id,
      owner: req.user._id
    })
    if (!board) return res.status(404).json({ message: 'Board not found' })
    res.json(board)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const updateBoard = async (req, res) => {
  try {
    const nextTitle = (req.body.title || '').trim()
    if (!nextTitle) {
      return res.status(400).json({ message: 'Board title is required' })
    }

    const board = await Board.findOneAndUpdate(
      {
        _id: req.params.id,
        owner: req.user._id
      },
      {
        title: nextTitle,
        updatedAt: new Date()
      },
      { new: true }
    )

    if (!board) return res.status(404).json({ message: 'Board not found' })
    res.json(board)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const deleteBoard = async (req, res) => {
  try {
    await Board.findByIdAndDelete(req.params.id)
    await Page.deleteMany({ board: req.params.id })
    res.json({ message: 'Board deleted' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const createShareLink = async (req, res) => {
  try {
    const board = await Board.findOne({
      _id: req.params.id,
      owner: req.user._id
    })

    if (!board) return res.status(404).json({ message: 'Board not found' })

    if (!board.shareToken) {
      board.shareToken = crypto.randomBytes(16).toString('hex')
    }
    board.isShared = true
    await board.save()

    res.json({ shareToken: board.shareToken })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export const getSharedBoard = async (req, res) => {
  try {
    const board = await Board.findOne({
      shareToken: req.params.token,
      isShared: true,
    }).select('_id title updatedAt')

    if (!board) return res.status(404).json({ message: 'Shared board not found' })

    const pages = await Page.find({ board: board._id }).sort({ pageNumber: 1 })
    res.json({ board, pages })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}