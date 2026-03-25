import mongoose from 'mongoose'

const pageSchema = new mongoose.Schema({
  board: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    required: true
  },
  pageNumber: {
    type: Number,
    required: true
  },
  canvasData: {
    type: String,
    default: ''
  },
  background: {
    type: String,
    default: '#ffffff'
  }
}, { timestamps: true })

export default mongoose.model('Page', pageSchema)