import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as fabric from 'fabric'
import { jsPDF } from 'jspdf'
import ToolBar from './ToolBar.jsx'
import useCanvasBoard from './CanvasBoard.jsx'
import { addPage, createShareLink, deletePage, getBoard, getPages, savePage, updateBoardTitle } from '../../services/boardService.js'

const DEFAULT_BACKGROUND = { color: '#ffffff', pattern: 'none' }
const BACKGROUND_COLORS = ['#ffffff', '#f9fafb', '#fef3c7', '#dbeafe', '#ecfccb', '#fee2e2', '#f3e8ff', '#d1fae5', '#fce7f3', '#e5e7eb']
const BACKGROUND_PATTERNS = [
  { id: 'none', label: 'Plain' },
  { id: 'dot', label: 'Dot' },
  { id: 'square', label: 'Square' },
  { id: 'graph', label: 'Graph' },
  { id: 'hybrid', label: 'Hybrid' },
  { id: 'diamond', label: 'Diamond' },
  { id: 'triangle', label: 'Triangle' },
  { id: 'wide-rule', label: 'Wide rule' },
  { id: 'narrow-rule', label: 'Narrow rule' },
]

export default function WhiteboardPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [canvasData, setCanvasData] = useState('')
  const [pages, setPages] = useState([])
  const [currentPageNumber, setCurrentPageNumber] = useState(1)
  const [boardTitle, setBoardTitle] = useState('Untitled Board')
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [pageBusy, setPageBusy] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showPageMenu, setShowPageMenu] = useState(false)
  const [isNightMode, setIsNightMode] = useState(() => {
    try {
      return localStorage.getItem('smartboard-night-mode') === '1'
    } catch {
      return false
    }
  })
  const [currentBackground, setCurrentBackground] = useState(DEFAULT_BACKGROUND)
  const [shareStatus, setShareStatus] = useState('')
  const saveTimerRef = useRef(null)
  const pageMenuRef = useRef(null)
  const pendingCanvasDataRef = useRef('')
  const pendingPageNumberRef = useRef(1)
  const currentBackgroundRef = useRef(DEFAULT_BACKGROUND)
  const isSavingRef = useRef(false)

  useEffect(() => {
    try {
      localStorage.setItem('smartboard-night-mode', isNightMode ? '1' : '0')
    } catch {
      // Ignore storage errors in restricted environments.
    }
  }, [isNightMode])

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!showPageMenu) return
      if (pageMenuRef.current && !pageMenuRef.current.contains(event.target)) {
        setShowPageMenu(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [showPageMenu])

  useEffect(() => {
    const fetchBoard = async () => {
      try {
        const board = await getBoard(id)
        setBoardTitle(board.title || 'Untitled Board')
        setTitleDraft(board.title || 'Untitled Board')
      } catch (error) {
        console.error('Failed to load board details:', error)
      }
    }

    fetchBoard()
  }, [id])

  useEffect(() => {
    const fetchPageData = async () => {
      try {
        setLoading(true)
        const pageData = await getPages(id)
        const orderedPages = [...pageData].sort((a, b) => a.pageNumber - b.pageNumber)
        setPages(orderedPages)

        const firstPage = orderedPages[0]
        const firstPageNumber = firstPage?.pageNumber || 1

        setCurrentPageNumber(firstPageNumber)
        setCanvasData(firstPage?.canvasData || '')
        pendingPageNumberRef.current = firstPageNumber
        const parsedBackground = parseBackgroundSetting(firstPage?.background)
        setCurrentBackground(parsedBackground)
        currentBackgroundRef.current = parsedBackground
      } catch (error) {
        console.error('Failed to load whiteboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPageData()
  }, [id])

  const flushSave = useCallback(async () => {
    const payload = pendingCanvasDataRef.current
    if (!payload || isSavingRef.current) return

    try {
      isSavingRef.current = true
      const pageNumber = pendingPageNumberRef.current
      await savePage(id, pageNumber, payload, serializeBackgroundSetting(currentBackgroundRef.current))
      setPages((prev) => prev.map((page) => (
        page.pageNumber === pageNumber
          ? { ...page, canvasData: payload, background: serializeBackgroundSetting(currentBackgroundRef.current) }
          : page
      )))
    } catch (error) {
      console.error('Failed to flush whiteboard save:', error)
    } finally {
      isSavingRef.current = false
    }
  }, [id])

  const handleSave = useCallback((nextCanvasData) => {
    pendingCanvasDataRef.current = nextCanvasData
    pendingPageNumberRef.current = currentPageNumber

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }

    saveTimerRef.current = setTimeout(async () => {
      try {
        await flushSave()
      } catch (error) {
        console.error('Failed to save whiteboard data:', error)
      }
    }, 500)
  }, [currentPageNumber, flushSave])

  const switchPage = useCallback(async (pageNumber) => {
    if (pageBusy || pageNumber === currentPageNumber) return
    setPageBusy(true)

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }

    await flushSave()

    const target = pages.find((page) => page.pageNumber === pageNumber)
    setCurrentPageNumber(pageNumber)
    setCanvasData(target?.canvasData || '')
    pendingPageNumberRef.current = pageNumber
    pendingCanvasDataRef.current = target?.canvasData || ''
    const parsedBackground = parseBackgroundSetting(target?.background)
    setCurrentBackground(parsedBackground)
    currentBackgroundRef.current = parsedBackground

    setPageBusy(false)
  }, [currentPageNumber, flushSave, pageBusy, pages])

  const handleAddPage = useCallback(async () => {
    if (pageBusy) return
    setPageBusy(true)

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    await flushSave()

    try {
      const created = await addPage(id)
      const updatedPages = [...pages, created].sort((a, b) => a.pageNumber - b.pageNumber)
      setPages(updatedPages)
      setCurrentPageNumber(created.pageNumber)
      setCanvasData(created.canvasData || '')
      pendingPageNumberRef.current = created.pageNumber
      pendingCanvasDataRef.current = created.canvasData || ''
      const parsedBackground = parseBackgroundSetting(created.background)
      setCurrentBackground(parsedBackground)
      currentBackgroundRef.current = parsedBackground
    } catch (error) {
      console.error('Failed to add page:', error)
    } finally {
      setPageBusy(false)
    }
  }, [flushSave, id, pageBusy, pages])

  const handleDeleteCurrentPage = useCallback(async () => {
    if (pageBusy || pages.length <= 1) return
    setPageBusy(true)

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    await flushSave()

    try {
      await deletePage(id, currentPageNumber)
      const remaining = pages.filter((page) => page.pageNumber !== currentPageNumber)
      setPages(remaining)

      const fallback = remaining[0]
      const fallbackNumber = fallback?.pageNumber || 1
      setCurrentPageNumber(fallbackNumber)
      setCanvasData(fallback?.canvasData || '')
      pendingPageNumberRef.current = fallbackNumber
      pendingCanvasDataRef.current = fallback?.canvasData || ''
      const parsedBackground = parseBackgroundSetting(fallback?.background)
      setCurrentBackground(parsedBackground)
      currentBackgroundRef.current = parsedBackground
    } catch (error) {
      console.error('Failed to delete page:', error)
    } finally {
      setPageBusy(false)
    }
  }, [currentPageNumber, flushSave, id, pageBusy, pages])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
      void flushSave()
    }
  }, [flushSave])

  const board = useCanvasBoard({
    canvasData,
    onSave: handleSave,
  })

  useEffect(() => {
    const canvas = board.fabricRef.current
    if (!canvas) return
    applyBackgroundSetting(canvas, currentBackground)
  }, [board.fabricRef, currentBackground])

  const handleBackgroundChange = async (nextBackground) => {
    const canvas = board.fabricRef.current
    if (!canvas) return

    applyBackgroundSetting(canvas, nextBackground)

    const nextJson = JSON.stringify(canvas.toObject())
    pendingCanvasDataRef.current = nextJson
    pendingPageNumberRef.current = currentPageNumber
    setCanvasData(nextJson)
    setCurrentBackground(nextBackground)
    currentBackgroundRef.current = nextBackground

    try {
      await savePage(id, currentPageNumber, nextJson, serializeBackgroundSetting(nextBackground))
      setPages((prev) => prev.map((page) => (
        page.pageNumber === currentPageNumber
          ? { ...page, canvasData: nextJson, background: serializeBackgroundSetting(nextBackground) }
          : page
      )))
    } catch (error) {
      console.error('Failed to update background:', error)
    }
  }

  const exportBoardAsPdf = async () => {
    try {
      setPageBusy(true)
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
      await flushSave()

      const latestPages = (await getPages(id)).sort((a, b) => a.pageNumber - b.pageNumber)
      if (!latestPages.length) return

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
      const width = pdf.internal.pageSize.getWidth()
      const height = pdf.internal.pageSize.getHeight()

      for (let index = 0; index < latestPages.length; index += 1) {
        const page = latestPages[index]
        const imageDataUrl = await renderPageToImage(page)
        if (index > 0) pdf.addPage()
        pdf.addImage(imageDataUrl, 'PNG', 0, 0, width, height, undefined, 'FAST')
      }

      pdf.save(`${boardTitle.replace(/[^a-z0-9-_]+/gi, '_') || 'board'}.pdf`)
    } catch (error) {
      console.error('Failed to export board as PDF:', error)
    } finally {
      setPageBusy(false)
    }
  }

  const handleShareBoard = async () => {
    try {
      const result = await createShareLink(id)
      const link = `${window.location.origin}/shared/${result.shareToken}`
      await navigator.clipboard.writeText(link)
      setShareStatus('Link copied')
      setTimeout(() => setShareStatus(''), 1800)
    } catch (error) {
      console.error('Failed to share board:', error)
      setShareStatus('Share failed')
      setTimeout(() => setShareStatus(''), 1800)
    }
  }

  const handleRenameBoard = async () => {
    const nextTitle = titleDraft.trim()
    if (!nextTitle) return

    try {
      const updated = await updateBoardTitle(id, nextTitle)
      setBoardTitle(updated.title)
      setTitleDraft(updated.title)
      setEditingTitle(false)
    } catch (error) {
      console.error('Failed to rename board:', error)
    }
  }

  return (
    <div className={`h-screen w-screen overflow-hidden flex flex-col ${isNightMode ? 'bg-slate-900' : 'bg-gray-100'}`}>
      <header className={`h-16 shrink-0 border-b ${isNightMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-gray-200'}`}>
        <div className="h-full w-full max-w-[1680px] mx-auto px-4 md:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div>
              <h1 className="text-lg font-bold text-blue-600 leading-tight">SmartBoard</h1>
              <div className="flex items-center gap-2 mt-0.5">
              {editingTitle ? (
                <>
                  <input
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameBoard()
                      if (e.key === 'Escape') {
                        setTitleDraft(boardTitle)
                        setEditingTitle(false)
                      }
                    }}
                    autoFocus
                    className={`text-xs rounded px-1.5 py-0.5 w-52 border ${isNightMode ? 'text-slate-100 bg-slate-900 border-slate-700' : 'text-gray-700 border-blue-300'}`}
                  />
                  <button
                    onClick={handleRenameBoard}
                    className="text-[11px] text-green-600 font-medium"
                  >
                    Save
                  </button>
                </>
              ) : (
                <>
                  <p className={`text-xs ${isNightMode ? 'text-slate-400' : 'text-gray-500'}`}>Board: {boardTitle}</p>
                  <button
                    onClick={() => setEditingTitle(true)}
                    className="text-[11px] text-blue-600 font-medium"
                  >
                    Rename
                  </button>
                </>
              )}
            </div>
            </div>

            <div className="relative" ref={pageMenuRef}>
              <button
                onClick={() => setShowPageMenu((prev) => !prev)}
                disabled={pageBusy}
                className={`px-3 py-1.5 text-xs rounded-lg border transition shrink-0 ${currentPageNumber ? 'border-blue-300 text-blue-700 bg-blue-100' : ''} ${isNightMode ? 'border-slate-700 bg-slate-900 hover:bg-slate-800' : 'border-gray-200 bg-white hover:bg-gray-50'} ${pageBusy ? 'opacity-60 cursor-not-allowed' : ''}`}
                title="Pages"
              >
                Page {currentPageNumber} {showPageMenu ? '▲' : '▼'}
              </button>

              {showPageMenu && (
                <div className={`absolute left-0 top-10 z-[85] w-52 rounded-xl border shadow-xl p-2 ${isNightMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
                  <div className="max-h-56 overflow-auto pr-1">
                    {pages.map((page) => (
                      <button
                        key={page._id || page.pageNumber}
                        onClick={() => {
                          void switchPage(page.pageNumber)
                          setShowPageMenu(false)
                        }}
                        disabled={pageBusy}
                        className={`w-full text-left px-2.5 py-2 text-xs rounded-lg mb-1 transition ${currentPageNumber === page.pageNumber ? 'bg-blue-100 text-blue-700 border border-blue-300' : isNightMode ? 'text-slate-200 hover:bg-slate-800' : 'text-gray-700 hover:bg-gray-100'} ${pageBusy ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        Page {page.pageNumber}
                      </button>
                    ))}
                  </div>

                  <div className={`mt-1 pt-2 border-t ${isNightMode ? 'border-slate-700' : 'border-gray-200'}`}>
                    <button
                      onClick={() => {
                        void handleAddPage()
                        setShowPageMenu(false)
                      }}
                      disabled={pageBusy}
                      className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition ${isNightMode ? 'text-slate-200 hover:bg-slate-800' : 'text-gray-700 hover:bg-gray-100'} ${pageBusy ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      + Add Page
                    </button>
                    <button
                      onClick={() => {
                        void handleDeleteCurrentPage()
                        setShowPageMenu(false)
                      }}
                      disabled={pageBusy || pages.length <= 1}
                      className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition ${isNightMode ? 'text-red-300 hover:bg-red-950/40' : 'text-red-500 hover:bg-red-50'} ${(pageBusy || pages.length <= 1) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Delete Current Page
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 relative">
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
              onClick={() => setShowSettings((prev) => !prev)}
              className={`w-9 h-9 rounded-lg border transition flex items-center justify-center ${isNightMode ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
              title="Board settings"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.08a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.08a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.08a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>

            {showSettings && (
              <div className={`absolute right-0 top-11 z-[80] w-64 rounded-xl shadow-xl p-3 border ${isNightMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
                <button
                  onClick={exportBoardAsPdf}
                  disabled={pageBusy}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-sm transition ${isNightMode ? 'text-slate-200 hover:bg-slate-800' : 'text-gray-700 hover:bg-gray-100'} ${pageBusy ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  Save Full Board as PDF
                </button>

                <div className={`mt-2 px-2.5 py-2 rounded-lg border ${isNightMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                  <p className={`text-xs font-medium mb-2 ${isNightMode ? 'text-slate-300' : 'text-gray-600'}`}>Format Background</p>
                  <div className="grid grid-cols-5 gap-2 mb-3">
                    {BACKGROUND_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => handleBackgroundChange({ ...currentBackground, color })}
                        className={`w-8 h-8 rounded-full border transition ${currentBackground.color === color ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'}`}
                        style={{ backgroundColor: color }}
                        title={`Color ${color}`}
                      />
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {BACKGROUND_PATTERNS.map((pattern) => (
                      <button
                        key={pattern.id}
                        onClick={() => handleBackgroundChange({ ...currentBackground, pattern: pattern.id })}
                        className={`h-10 rounded border text-[11px] transition ${currentBackground.pattern === pattern.id ? 'border-blue-500 text-blue-700 bg-blue-50' : isNightMode ? 'border-slate-600 text-slate-200 bg-slate-900 hover:bg-slate-700' : 'border-gray-200 text-gray-600 bg-white hover:bg-gray-50'}`}
                        style={backgroundPreviewStyle(pattern.id, currentBackground.color)}
                        title={pattern.label}
                      >
                        {pattern.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleShareBoard}
                  className={`mt-2 w-full text-left px-2.5 py-2 rounded-lg text-sm transition ${isNightMode ? 'text-slate-200 hover:bg-slate-800' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  Share View Link
                </button>

                {shareStatus && <p className="mt-2 text-xs text-blue-600 px-2.5">{shareStatus}</p>}
              </div>
            )}

            <button
              onClick={() => navigate('/dashboard')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${isNightMode ? 'text-slate-200 bg-slate-800 hover:bg-slate-700' : 'text-gray-700 bg-gray-100 hover:bg-gray-200'}`}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <div className="relative flex-1 p-2 md:p-4 overscroll-none">
        <div className={`relative h-full w-full max-w-[1680px] mx-auto rounded-2xl border shadow-sm overflow-hidden touch-none ${isNightMode ? 'bg-slate-950 border-slate-700' : 'bg-white border-gray-200'}`} data-canvas-host>
          {loading && (
            <div className={`absolute inset-0 z-10 flex items-center justify-center text-sm ${isNightMode ? 'bg-slate-950/90 text-slate-400' : 'bg-white/90 text-gray-500'}`}>
              Loading board...
            </div>
          )}
          <canvas ref={board.canvasRef} className="block touch-none" />
        </div>
      </div>

      <ToolBar
        onUndo={board.handleUndo}
        onRedo={board.handleRedo}
        onClear={board.handleClear}
        onExport={board.handleExport}
        onCopy={board.handleCopy}
        onPaste={board.handlePaste}
        onDelete={board.handleDelete}
        onAddPhoto={board.handleAddPhoto}
        onAddPdf={board.handleAddPdf}
        fabricRef={board.fabricRef}
        isNightMode={isNightMode}
      />
    </div>
  )
}

async function renderPageToImage(page) {
  const width = 1400
  const height = 900

  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = width
  tempCanvas.height = height

  const staticCanvas = new fabric.StaticCanvas(tempCanvas, {
    width,
    height,
    backgroundColor: '#ffffff',
  })

  try {
    applyBackgroundSetting(staticCanvas, parseBackgroundSetting(page?.background))

    if (page?.canvasData) {
      const parsed = typeof page.canvasData === 'string' ? JSON.parse(page.canvasData) : page.canvasData
      if (parsed && typeof parsed === 'object') {
        await staticCanvas.loadFromJSON(parsed)
      }
    }

    staticCanvas.requestRenderAll()
    return staticCanvas.toDataURL({ format: 'png', quality: 1 })
  } finally {
    staticCanvas.dispose()
  }
}

function parseBackgroundSetting(raw) {
  if (!raw) return DEFAULT_BACKGROUND

  if (typeof raw === 'string' && raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw)
      return {
        color: parsed.color || '#ffffff',
        pattern: parsed.pattern || 'none',
      }
    } catch {
      return DEFAULT_BACKGROUND
    }
  }

  if (typeof raw === 'string') {
    return { color: raw, pattern: 'none' }
  }

  return DEFAULT_BACKGROUND
}

function serializeBackgroundSetting(setting) {
  return JSON.stringify({
    color: setting?.color || '#ffffff',
    pattern: setting?.pattern || 'none',
  })
}

function backgroundPreviewStyle(pattern, color) {
  return {
    backgroundColor: color,
    backgroundImage: getPatternCss(pattern),
    backgroundSize: getPatternSize(pattern),
  }
}

function applyBackgroundSetting(canvas, setting) {
  const baseColor = setting?.color || '#ffffff'
  const pattern = setting?.pattern || 'none'

  if (pattern === 'none') {
    canvas.backgroundColor = baseColor
    canvas.requestRenderAll()
    return
  }

  const source = createPatternSource(pattern, baseColor)
  if (!source) {
    canvas.backgroundColor = baseColor
    canvas.requestRenderAll()
    return
  }

  canvas.backgroundColor = new fabric.Pattern({
    source,
    repeat: 'repeat',
  })
  canvas.requestRenderAll()
}

function createPatternSource(pattern, baseColor) {
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

function getPatternCss(pattern) {
  switch (pattern) {
    case 'dot':
      return 'radial-gradient(circle, rgba(55,65,81,.35) 1px, transparent 1px)'
    case 'square':
      return 'linear-gradient(rgba(17,24,39,.38) 1px, transparent 1px), linear-gradient(90deg, rgba(17,24,39,.38) 1px, transparent 1px)'
    case 'graph':
      return 'linear-gradient(rgba(17,24,39,.25) 1px, transparent 1px), linear-gradient(90deg, rgba(17,24,39,.25) 1px, transparent 1px), linear-gradient(rgba(17,24,39,.45) 2px, transparent 2px), linear-gradient(90deg, rgba(17,24,39,.45) 2px, transparent 2px)'
    case 'hybrid':
      return 'linear-gradient(rgba(17,24,39,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(17,24,39,.3) 1px, transparent 1px), radial-gradient(circle, rgba(17,24,39,.35) 1px, transparent 1px)'
    case 'diamond':
      return 'repeating-linear-gradient(45deg, rgba(17,24,39,.3) 0, rgba(17,24,39,.3) 1px, transparent 1px, transparent 14px), repeating-linear-gradient(-45deg, rgba(17,24,39,.3) 0, rgba(17,24,39,.3) 1px, transparent 1px, transparent 14px)'
    case 'triangle':
      return 'linear-gradient(60deg, rgba(17,24,39,.3) 1px, transparent 1px), linear-gradient(-60deg, rgba(17,24,39,.3) 1px, transparent 1px), linear-gradient(0deg, rgba(17,24,39,.24) 1px, transparent 1px)'
    case 'wide-rule':
      return 'repeating-linear-gradient(0deg, rgba(17,24,39,.4) 0, rgba(17,24,39,.4) 1px, transparent 1px, transparent 22px)'
    case 'narrow-rule':
      return 'repeating-linear-gradient(0deg, rgba(17,24,39,.34) 0, rgba(17,24,39,.34) 1px, transparent 1px, transparent 12px)'
    default:
      return 'none'
  }
}

function getPatternSize(pattern) {
  switch (pattern) {
    case 'dot':
      return '14px 14px'
    case 'square':
      return '24px 24px'
    case 'graph':
      return '40px 40px, 40px 40px, 200px 200px, 200px 200px'
    case 'hybrid':
      return '24px 24px, 24px 24px, 24px 24px'
    case 'diamond':
      return '18px 18px'
    case 'triangle':
      return '20px 18px'
    case 'wide-rule':
      return '100% 24px'
    case 'narrow-rule':
      return '100% 14px'
    default:
      return 'auto'
  }
}