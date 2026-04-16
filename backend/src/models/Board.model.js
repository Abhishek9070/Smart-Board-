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
    default: null
  }
}, { timestamps: true })

boardSchema.index(
  { shareToken: 1 },
  {
    name: 'shareToken_1',
    unique: true,
    partialFilterExpression: { shareToken: { $type: 'string' } }
  }
)

export default mongoose.model('Board', boardSchema)