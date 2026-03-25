import { useEffect, useMemo, useRef, useState } from 'react'
import useCanvasStore from '../../store/canvasStore.js'

const PENCIL_COLORS = ['#111827', '#2563eb', '#ef4444']
const EXTENDED_COLORS = ['#f59e0b', '#22c55e', '#ec4899', '#7c3aed', '#06b6d4', '#14b8a6', '#f97316', '#e11d48']
const GRAPHICS_COLORS = ['#111827', '#ef4444', '#f97316', '#2563eb', '#16a34a', '#7c3aed']
const DRAW_COLORS = [...new Set([...PENCIL_COLORS, ...EXTENDED_COLORS])]
const GRAPHIC_SHAPES = [
  { id: 'rectangle', icon: RectangleIcon, title: 'Rectangle' },
  { id: 'circle', icon: CircleIcon, title: 'Circle' },
  { id: 'triangle', icon: TriangleIcon, title: 'Triangle' },
  { id: 'pentagon', icon: PentagonIcon, title: 'Pentagon' },
  { id: 'diamond', icon: DiamondIcon, title: 'Diamond' },
  { id: 'ellipse', icon: EllipseIcon, title: 'Ellipse' },
  { id: 'line', icon: LineIcon, title: 'Line' },
  { id: 'arrow', icon: ArrowIcon, title: 'Arrow' },
  { id: 'dashed-line', icon: DashedLineIcon, title: 'Dashed Line' },
  { id: 'star', icon: StarIcon, title: 'Star' },
]

export default function ToolBar({ onUndo, onRedo, onClear, onExport, onCopy, onPaste, onDelete, onAddPhoto, onAddPdf, fabricRef, isNightMode = false }) {
  const {
    activeTool,
    setActiveTool,
    pencilColor,
    setPencilColor,
    highlighterColor,
    setHighlighterColor,
    graphicsColor,
    setGraphicsColor,
    graphicsShape,
    setGraphicsShape,
    pencilWidth,
    setPencilWidth,
    highlighterWidth,
    setHighlighterWidth,
    eraserWidth,
    setEraserWidth,
  } = useCanvasStore()

  const [hasSelection, setHasSelection] = useState(false)
  const [showDrawPanel, setShowDrawPanel] = useState(true)
  const [showStylePanel, setShowStylePanel] = useState(false)
  const photoInputRef = useRef(null)
  const pdfInputRef = useRef(null)

  const isDrawTool = activeTool === 'pencil' || activeTool === 'highlighter' || activeTool === 'eraser'

  useEffect(() => {
    let frameId = null
    let cleanup = null

    const bindSelectionEvents = () => {
      const canvas = fabricRef?.current
      if (!canvas) {
        frameId = requestAnimationFrame(bindSelectionEvents)
        return
      }

      const syncSelectionState = () => {
        setHasSelection(Boolean(canvas.getActiveObject()))
      }

      const onSelect = () => setHasSelection(true)
      const onDeselect = () => setHasSelection(false)

      canvas.on('selection:created', onSelect)
      canvas.on('selection:updated', onSelect)
      canvas.on('selection:cleared', onDeselect)
      canvas.on('object:modified', syncSelectionState)

      syncSelectionState()

      cleanup = () => {
        canvas.off('selection:created', onSelect)
        canvas.off('selection:updated', onSelect)
        canvas.off('selection:cleared', onDeselect)
        canvas.off('object:modified', syncSelectionState)
      }
    }

    bindSelectionEvents()

    return () => {
      if (frameId) cancelAnimationFrame(frameId)
      cleanup?.()
    }
  }, [fabricRef])

  const currentWidth = useMemo(() => {
    if (activeTool === 'highlighter') return highlighterWidth
    if (activeTool === 'eraser') return eraserWidth
    return pencilWidth
  }, [activeTool, eraserWidth, highlighterWidth, pencilWidth])

  const activeDrawColor = activeTool === 'highlighter' ? highlighterColor : pencilColor

  const applyDrawColor = (color) => {
    if (activeTool === 'highlighter') {
      setHighlighterColor(color)
      return
    }
    setPencilColor(color)
  }

  useEffect(() => {
    setShowStylePanel(false)
  }, [activeTool])

  const setCurrentWidth = (width) => {
    if (activeTool === 'highlighter') {
      setHighlighterWidth(width)
      return
    }
    if (activeTool === 'eraser') {
      setEraserWidth(width)
      return
    }
    setPencilWidth(width)
  }

  const onDrawClick = () => {
    if (isDrawTool) {
      setShowDrawPanel((prev) => !prev)
      return
    }

    setActiveTool('pencil')
    setShowDrawPanel(true)
  }

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0]
    if (file) {
      await onAddPhoto?.(file)
    }
    e.target.value = ''
  }

  const handlePdfSelect = async (e) => {
    const file = e.target.files?.[0]
    if (file) {
      await onAddPdf?.(file)
    }
    e.target.value = ''
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 px-3">
      {hasSelection && (
        <div className={`fixed top-16 right-4 md:right-6 z-[60] flex items-center gap-1 rounded-2xl shadow-lg px-3 py-2 border ${isNightMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-100'}`}>
          <ActionBtn onClick={onCopy} title="Copy">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <rect x="9" y="9" width="13" height="13" rx="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            <span>Copy</span>
          </ActionBtn>
          <ActionBtn onClick={onPaste} title="Paste">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
              <rect x="8" y="2" width="8" height="4" rx="1"/>
            </svg>
            <span>Paste</span>
          </ActionBtn>
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <ActionBtn onClick={onDelete} title="Delete" danger>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M3 6h18"/>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            </svg>
            <span>Delete</span>
          </ActionBtn>
        </div>
      )}

      {showDrawPanel && isDrawTool && (
        <div className={`w-[min(92vw,360px)] rounded-2xl shadow-lg px-3 py-3 border flex flex-col gap-2 relative ${isNightMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center gap-2 flex-wrap">
            <ToolModeIcon
              active={activeTool === 'pencil'}
              onClick={() => setActiveTool('pencil')}
              title="Pencil"
              isNightMode={isNightMode}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
              </svg>
            </ToolModeIcon>

            <ToolModeIcon
              active={activeTool === 'highlighter'}
              onClick={() => setActiveTool('highlighter')}
              title="Highlighter"
              isNightMode={isNightMode}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="m9 11-6 6v3h9l3-3"/>
                <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>
              </svg>
            </ToolModeIcon>

            <ToolModeIcon
              active={activeTool === 'eraser'}
              onClick={() => setActiveTool('eraser')}
              title="Eraser"
              isNightMode={isNightMode}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/>
                <path d="M22 21H7"/>
                <path d="m5 11 9 9"/>
              </svg>
            </ToolModeIcon>

            {activeTool === 'pencil' && (
              <div className="flex items-center gap-1 ml-1">
                {PENCIL_COLORS.map((color) => (
                  <PencilColorBtn
                    key={color}
                    color={color}
                    selected={pencilColor === color}
                    onClick={() => setPencilColor(color)}
                    isNightMode={isNightMode}
                  />
                ))}
              </div>
            )}

            {activeTool === 'highlighter' && (
              <button
                onClick={() => setHighlighterColor('#000000')}
                className={`w-9 h-9 rounded-lg border flex items-center justify-center transition ml-1
                  ${highlighterColor === '#000000' ? 'bg-blue-100 border-blue-300' : isNightMode ? 'border-slate-600 hover:bg-slate-800' : 'border-gray-200 hover:bg-gray-50'}`}
                title="Highlighter color"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#111827" strokeWidth="2">
                  <path d="m9 11-6 6v3h9l3-3"/>
                  <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>
                </svg>
              </button>
            )}

            <button
              onClick={() => setShowStylePanel((prev) => !prev)}
              className={`w-9 h-9 rounded-lg border flex items-center justify-center transition ml-auto ${isNightMode ? 'border-slate-600 hover:bg-slate-800' : 'border-gray-200 hover:bg-gray-50'}`}
              title="More colors and stroke"
            >
              <div className="w-5 h-5 rounded-full border border-gray-300" style={{ backgroundColor: activeTool === 'eraser' ? '#ffffff' : activeDrawColor }} />
            </button>
          </div>

          {showStylePanel && (
            <div className={`border rounded-xl p-2.5 ${isNightMode ? 'border-slate-600 bg-slate-800' : 'border-gray-200 bg-gray-50'}`}>
              {activeTool !== 'eraser' && (
                <div className="grid grid-cols-8 gap-2 mb-2">
                  {DRAW_COLORS.map((color) => (
                    <Swatch
                      key={color}
                      color={color}
                      selected={activeDrawColor === color}
                      onClick={() => applyDrawColor(color)}
                    />
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold w-9 ${isNightMode ? 'text-slate-300' : 'text-gray-500'}`}>Size</span>
                <input
                  type="range"
                  min="1"
                  max="40"
                  value={currentWidth}
                  onChange={(e) => setCurrentWidth(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <span className={`text-xs font-semibold w-7 text-right ${isNightMode ? 'text-slate-100' : 'text-gray-700'}`}>{currentWidth}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTool === 'graphics' && (
        <div className={`w-[min(92vw,520px)] rounded-2xl shadow-lg px-4 py-3 border flex flex-col gap-3 ${isNightMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-100'}`}>
          <div className="grid grid-cols-5 gap-2">
            {GRAPHIC_SHAPES.map((shape) => {
              const Icon = shape.icon
              const selected = graphicsShape === shape.id
              return (
                <button
                  key={shape.id}
                  onClick={() => setGraphicsShape(shape.id)}
                  title={shape.title}
                  className={`group relative h-9 rounded-lg border transition flex items-center justify-center
                    ${selected ? 'bg-blue-100 border-blue-300 text-blue-700' : isNightMode ? 'bg-slate-900 border-slate-600 text-slate-200 hover:bg-slate-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  <Icon />
                  <HoverToolLabel label={shape.title} />
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-2">
            {GRAPHICS_COLORS.map((color) => (
              <Swatch
                key={color}
                color={color}
                selected={graphicsColor === color}
                onClick={() => setGraphicsColor(color)}
              />
            ))}
          </div>

          <p className={`text-xs ${isNightMode ? 'text-slate-400' : 'text-gray-500'}`}>Tap on board to place selected shape</p>
        </div>
      )}

      <div className={`flex items-center gap-0.5 rounded-2xl shadow-lg px-2 py-2 border max-w-[92vw] overflow-x-auto ${isNightMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-100'}`}>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoSelect}
        />
        <input
          ref={pdfInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handlePdfSelect}
        />

        <TBtn onClick={onUndo} title="Undo" isNightMode={isNightMode}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="M9 14 4 9l5-5"/>
            <path d="M4 9h10a5 5 0 0 1 0 10h-1"/>
          </svg>
        </TBtn>

        <TBtn onClick={onRedo} title="Redo" isNightMode={isNightMode}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="m15 14 5-5-5-5"/>
            <path d="M20 9H10a5 5 0 0 0 0 10h1"/>
          </svg>
        </TBtn>

        <Sep />

        <TBtn onClick={() => setActiveTool('select')} active={activeTool === 'select'} title="Select" isNightMode={isNightMode}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="M5 3l14 9-7 1-4 7L5 3z"/>
          </svg>
        </TBtn>

        <TBtn onClick={() => setActiveTool('hand')} active={activeTool === 'hand'} title="Hand (Pan)" isNightMode={isNightMode}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="M7 11V5a1.5 1.5 0 0 1 3 0v5"/>
            <path d="M10 10V4a1.5 1.5 0 0 1 3 0v6"/>
            <path d="M13 11V6a1.5 1.5 0 0 1 3 0v7"/>
            <path d="M16 12V9a1.5 1.5 0 0 1 3 0v6.5a5.5 5.5 0 0 1-5.5 5.5h-1.2A7.3 7.3 0 0 1 7 18.7L5 14.5a1.5 1.5 0 0 1 2.6-1.4L9 15"/>
          </svg>
        </TBtn>

        <TBtn onClick={onDrawClick} active={isDrawTool} title="Draw settings" isNightMode={isNightMode}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
          </svg>
        </TBtn>

        <TBtn onClick={() => setActiveTool('graphics')} active={activeTool === 'graphics'} title="Graphics" isNightMode={isNightMode}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <rect x="3" y="4" width="7" height="7" rx="1"/>
            <circle cx="17" cy="8" r="3.5"/>
            <path d="M4 19h16"/>
          </svg>
        </TBtn>

        <Sep />

        <TBtn onClick={onCopy} title="Copy selected" disabled={!hasSelection} isNightMode={isNightMode}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <rect x="9" y="9" width="13" height="13" rx="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        </TBtn>

        <TBtn onClick={onPaste} title="Paste" isNightMode={isNightMode}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
            <rect x="8" y="2" width="8" height="4" rx="1"/>
          </svg>
        </TBtn>

        <TBtn onClick={() => photoInputRef.current?.click()} title="Add photo" isNightMode={isNightMode}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <rect x="3" y="5" width="18" height="14" rx="2"/>
            <circle cx="8.5" cy="10" r="1.5"/>
            <path d="m21 15-5-5L5 19"/>
          </svg>
        </TBtn>

        <TBtn onClick={() => pdfInputRef.current?.click()} title="Add PDF" isNightMode={isNightMode}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <path d="M14 2v6h6"/>
            <path d="M8 13h2.5a1.5 1.5 0 0 1 0 3H8z"/>
            <path d="M13 13v3"/>
            <path d="M13 13h1.5a1.5 1.5 0 0 1 0 3H13"/>
          </svg>
        </TBtn>

        <Sep />

        <TBtn onClick={onDelete} title="Delete selected" disabled={!hasSelection} isNightMode={isNightMode}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-red-400">
            <path d="M3 6h18"/>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
          </svg>
        </TBtn>

        <TBtn onClick={onExport} title="Save as PNG" isNightMode={isNightMode}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-green-500">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </TBtn>
      </div>
    </div>
  )
}

function ToolModeIcon({ active, onClick, title, children, isNightMode = false }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`group relative w-9 h-9 rounded-lg border flex items-center justify-center transition
        ${active ? 'bg-blue-100 border-blue-300 text-blue-700' : isNightMode ? 'bg-slate-900 border-slate-600 text-slate-200 hover:bg-slate-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
    >
      {children}
      <HoverToolLabel label={title} />
    </button>
  )
}

function PencilColorBtn({ color, selected, onClick, isNightMode = false }) {
  return (
    <button
      onClick={onClick}
      title="Quick pencil color"
      className={`group relative w-8 h-8 rounded-lg border flex items-center justify-center transition
        ${selected ? 'bg-blue-100 border-blue-300' : isNightMode ? 'bg-slate-900 border-slate-600 hover:bg-slate-800' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
    >
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke={color} strokeWidth="2">
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
      </svg>
      <HoverToolLabel label="Pencil color" />
    </button>
  )
}

function RectangleIcon() {
  return <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="6" width="16" height="12" rx="2"/></svg>
}

function CircleIcon() {
  return <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="7"/></svg>
}

function TriangleIcon() {
  return <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5 19 18H5Z"/></svg>
}

function PentagonIcon() {
  return <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 4 7 5-3 10H8L5 9Z"/></svg>
}

function DiamondIcon() {
  return <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 4 8 8-8 8-8-8Z"/></svg>
}

function EllipseIcon() {
  return <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="12" rx="8" ry="6"/></svg>
}

function LineIcon() {
  return <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 18 19 6"/></svg>
}

function ArrowIcon() {
  return <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 18 19 4"/><path d="M12 4h7v7"/></svg>
}

function DashedLineIcon() {
  return <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3"><path d="M5 18 19 6"/></svg>
}

function StarIcon() {
  return <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 4 2.4 4.8 5.3.8-3.8 3.7.9 5.2-4.8-2.5-4.8 2.5.9-5.2L4.3 9.6l5.3-.8z"/></svg>
}

function Swatch({ color, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-7 h-7 rounded-full transition-transform hover:scale-105
        ${selected ? 'ring-2 ring-offset-1 ring-blue-500' : ''}`}
      style={{ backgroundColor: color }}
      title={color}
    />
  )
}

function TBtn({ onClick, active, title, children, disabled = false, isNightMode = false }) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`group relative w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0
        ${active ? 'bg-blue-100 text-blue-600' : isNightMode ? 'text-slate-200 hover:bg-slate-800' : 'text-gray-600 hover:bg-gray-100'}
        ${disabled ? 'opacity-40 cursor-not-allowed hover:bg-transparent' : ''}`}
    >
      {children}
      {!disabled && <HoverToolLabel label={title} />}
    </button>
  )
}

function HoverToolLabel({ label }) {
  return (
    <span className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-gray-800 px-2 py-1 text-[11px] font-medium text-white opacity-0 group-hover:opacity-100 transition hidden md:block z-[80]">
      {label}
    </span>
  )
}

function ActionBtn({ onClick, title, danger, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition
        ${danger ? 'text-red-500 hover:bg-red-50' : 'text-gray-600 hover:bg-gray-100'}`}
    >
      {children}
    </button>
  )
}

function Sep() {
  return <div className="w-px h-6 bg-gray-200 mx-1 shrink-0" />
}
