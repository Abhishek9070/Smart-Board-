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
    if (!canvas || isSavingHistory.current || isRestoringCanvas.current) return
    isSavingHistory.current = true

    const json = JSON.stringify(canvas.toObject())
    const history = historyRef.current
    const index = historyIndexRef.current

    // Aage ka history cut karo
    historyRef.current = history.slice(0, index + 1)
    historyRef.current.push(json)
    historyIndexRef.current = historyRef.current.length - 1

    isSavingHistory.current = false
    onSave?.(json)
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

    // Initial history save
    const json = JSON.stringify(canvas.toObject())
    historyRef.current = [json]
    historyIndexRef.current = 0

    // History save — sirf object:added/modified/removed pe
    canvas.on('object:added', (e) => {
      // Temporary highlighter objects ko history mein mat daalo
      if (e.target?._isTemporary) return
      saveHistory()
    })
    canvas.on('object:modified', saveHistory)
    canvas.on('object:removed', (e) => {
      if (e.target?._isTemporary) return
      saveHistory()
    })

    // Keep canvas in sync with container size.
    const syncCanvasSize = () => {
      fitCanvasToContainer()
      canvas.requestRenderAll()
    }

    // Zoom only the board viewport (not the page UI) when user zooms over canvas.
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

  // Load persisted canvas when data arrives from API.
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    if (!canvasData) {
      isRestoringCanvas.current = true
      canvas.clear()
      canvas.backgroundColor = '#ffffff'
      fitCanvasToContainer()
      canvas.renderAll()
      const emptyJson = JSON.stringify(canvas.toObject())
      historyRef.current = [emptyJson]
      historyIndexRef.current = 0
      isRestoringCanvas.current = false
      return
    }

    const restoreCanvas = async () => {
      try {
        const parsed = typeof canvasData === 'string' ? JSON.parse(canvasData) : canvasData
        if (!parsed || typeof parsed !== 'object') return

        isRestoringCanvas.current = true
        await canvas.loadFromJSON(parsed)
        fitCanvasToContainer()
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
  }, [canvasData, fitCanvasToContainer])

  // Tool update
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
      brush.color = '#ffffff'
      brush.width = eraserWidth
      canvas.freeDrawingBrush = brush
      canvas.freeDrawingCursor = createCircleCursor(eraserWidth)
    } else {
      canvas.isDrawingMode = false
    }

    // Select tool
    if (activeTool === 'select') {
      canvas.selection = true
      canvas.defaultCursor = 'default'
      canvas.forEachObject(obj => {
        obj.selectable = true
        obj.evented = true
      })
    } else if (activeTool === 'hand') {
      canvas.selection = false
      canvas.defaultCursor = 'grab'
      canvas.hoverCursor = 'grab'
      canvas.forEachObject(obj => {
        obj.selectable = false
        obj.evented = false
      })
      canvas.discardActiveObject()
      canvas.renderAll()
    } else {
      canvas.selection = false
      canvas.defaultCursor = createCrosshairCursor()
      canvas.hoverCursor = createCrosshairCursor()
      canvas.discardActiveObject()
      canvas.forEachObject(obj => {
        obj.selectable = false
        obj.evented = false
      })
      canvas.renderAll()
    }
  }, [activeTool, eraserWidth, highlighterColor, highlighterWidth, pencilColor, pencilWidth])

  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas || activeTool !== 'hand') return

    const handleMouseDown = (opt) => {
      if (!opt?.e) return
      isPanningRef.current = true
      lastPanPointRef.current = { x: opt.e.clientX, y: opt.e.clientY }
      canvas.defaultCursor = 'grabbing'
      canvas.hoverCursor = 'grabbing'
    }

    const handleMouseMove = (opt) => {
      if (!isPanningRef.current || !opt?.e) return

      const dx = opt.e.clientX - lastPanPointRef.current.x
      const dy = opt.e.clientY - lastPanPointRef.current.y

      canvas.relativePan(new fabric.Point(dx, dy))
      lastPanPointRef.current = { x: opt.e.clientX, y: opt.e.clientY }
      canvas.requestRenderAll()
      opt.e.preventDefault()
    }

    const stopPanning = () => {
      isPanningRef.current = false
      canvas.defaultCursor = 'grab'
      canvas.hoverCursor = 'grab'
    }

    canvas.on('mouse:down', handleMouseDown)
    canvas.on('mouse:move', handleMouseMove)
    canvas.on('mouse:up', stopPanning)
    canvas.on('mouse:out', stopPanning)

    return () => {
      canvas.off('mouse:down', handleMouseDown)
      canvas.off('mouse:move', handleMouseMove)
      canvas.off('mouse:up', stopPanning)
      canvas.off('mouse:out', stopPanning)
      isPanningRef.current = false
    }
  }, [activeTool])

  // Temporary highlighter — 5 sec baad gayab
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    if (activeTool !== 'highlighter') return

    const handlePathCreated = (e) => {
      const path = e.path
      if (!path) return

      path._isTemporary = true

      // 5 seconds baad fade out karke remove karo
      let opacity = 1
      const fadeInterval = setInterval(() => {
        opacity -= 0.05
        path.set('opacity', Math.max(0, opacity))
        canvas.renderAll()

        if (opacity <= 0) {
          clearInterval(fadeInterval)
          canvas.remove(path)
          canvas.renderAll()
        }
      }, 250) // har 250ms pe fade

      // Total time ~ 5 seconds (250ms * 20 steps)
    }

    canvas.on('path:created', handlePathCreated)
    return () => canvas.off('path:created', handlePathCreated)
  }, [activeTool])

  // Graphics tool
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    if (activeTool !== 'graphics') return

    canvas.isDrawingMode = false
    canvas.selection = false

    const handleClick = (opt) => {
      if (opt.target) return
      const pointer = canvas.getScenePoint(opt.e)

      const shape = createGraphicShape({
        type: graphicsShape,
        x: pointer.x,
        y: pointer.y,
        color: graphicsColor,
      })
      if (!shape) return

      canvas.add(shape)
      canvas.setActiveObject(shape)
      canvas.renderAll()
    }

    canvas.on('mouse:down', handleClick)
    return () => canvas.off('mouse:down', handleClick)
  }, [activeTool, graphicsColor, graphicsShape])

  // Undo
  const handleUndo = useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    if (historyIndexRef.current <= 0) return

    historyIndexRef.current -= 1
    const json = historyRef.current[historyIndexRef.current]

    isSavingHistory.current = true
    canvas.loadFromJSON(JSON.parse(json)).then(() => {
      canvas.renderAll()
      isSavingHistory.current = false
      onSave?.(JSON.stringify(canvas.toObject()))
    })
  }, [onSave])

  // Redo
  const handleRedo = useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    if (historyIndexRef.current >= historyRef.current.length - 1) return

    historyIndexRef.current += 1
    const json = historyRef.current[historyIndexRef.current]

    isSavingHistory.current = true
    canvas.loadFromJSON(JSON.parse(json)).then(() => {
      canvas.renderAll()
      isSavingHistory.current = false
      onSave?.(JSON.stringify(canvas.toObject()))
    })
  }, [onSave])

  const handleClear = useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    canvas.clear()
    canvas.backgroundColor = '#ffffff'
    canvas.renderAll()
    saveHistory()
  }, [saveHistory])

  const handleExport = useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = 'smartboard.png'
    link.href = canvas.toDataURL({ format: 'png', quality: 1 })
    link.click()
  }, [])

  const handleCopy = useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    const active = canvas.getActiveObject()
    if (active) {
      active.clone().then(cloned => {
        canvas._clipboard = cloned
      })
    }
  }, [])

  const handlePaste = useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas || !canvas._clipboard) return
    canvas._clipboard.clone().then(cloned => {
      cloned.set({
        left: cloned.left + 10,
        top: cloned.top + 10,
        evented: true,
      })
      canvas.add(cloned)
      canvas.setActiveObject(cloned)
      canvas.renderAll()
    })
  }, [])

  const handleDelete = useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    const activeObject = canvas.getActiveObject()
    if (!activeObject) return

    isSavingHistory.current = true
    if (activeObject.type === 'activeSelection') {
      const selectedObjects = activeObject.getObjects()
      selectedObjects.forEach((obj) => canvas.remove(obj))
    } else {
      canvas.remove(activeObject)
    }
    isSavingHistory.current = false

    canvas.discardActiveObject()
    canvas.requestRenderAll()
    saveHistory()
  }, [saveHistory])

  const addImageFromUrl = useCallback(async (url) => {
    const canvas = fabricRef.current
    if (!canvas || !url) return

    const image = await fabric.FabricImage.fromURL(url)
    const maxWidth = Math.max(240, canvas.getWidth() * 0.7)
    const maxHeight = Math.max(180, canvas.getHeight() * 0.7)

    const scale = Math.min(
      maxWidth / (image.width || maxWidth),
      maxHeight / (image.height || maxHeight),
      1
    )

    image.set({
      left: canvas.getWidth() * 0.15,
      top: canvas.getHeight() * 0.12,
      scaleX: scale,
      scaleY: scale,
      selectable: true,
      evented: true,
    })

    canvas.add(image)
    canvas.setActiveObject(image)
    canvas.renderAll()
  }, [])

  const handleAddPhoto = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) return

    const objectUrl = URL.createObjectURL(file)
    try {
      await addImageFromUrl(objectUrl)
    } catch (error) {
      console.error('Failed to add photo:', error)
    } finally {
      URL.revokeObjectURL(objectUrl)
    }
  }, [addImageFromUrl])

  const handleAddPdf = useCallback(async (file) => {
    if (!file || file.type !== 'application/pdf') return

    try {
      const buffer = await file.arrayBuffer()
      const pdfDoc = await getDocument({ data: buffer }).promise
      const page = await pdfDoc.getPage(1)
      const viewport = page.getViewport({ scale: 1.5 })

      const tempCanvas = document.createElement('canvas')
      const context = tempCanvas.getContext('2d')
      if (!context) return

      tempCanvas.width = viewport.width
      tempCanvas.height = viewport.height

      await page.render({ canvasContext: context, viewport }).promise
      await addImageFromUrl(tempCanvas.toDataURL('image/png'))
    } catch (error) {
      console.error('Failed to add PDF:', error)
    }
  }, [addImageFromUrl])

  return {
    canvasRef,
    fabricRef,
    handleUndo,
    handleRedo,
    handleClear,
    handleExport,
    handleCopy,
    handlePaste,
    handleDelete,
    handleAddPhoto,
    handleAddPdf,
  }
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function createCircleCursor(size) {
  const clamped = Math.max(8, Math.min(size, 48))
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${clamped}" height="${clamped}" viewBox="0 0 ${clamped} ${clamped}"><circle cx="${clamped / 2}" cy="${clamped / 2}" r="${(clamped / 2) - 1}" fill="none" stroke="black" stroke-width="2"/></svg>`
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}") ${clamped / 2} ${clamped / 2}, crosshair`
}

function createCrosshairCursor() {
  const size = 18
  const center = size / 2
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><line x1="${center}" y1="1" x2="${center}" y2="${size - 1}" stroke="black" stroke-width="1.5"/><line x1="1" y1="${center}" x2="${size - 1}" y2="${center}" stroke="black" stroke-width="1.5"/></svg>`
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}") ${center} ${center}, crosshair`
}

function createGraphicShape({ type, x, y, color }) {
  const base = {
    fill: 'transparent',
    stroke: color,
    strokeWidth: 3,
    selectable: true,
    evented: true,
  }

  switch (type) {
    case 'circle':
      return new fabric.Circle({ ...base, left: x, top: y, radius: 34 })
    case 'triangle':
      return new fabric.Triangle({ ...base, left: x, top: y, width: 82, height: 82 })
    case 'pentagon':
      return new fabric.Polygon(regularPolygonPoints(5, 42), { ...base, left: x, top: y })
    case 'diamond':
      return new fabric.Polygon([
        { x: 0, y: -42 },
        { x: 42, y: 0 },
        { x: 0, y: 42 },
        { x: -42, y: 0 },
      ], { ...base, left: x, top: y })
    case 'ellipse':
      return new fabric.Ellipse({ ...base, left: x, top: y, rx: 52, ry: 32 })
    case 'star':
      return new fabric.Polygon(starPoints(5, 42, 18), { ...base, left: x, top: y })
    case 'line':
      return new fabric.Line([x, y, x + 120, y - 70], { ...base, fill: color })
    case 'dashed-line':
      return new fabric.Line([x, y, x + 120, y - 70], {
        ...base,
        fill: color,
        strokeDashArray: [8, 6],
      })
    case 'arrow':
      return new fabric.Group([
        new fabric.Line([0, 0, 100, -60], { ...base, fill: color }),
        new fabric.Triangle({
          width: 18,
          height: 18,
          fill: color,
          stroke: color,
          left: 92,
          top: -68,
          angle: 45,
        }),
      ], { left: x, top: y, selectable: true, evented: true })
    case 'rectangle':
    default:
      return new fabric.Rect({ ...base, left: x, top: y, width: 112, height: 72, rx: 8, ry: 8 })
  }
}

function regularPolygonPoints(sides, radius) {
  const points = []
  for (let i = 0; i < sides; i += 1) {
    const angle = ((Math.PI * 2) / sides) * i - Math.PI / 2
    points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius })
  }
  return points
}

function starPoints(spikes, outerRadius, innerRadius) {
  const points = []
  let angle = -Math.PI / 2
  const step = Math.PI / spikes

  for (let i = 0; i < spikes; i += 1) {
    points.push({ x: Math.cos(angle) * outerRadius, y: Math.sin(angle) * outerRadius })
    angle += step
    points.push({ x: Math.cos(angle) * innerRadius, y: Math.sin(angle) * innerRadius })
    angle += step
  }

  return points
}