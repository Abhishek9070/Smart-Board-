import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore.js'
import { logoutUser } from '../services/authService.js'
import { getBoards, createBoard, updateBoardTitle, deleteBoard } from '../services/boardService.js'
import toast, { Toaster } from 'react-hot-toast'

export default function Dashboard() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [boards, setBoards] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [editingBoardId, setEditingBoardId] = useState('')
  const [draftTitle, setDraftTitle] = useState('')

  useEffect(() => {
    fetchBoards()
  }, [])

  const fetchBoards = async () => {
    try {
      setLoading(true)
      const data = await getBoards()
      setBoards(data)
    } catch (error) {
      toast.error('Failed to load boards')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBoard = async () => {
    try {
      setCreating(true)
      const board = await createBoard('Untitled Board')
      navigate(`/board/${board._id}`)
    } catch (error) {
      toast.error('Failed to create board')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteBoard = async (e, id) => {
    e.stopPropagation()
    if (!window.confirm('Delete this board?')) return
    try {
      await deleteBoard(id)
      setBoards(boards.filter(b => b._id !== id))
      toast.success('Board deleted!')
    } catch (error) {
      toast.error('Failed to delete board')
    }
  }

  const startRenameBoard = (e, board) => {
    e.stopPropagation()
    setEditingBoardId(board._id)
    setDraftTitle(board.title)
  }

  const cancelRenameBoard = (e) => {
    e?.stopPropagation()
    setEditingBoardId('')
    setDraftTitle('')
  }

  const submitRenameBoard = async (e, boardId) => {
    e.stopPropagation()
    const nextTitle = draftTitle.trim()
    if (!nextTitle) {
      toast.error('Board name cannot be empty')
      return
    }

    try {
      const updated = await updateBoardTitle(boardId, nextTitle)
      setBoards((prev) => prev.map((board) => (
        board._id === boardId ? { ...board, title: updated.title, updatedAt: updated.updatedAt } : board
      )))
      cancelRenameBoard()
      toast.success('Board renamed')
    } catch (error) {
      toast.error('Failed to rename board')
    }
  }

  const handleLogout = async () => {
    await logoutUser()
    logout()
    navigate('/login')
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster />

      {/* Navbar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-blue-600">SmartBoard</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-600 text-sm">Hey, {user?.name}!</span>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">My Boards</h2>
          <button
            onClick={handleCreateBoard}
            disabled={creating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50"
          >
            {creating ? 'Creating...' : '+ New Board'}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">

            {/* New Board Card */}
            <button
              onClick={handleCreateBoard}
              disabled={creating}
              className="h-48 rounded-2xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-blue-500 group"
            >
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-300 group-hover:border-blue-400 flex items-center justify-center text-2xl transition">
                +
              </div>
              <span className="text-sm font-medium">New Board</span>
            </button>

            {/* Existing Boards */}
            {boards.map(board => (
              <div
                key={board._id}
                onClick={() => navigate(`/board/${board._id}`)}
                className="h-48 rounded-2xl bg-white border border-gray-200 hover:shadow-md transition cursor-pointer flex flex-col overflow-hidden group relative"
              >
                {/* Board preview area */}
                <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#93c5fd" strokeWidth="1" className="w-12 h-12">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                  </svg>
                </div>

                {/* Board info */}
                <div className="p-3 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    {editingBoardId === board._id ? (
                      <input
                        value={draftTitle}
                        onChange={(e) => setDraftTitle(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') submitRenameBoard(e, board._id)
                          if (e.key === 'Escape') cancelRenameBoard(e)
                        }}
                        autoFocus
                        className="text-sm font-semibold text-gray-800 border border-blue-300 rounded px-1.5 py-0.5 w-36"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-gray-800 truncate">{board.title}</p>
                    )}
                    <p className="text-xs text-gray-400">{formatDate(board.updatedAt)}</p>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    {editingBoardId === board._id ? (
                      <>
                        <button
                          onClick={(e) => submitRenameBoard(e, board._id)}
                          className="w-7 h-7 rounded-lg hover:bg-green-50 text-green-500 flex items-center justify-center"
                          title="Save name"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                            <path d="m5 13 4 4L19 7"/>
                          </svg>
                        </button>
                        <button
                          onClick={cancelRenameBoard}
                          className="w-7 h-7 rounded-lg hover:bg-gray-100 text-gray-500 flex items-center justify-center"
                          title="Cancel"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                            <path d="m18 6-12 12"/>
                            <path d="m6 6 12 12"/>
                          </svg>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={(e) => startRenameBoard(e, board)}
                          className="w-7 h-7 rounded-lg hover:bg-blue-50 text-blue-500 flex items-center justify-center"
                          title="Rename board"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                          </svg>
                        </button>

                        <button
                          onClick={(e) => handleDeleteBoard(e, board._id)}
                          className="w-7 h-7 rounded-lg hover:bg-red-50 text-red-400 flex items-center justify-center"
                          title="Delete board"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                            <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && boards.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg mb-2">No boards yet!</p>
            <p className="text-sm">Click "New Board" to get started</p>
          </div>
        )}
      </main>
    </div>
  )
}