import mongoose from 'mongoose'

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI)
    const boardsCollection = conn.connection.collection('boards')
    const indexes = await boardsCollection.indexes()
    const shareTokenIndex = indexes.find((idx) => idx.name === 'shareToken_1')

    const hasExpectedIndex =
      shareTokenIndex &&
      shareTokenIndex.unique === true &&
      shareTokenIndex.partialFilterExpression?.shareToken?.$type === 'string'

    if (!hasExpectedIndex) {
      if (shareTokenIndex) {
        await boardsCollection.dropIndex('shareToken_1')
      }

      await boardsCollection.createIndex(
        { shareToken: 1 },
        {
          name: 'shareToken_1',
          unique: true,
          partialFilterExpression: { shareToken: { $type: 'string' } }
        }
      )

      console.log('Repaired boards shareToken index to partial unique index')
    }

    console.log(`MongoDB connected: ${conn.connection.host}`)
  } catch (error) {
    console.error(`DB Error: ${error.message}`)
    process.exit(1)
  }
}

export default connectDB