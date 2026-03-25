import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as fabric from 'fabric'
import { getSharedBoard } from '../../services/boardService.js'

export default function SharedBoardPage() {
  const navigate = useNavigate()
  const { token } = useParams()
  const canvasRef = useRef(null)
  const fabricRef = useRef(null)

  const [title, setTitle] = useState('Shared Board')
  const [pages, setPages] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [isNightMode, setIsNightMode] = useState(() => {
    try {
      return localStorage.getItem('smartboard-night-mode') === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('smartboard-night-mode', isNightMode ? '1' : '0')
    } catch {
      // Ignore storage errors in restricted environments.
    }
  }, [isNightMode])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const data = await getSharedBoard(token)
        setTitle(data?.board?.title || 'Shared Board')
        const nextPages = [...(data?.pages || [])].sort((a, b) => a.pageNumber - b.pageNumber)
        setPages(nextPages)
        setCurrentPage(nextPages[0]?.pageNumber || 1)
      } catch (error) {
        console.error('Failed to load shared board:', error)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [token])

  useEffect(() => {
    if (!canvasRef.current || fabricRef.current) return

    const host = canvasRef.current.parentElement
    const boardCanvas = new fabric.StaticCanvas(canvasRef.current, {
      width: host?.offsetWidth || window.innerWidth,
      height: host?.offsetHeight || window.innerHeight - 110,
      backgroundColor: '#ffffff',
    })

    fabricRef.current = boardCanvas

    const resize = () => {
      const hostEl = canvasRef.current?.parentElement
      if (!hostEl || !fabricRef.current) return
      fabricRef.current.setDimensions({ width: hostEl.offsetWidth, height: hostEl.offsetHeight })
      fabricRef.current.requestRenderAll()
    }

    window.addEventListener('resize', resize)
    const observer = new ResizeObserver(resize)
    if (host) observer.observe(host)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', resize)
      boardCanvas.dispose()
      fabricRef.current = null
    }
  }, [])

  useEffect(() => {
    const boardCanvas = fabricRef.current
    if (!boardCanvas) return

    const page = pages.find((item) => item.pageNumber === currentPage)
    if (!page?.canvasData) {
      boardCanvas.clear()
      applySharedBackground(boardCanvas, page?.background)
      boardCanvas.requestRenderAll()
      return
    }

    const loadPage = async () => {
      try {
        const parsed = typeof page.canvasData === 'string' ? JSON.parse(page.canvasData) : page.canvasData
        await boardCanvas.loadFromJSON(parsed)
        const hostEl = canvasRef.current?.parentElement
        if (hostEl) {
          boardCanvas.setDimensions({ width: hostEl.offsetWidth, height: hostEl.offsetHeight })
          boardCanvas.calcOffset()
        }
        applySharedBackground(boardCanvas, page?.background)
        boardCanvas.requestRenderAll()
      } catch (error) {
        console.error('Failed to render shared page:', error)
      }
    }

    loadPage()
  }, [currentPage, pages])

  return (
    <div className={`h-screen w-screen flex flex-col overflow-hidden ${isNightMode ? 'bg-slate-900' : 'bg-gray-100'}`}>
      <header className={`h-14 shrink-0 px-4 md:px-6 flex items-center justify-between border-b ${isNightMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-gray-200'}`}>
        <div>
          <h1 className="text-base font-bold text-blue-600">Shared Board</h1>
          <p className={`text-xs ${isNightMode ? 'text-slate-400' : 'text-gray-500'}`}>{title}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsNightMode((prev) => !prev)}
            className={`w-9 h-9 rounded-lg border transition flex items-center justify-center ${isNightMode ? 'border-slate-700 bg-slate-900 text-yellow-300 hover:bg-slate-800' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
            title={isNightMode ? 'Switch to day mode' : 'Switch to night mode'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>
            </svg>
          </button>
          <button
            onClick={() => navigate('/login')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${isNightMode ? 'text-slate-200 bg-slate-800 hover:bg-slate-700' : 'text-gray-700 bg-gray-100 hover:bg-gray-200'}`}
          >
            Open SmartBoard
          </button>
        </div>
      </header>

      <div className={`h-11 shrink-0 px-4 md:px-6 flex items-center gap-2 overflow-x-auto border-b ${isNightMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-gray-200'}`}>
        {pages.map((page) => (
          <button
            key={page._id || page.pageNumber}
            onClick={() => setCurrentPage(page.pageNumber)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition shrink-0
              ${currentPage === page.pageNumber ? 'bg-blue-100 border-blue-300 text-blue-700' : isNightMode ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            Page {page.pageNumber}
          </button>
        ))}
      </div>

      <div className="relative flex-1 p-2 md:p-4">
        <div className={`relative h-full w-full max-w-[1680px] mx-auto rounded-2xl border shadow-sm overflow-hidden ${isNightMode ? 'bg-slate-950 border-slate-700' : 'bg-white border-gray-200'}`} data-canvas-host>
          {loading && (
            <div className={`absolute inset-0 z-10 flex items-center justify-center text-sm ${isNightMode ? 'bg-slate-950/90 text-slate-400' : 'bg-white/90 text-gray-500'}`}>
              Loading shared board...
            </div>
          )}
          <canvas ref={canvasRef} className="block" />
        </div>
      </div>
    </div>
  )
}

function applySharedBackground(canvas, rawBackground) {
  const parsed = parseSharedBackground(rawBackground)
  if (parsed.pattern === 'none') {
    canvas.backgroundColor = parsed.color
    canvas.requestRenderAll()
    return
  }

  const source = createSharedPatternSource(parsed.pattern, parsed.color)
  if (!source) {
    canvas.backgroundColor = parsed.color
    canvas.requestRenderAll()
    return
  }

  canvas.backgroundColor = new fabric.Pattern({
    source,
    repeat: 'repeat',
  })
  canvas.requestRenderAll()
}

function parseSharedBackground(raw) {
  if (!raw) return { color: '#ffffff', pattern: 'none' }
  if (typeof raw === 'string' && raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw)
      return { color: parsed.color || '#ffffff', pattern: parsed.pattern || 'none' }
    } catch {
      return { color: '#ffffff', pattern: 'none' }
    }
  }
  return { color: raw, pattern: 'none' }
}

function createSharedPatternSource(pattern, baseColor) {
  const tile = document.createElement('canvas')
  const ctx = tile.getContext('2d')
  if (!ctx) return null

  const ink = 'rgba(17,24,39,0.35)'
  const strongInk = 'rgba(17,24,39,0.5)'

  const setTile = (w, h) => {
    tile.width = w
    tile.height = h
    ctx.fillStyle = baseColor
    ctx.fillRect(0, 0, w, h)
  }

  switch (pattern) {
    case 'dot': {
      setTile(14, 14)
      ctx.fillStyle = ink
      ctx.beginPath()
      ctx.arc(2, 2, 1.1, 0, Math.PI * 2)
      ctx.fill()
      return tile
    }
    case 'square': {
      setTile(24, 24)
      ctx.strokeStyle = ink
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(24, 0)
      ctx.moveTo(0, 0)
      ctx.lineTo(0, 24)
      ctx.stroke()
      return tile
    }
    case 'graph': {
      setTile(40, 40)
      ctx.strokeStyle = ink
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(40, 0)
      ctx.moveTo(0, 0)
      ctx.lineTo(0, 40)
      ctx.stroke()

      ctx.strokeStyle = strongInk
      ctx.lineWidth = 1.6
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(200, 0)
      ctx.moveTo(0, 0)
      ctx.lineTo(0, 200)
      ctx.stroke()
      return tile
    }
    case 'hybrid': {
      setTile(24, 24)
      ctx.strokeStyle = ink
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(24, 0)
      ctx.moveTo(0, 0)
      ctx.lineTo(0, 24)
      ctx.stroke()

      ctx.fillStyle = 'rgba(17,24,39,0.25)'
      ctx.beginPath()
      ctx.arc(2, 2, 1, 0, Math.PI * 2)
      ctx.fill()
      return tile
    }
    case 'diamond': {
      setTile(18, 18)
      ctx.strokeStyle = ink
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(18, 18)
      ctx.moveTo(18, 0)
      ctx.lineTo(0, 18)
      ctx.stroke()
      return tile
    }
    case 'triangle': {
      setTile(20, 18)
      ctx.strokeStyle = ink
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, 18)
      ctx.lineTo(10, 0)
      ctx.lineTo(20, 18)
      ctx.stroke()
      return tile
    }
    case 'wide-rule': {
      setTile(48, 24)
      ctx.strokeStyle = strongInk
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(48, 0)
      ctx.stroke()
      return tile
    }
    case 'narrow-rule': {
      setTile(48, 12)
      ctx.strokeStyle = ink
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(48, 0)
      ctx.stroke()
      return tile
    }
    default:
      return null
  }
}
