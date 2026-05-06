import { useEffect, useRef, useCallback } from 'react'
import * as fabric from 'fabric'
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import useCanvasStore from '../../store/canvasStore.js'

GlobalWorkerOptions.workerSrc = pdfWorker

export default function useCanvasBoard({ canvasData, onSave } = {}) {
  const canvasRef = useRef(null)
  const fabricRef = useRef(null)
  const historyRef = useRef([])
  const historyIndexRef = useRef(-1)
  const isInitialized = useRef(false)
  const isSavingHistory = useRef(false)
  const isRestoringCanvas = useRef(false)
  const isErasingStrokeRef = useRef(false)
  const isPanningRef = useRef(false)
  const lastPanPointRef = useRef({ x: 0, y: 0 })

  const {
    activeTool,
    pencilColor,
    highlighterColor,
    graphicsColor,
    graphicsShape,
    pencilWidth,
    highlighterWidth,
    eraserWidth,
  } = useCanvasStore()

  const applyInteractionMode = useCallback((tool) => {
    const canvas = fabricRef.current
    if (!canvas) return

    if (tool === 'select') {
      canvas.selection = true
      canvas.skipTargetFind = false
      canvas.defaultCursor = 'default'
      canvas.hoverCursor = 'move'

      canvas.forEachObject((obj) => {
        obj.selectable = true
        obj.evented = true
      })

      canvas.requestRenderAll()
      return
    }

    if (tool === 'hand') {
      canvas.selection = false
      canvas.skipTargetFind = true
      canvas.defaultCursor = 'grab'
      canvas.hoverCursor = 'grab'

      canvas.discardActiveObject()
      canvas.requestRenderAll()
      return
    }

    canvas.selection = false
    canvas.skipTargetFind = true
    canvas.defaultCursor = createCrosshairCursor()
    canvas.hoverCursor = createCrosshairCursor()

    canvas.discardActiveObject()
    canvas.requestRenderAll()
  }, [])

  const fitCanvasToContainer = useCallback(() => {
    const canvas = fabricRef.current
    const host = canvasRef.current?.parentElement

    if (!canvas || !host) return

    const width = host.offsetWidth
    const height = host.offsetHeight

    if (!width || !height) return

    canvas.setDimensions({ width, height })
    canvas.calcOffset()
  }, [])

  const saveHistory = useCallback(() => {
    const canvas = fabricRef.current

    if (!canvas || isSavingHistory.current || isRestoringCanvas.current) {
      return
    }

    isSavingHistory.current = true

    try {
      const json = JSON.stringify(canvas.toObject())

      const history = historyRef.current
      const index = historyIndexRef.current
      const currentSnapshot = history[index]

      if (currentSnapshot === json) return

      const nextHistory = history.slice(0, index + 1)

      nextHistory.push(json)

      historyRef.current = nextHistory
      historyIndexRef.current = nextHistory.length - 1

      onSave?.(json)
    } finally {
      isSavingHistory.current = false
    }
  }, [onSave])

  useEffect(() => {
    if (isInitialized.current || !canvasRef.current) return

    isInitialized.current = true

    const container = canvasRef.current.parentElement

    const getContainerSize = () => ({
      width: container?.offsetWidth || window.innerWidth,
      height: container?.offsetHeight || window.innerHeight - 56,
    })

    const initialSize = getContainerSize()

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: initialSize.width,
      height: initialSize.height,
      backgroundColor: '#ffffff',
      allowTouchScrolling: false,
    })

    fabricRef.current = canvas

    const json = JSON.stringify(canvas.toObject())

    historyRef.current = [json]
    historyIndexRef.current = 0

    canvas.on('object:added', (e) => {
      if (e.target && e.target.erasable !== false) {
        e.target.set('erasable', true)
      }

      if (e.target?._isTemporary) return

      saveHistory()
    })

    canvas.on('object:modified', () => {
      if (isErasingStrokeRef.current) return
      saveHistory()
    })

    canvas.on('object:removed', (e) => {
      if (e.target?._isTemporary) return
      saveHistory()
    })

    const syncCanvasSize = () => {
      fitCanvasToContainer()
      canvas.requestRenderAll()
    }

    const handleMouseWheel = (opt) => {
      const event = opt.e

      if (!event?.ctrlKey) return

      event.preventDefault()
      event.stopPropagation()

      let zoom = canvas.getZoom()

      zoom *= 0.999 ** event.deltaY
      zoom = Math.min(4, Math.max(0.25, zoom))

      const pointer = canvas.getScenePoint(event)

      canvas.zoomToPoint(new fabric.Point(pointer.x, pointer.y), zoom)

      canvas.requestRenderAll()
    }

    canvas.on('mouse:wheel', handleMouseWheel)

    syncCanvasSize()

    let frameId = null

    const onResize = () => {
      if (frameId) cancelAnimationFrame(frameId)

      frameId = requestAnimationFrame(syncCanvasSize)
    }

    window.addEventListener('resize', onResize)

    const viewport = window.visualViewport

    if (viewport) {
      viewport.addEventListener('resize', onResize)
      viewport.addEventListener('scroll', onResize)
    }

    let resizeObserver = null

    if (container && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(onResize)
      resizeObserver.observe(container)
    }

    return () => {
      canvas.off('mouse:wheel', handleMouseWheel)

      if (frameId) cancelAnimationFrame(frameId)

      if (resizeObserver) resizeObserver.disconnect()

      window.removeEventListener('resize', onResize)

      if (viewport) {
        viewport.removeEventListener('resize', onResize)
        viewport.removeEventListener('scroll', onResize)
      }

      if (fabricRef.current) {
        fabricRef.current.dispose()
        fabricRef.current = null
        isInitialized.current = false
      }
    }
  }, [fitCanvasToContainer, saveHistory])

  useEffect(() => {
    const canvas = fabricRef.current

    if (!canvas) return

    const currentTool = useCanvasStore.getState().activeTool

    if (!canvasData) {
      isRestoringCanvas.current = true

      canvas.clear()
      canvas.backgroundColor = '#ffffff'

      fitCanvasToContainer()
      applyInteractionMode(currentTool)

      canvas.renderAll()

      const emptyJson = JSON.stringify(canvas.toObject())

      historyRef.current = [emptyJson]
      historyIndexRef.current = 0

      isRestoringCanvas.current = false

      return
    }

    const restoreCanvas = async () => {
      try {
        const parsed =
          typeof canvasData === 'string'
            ? JSON.parse(canvasData)
            : canvasData

        if (!parsed || typeof parsed !== 'object') return

        isRestoringCanvas.current = true

        await canvas.loadFromJSON(parsed)

        canvas.getObjects().forEach((obj) => {
          if (obj.erasable !== false) {
            obj.set('erasable', true)
          }
        })

        fitCanvasToContainer()
        applyInteractionMode(currentTool)

        canvas.renderAll()

        const restoredJson = JSON.stringify(canvas.toObject())

        historyRef.current = [restoredJson]
        historyIndexRef.current = 0
      } catch (error) {
        console.error('Failed to restore canvas data:', error)
      } finally {
        isRestoringCanvas.current = false
      }
    }

    restoreCanvas()
  }, [applyInteractionMode, canvasData, fitCanvasToContainer])

  useEffect(() => {
    const canvas = fabricRef.current

    if (!canvas) return

    if (activeTool === 'pencil') {
      canvas.isDrawingMode = true

      const brush = new fabric.PencilBrush(canvas)

      brush.color = pencilColor
      brush.width = pencilWidth

      canvas.freeDrawingBrush = brush
      canvas.freeDrawingCursor = createCrosshairCursor()
    } else if (activeTool === 'highlighter') {
      canvas.isDrawingMode = true

      const brush = new fabric.PencilBrush(canvas)

      brush.color = hexToRgba(highlighterColor, 0.35)
      brush.width = highlighterWidth

      canvas.freeDrawingBrush = brush
      canvas.freeDrawingCursor = createCrosshairCursor()
    } else if (activeTool === 'eraser') {
      canvas.isDrawingMode = true

      const brush = new fabric.PencilBrush(canvas)

      brush.width = eraserWidth
      brush.color = resolveEraserFallbackColor(canvas)

      canvas.freeDrawingBrush = brush
      canvas.freeDrawingCursor = createCircleCursor(eraserWidth)
    } else {
      canvas.isDrawingMode = false
      canvas.freeDrawingBrush = null
    }

    applyInteractionMode(activeTool)

    if (activeTool === 'eraser') {
      const cursor = createCircleCursor(eraserWidth)

      canvas.defaultCursor = cursor
      canvas.hoverCursor = cursor
      canvas.freeDrawingCursor = cursor
    }
  }, [
    activeTool,
    applyInteractionMode,
    eraserWidth,
    highlighterColor,
    highlighterWidth,
    pencilColor,
    pencilWidth,
  ])

  return {
    canvasRef,
    fabricRef,
  }
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)

  return `rgba(${r},${g},${b},${alpha})`
}

function resolveEraserFallbackColor(canvas) {
  const bg = canvas?.backgroundColor

  if (typeof bg === 'string' && bg.trim()) {
    return bg
  }

  return '#ffffff'
}

function createCircleCursor(size) {
  const clamped = Math.max(8, Math.min(size, 48))

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg"
      width="${clamped}"
      height="${clamped}"
      viewBox="0 0 ${clamped} ${clamped}">
      <circle
        cx="${clamped / 2}"
        cy="${clamped / 2}"
        r="${clamped / 2 - 1}"
        fill="none"
        stroke="black"
        stroke-width="2"
      />
    </svg>
  `

  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}") ${
    clamped / 2
  } ${clamped / 2}, crosshair`
}

function createCrosshairCursor() {
  const size = 18
  const center = size / 2

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg"
      width="${size}"
      height="${size}"
      viewBox="0 0 ${size} ${size}">
      <line
        x1="${center}"
        y1="1"
        x2="${center}"
        y2="${size - 1}"
        stroke="black"
        stroke-width="1.5"
      />
      <line
        x1="1"
        y1="${center}"
        x2="${size - 1}"
        y2="${center}"
        stroke="black"
        stroke-width="1.5"
      />
    </svg>
  `

  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}") ${center} ${center}, crosshair`
}