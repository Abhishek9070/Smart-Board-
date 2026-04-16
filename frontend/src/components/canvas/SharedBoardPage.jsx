import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import * as fabric from 'fabric'
import { getSharedBoard } from '../../services/boardService.js'

export default function SharedBoardPage() {
  const navigate = useNavigate()
  const { token } = useParams()
  const [searchParams] = useSearchParams()
  const canvasRef = useRef(null)
  const fabricRef = useRef(null)

  const [title, setTitle] = useState('Shared Board')
  const [pages, setPages] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [canvasReady, setCanvasReady] = useState(false)
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
        setLoadError('')
        const data = await getSharedBoard(token)
        setTitle(data?.board?.title || 'Shared Board')
        const nextPages = [...(data?.pages || [])].sort((a, b) => a.pageNumber - b.pageNumber)
        const requestedPage = Number(searchParams.get('page'))
        const hasRequestedPage = Number.isInteger(requestedPage)
          && requestedPage > 0
          && nextPages.some((page) => page.pageNumber === requestedPage)

        setPages(nextPages)
        setCurrentPage(hasRequestedPage ? requestedPage : (nextPages[0]?.pageNumber || 1))
      } catch (error) {
        console.error('Failed to load shared board:', error)
        setLoadError('Could not load shared board. The link may be invalid or expired.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [token, searchParams])

  useEffect(() => {
    if (!canvasRef.current || fabricRef.current) return

    const host = canvasRef.current.parentElement
    const boardCanvas = new fabric.Canvas(canvasRef.current, {
      width: host?.offsetWidth || window.innerWidth,
      height: host?.offsetHeight || window.innerHeight - 110,
      backgroundColor: '#ffffff',
      selection: false,
      skipTargetFind: true,
      isDrawingMode: false,
    })

    fabricRef.current = boardCanvas
    setCanvasReady(true)

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
      setCanvasReady(false)
    }
  }, [])

  useEffect(() => {
    const boardCanvas = fabricRef.current
    if (!boardCanvas || !canvasReady) return
    setLoadError('')

    const page = pages.find((item) => item.pageNumber === currentPage)
    if (!page?.canvasData) {
      boardCanvas.clear()
      applySharedBackground(boardCanvas, page?.background)
      boardCanvas.requestRenderAll()
      return
    }

    const loadPage = async () => {
      try {
        const rawParsed = typeof page.canvasData === 'string' ? JSON.parse(page.canvasData) : page.canvasData
        const parsed = normalizeSharedCanvasJson(rawParsed)
        const serializedObjectCount = Array.isArray(parsed?.objects) ? parsed.objects.length : 0
        await boardCanvas.loadFromJSON(parsed)

        boardCanvas.selection = false
        boardCanvas.skipTargetFind = true
        boardCanvas.getObjects().forEach((obj) => {
          obj.selectable = false
          obj.evented = false
        })

        if (boardCanvas.getObjects().length === 0 && Array.isArray(parsed?.objects) && parsed.objects.length > 0) {
          boardCanvas.clear()
          const revivedObjects = await enlivenSharedObjects(parsed.objects)
          revivedObjects.forEach((obj) => {
            obj.selectable = false
            obj.evented = false
            boardCanvas.add(obj)
          })
        }

        if (serializedObjectCount > 0 && boardCanvas.getObjects().length === 0) {
          setLoadError('Shared content exists but could not be rendered on this page.')
        }

        const hostEl = canvasRef.current?.parentElement
        if (hostEl) {
          boardCanvas.setDimensions({ width: hostEl.offsetWidth, height: hostEl.offsetHeight })
          boardCanvas.calcOffset()
        }
        resetSharedViewport(boardCanvas)
        fitSharedObjectsInView(boardCanvas)
        applySharedBackground(boardCanvas, page?.background)
        boardCanvas.requestRenderAll()
      } catch (error) {
        console.error('Failed to render shared page:', error)
        setLoadError('Could not render this shared page.')
      }
    }

    loadPage()
  }, [canvasReady, currentPage, pages])

  return (
    <div className={`relative h-screen w-screen overflow-hidden ${isNightMode ? 'bg-slate-950 text-slate-100' : 'bg-[#f6f4eb] text-slate-900'}`}>
      <div className="pointer-events-none absolute inset-0">
        <div className={`absolute -top-24 -left-20 h-72 w-72 rounded-full blur-3xl ${isNightMode ? 'bg-blue-500/10' : 'bg-amber-200/50'}`} />
        <div className={`absolute -bottom-28 -right-24 h-80 w-80 rounded-full blur-3xl ${isNightMode ? 'bg-cyan-500/10' : 'bg-sky-200/50'}`} />
      </div>

      <div className="relative h-full flex flex-col">
        <header className={`shrink-0 border-b backdrop-blur ${isNightMode ? 'bg-slate-950/95 border-slate-800' : 'bg-white/90 border-slate-200'}`}>
          <div className="max-w-[1700px] mx-auto px-3 sm:px-5 lg:px-8 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center ${isNightMode ? 'bg-slate-900 border-slate-700 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-600'}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                  <path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-5 4V5z"/>
                </svg>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg font-semibold tracking-tight text-blue-500">Shared Board</h1>
                  <span className={`px-2 py-0.5 text-[11px] rounded-full border ${isNightMode ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                    Read only
                  </span>
                </div>
                <p className={`text-xs truncate max-w-[42vw] sm:max-w-[500px] ${isNightMode ? 'text-slate-400' : 'text-slate-500'}`}>{title}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsNightMode((prev) => !prev)}
                className={`w-11 h-11 rounded-xl border transition flex items-center justify-center ${isNightMode ? 'border-slate-700 bg-slate-900 text-yellow-300 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'}`}
                title={isNightMode ? 'Switch to day mode' : 'Switch to night mode'}
              >
                {isNightMode ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <circle cx="12" cy="12" r="4"/>
                    <path d="M12 2v2"/>
                    <path d="M12 20v2"/>
                    <path d="m4.93 4.93 1.41 1.41"/>
                    <path d="m17.66 17.66 1.41 1.41"/>
                    <path d="M2 12h2"/>
                    <path d="M20 12h2"/>
                    <path d="m6.34 17.66-1.41 1.41"/>
                    <path d="m19.07 4.93-1.41 1.41"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>
                  </svg>
                )}
              </button>
              <button
                onClick={() => navigate('/login')}
                className={`px-4 py-2 text-sm font-medium rounded-xl border transition ${isNightMode ? 'text-slate-100 border-slate-700 bg-slate-800 hover:bg-slate-700' : 'text-slate-700 border-slate-200 bg-white hover:bg-slate-100'}`}
              >
                Open Class Flow
              </button>
            </div>
          </div>
        </header>

        <div className={`shrink-0 border-b ${isNightMode ? 'bg-slate-950/90 border-slate-800' : 'bg-white/75 border-slate-200'}`}>
          <div className="max-w-[1700px] mx-auto px-3 sm:px-5 lg:px-8 py-2.5 flex items-center justify-between gap-3">
            <p className={`text-[11px] uppercase tracking-[0.18em] ${isNightMode ? 'text-slate-500' : 'text-slate-500'}`}>
              {pages.length} {pages.length === 1 ? 'Page' : 'Pages'} shared
            </p>

            <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
              {pages.map((page) => (
                <button
                  key={page._id || page.pageNumber}
                  onClick={() => setCurrentPage(page.pageNumber)}
                  className={`px-4 py-2 text-sm rounded-xl border transition shrink-0 ${
                    currentPage === page.pageNumber
                      ? (isNightMode
                        ? 'bg-blue-600/20 border-blue-400/50 text-blue-200 shadow-[0_0_0_1px_rgba(96,165,250,0.25)]'
                        : 'bg-blue-50 border-blue-300 text-blue-700 shadow-[0_1px_0_rgba(59,130,246,0.2)]')
                      : (isNightMode
                        ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')
                  }`}
                >
                  Page {page.pageNumber}
                </button>
              ))}
            </div>
          </div>
        </div>

        <main className="relative flex-1 px-2 sm:px-4 lg:px-6 py-3 sm:py-4">
          <div className={`relative h-full w-full max-w-[1700px] mx-auto rounded-[24px] border overflow-hidden ${isNightMode ? 'bg-slate-950 border-slate-700 shadow-[0_24px_60px_rgba(2,6,23,0.6)]' : 'bg-white border-slate-300 shadow-[0_20px_50px_rgba(15,23,42,0.15)]'}`} data-canvas-host>
            <div className={`absolute left-4 top-3 z-[15] px-3 py-1 text-[11px] rounded-full border backdrop-blur ${isNightMode ? 'bg-slate-900/80 border-slate-700 text-slate-300' : 'bg-white/85 border-slate-200 text-slate-600'}`}>
              Viewing Page {currentPage}
            </div>

            {loading && (
              <div className={`absolute inset-0 z-20 flex items-center justify-center text-sm ${isNightMode ? 'bg-slate-950/95 text-slate-400' : 'bg-white/90 text-slate-500'}`}>
                Loading shared board...
              </div>
            )}

            {!loading && loadError && (
              <div className={`absolute inset-0 z-20 flex items-center justify-center text-sm px-6 text-center ${isNightMode ? 'bg-slate-950/95 text-red-300' : 'bg-white/95 text-red-600'}`}>
                {loadError}
              </div>
            )}

            {!loading && !loadError && pages.length === 0 && (
              <div className={`absolute inset-0 z-20 flex items-center justify-center text-sm px-6 text-center ${isNightMode ? 'bg-slate-950/80 text-slate-300' : 'bg-white/80 text-slate-600'}`}>
                This shared board has no pages.
              </div>
            )}

            {!loading && !loadError && pages.length > 0 && !pages.find((page) => page.pageNumber === currentPage)?.canvasData && (
              <div className={`absolute inset-0 z-20 flex items-center justify-center text-sm px-6 text-center pointer-events-none ${isNightMode ? 'bg-slate-950/40 text-slate-300' : 'bg-white/40 text-slate-600'}`}>
                This page has no content yet.
              </div>
            )}

            <canvas ref={canvasRef} className="block w-full h-full" />
          </div>
        </main>
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

function normalizeSharedCanvasJson(rawJson) {
  if (!rawJson || typeof rawJson !== 'object') return rawJson

  const normalized = { ...rawJson }
  delete normalized.viewportTransform
  delete normalized.vpt
  delete normalized.zoom
  return normalized
}

function resetSharedViewport(canvas) {
  if (!canvas) return

  canvas.setViewportTransform([1, 0, 0, 1, 0, 0])
  canvas.setZoom(1)
}

function enlivenSharedObjects(objects) {
  if (!Array.isArray(objects) || objects.length === 0) return Promise.resolve([])
  const util = fabric?.util
  if (!util || typeof util.enlivenObjects !== 'function') return Promise.resolve([])

  return util.enlivenObjects(objects).then((enlivened) => (Array.isArray(enlivened) ? enlivened : []))
}

function fitSharedObjectsInView(canvas) {
  if (!canvas) return

  const objects = canvas.getObjects().filter((obj) => obj?.visible !== false)
  if (!objects.length) return

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  objects.forEach((obj) => {
    const bounds = obj.getBoundingRect()
    minX = Math.min(minX, bounds.left)
    minY = Math.min(minY, bounds.top)
    maxX = Math.max(maxX, bounds.left + bounds.width)
    maxY = Math.max(maxY, bounds.top + bounds.height)
  })

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return
  }

  const contentWidth = Math.max(1, maxX - minX)
  const contentHeight = Math.max(1, maxY - minY)
  const canvasWidth = canvas.getWidth()
  const canvasHeight = canvas.getHeight()
  const padding = 40

  const maxAllowedWidth = Math.max(1, canvasWidth - padding * 2)
  const maxAllowedHeight = Math.max(1, canvasHeight - padding * 2)
  const zoom = Math.min(1, maxAllowedWidth / contentWidth, maxAllowedHeight / contentHeight)

  const offsetX = (canvasWidth - contentWidth * zoom) / 2 - minX * zoom
  const offsetY = (canvasHeight - contentHeight * zoom) / 2 - minY * zoom
  canvas.setViewportTransform([zoom, 0, 0, zoom, offsetX, offsetY])
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
