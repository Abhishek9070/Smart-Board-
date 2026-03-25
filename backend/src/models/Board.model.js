import mongoose from 'mongoose'

const boardSchema = new mongoose.Schema({
  title: {
    type: String,
    default: 'Untitled Board'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  thumbnail: {
    type: String,
    default: ''
  },
  isShared: {
    type: Boolean,
    default: false
  },
  shareToken: {
    type: String,
    unique: true,
    sparse: true,
    default: null
  }
}, { timestamps: true })

export default mongoose.model('Board', boardSchema)