import { create } from 'zustand'

const useCanvasStore = create((set) => ({
  activeTool: 'pencil',
  pencilColor: '#000000',
  highlighterColor: '#000000',
  graphicsColor: '#111827',
  graphicsShape: 'rectangle',
  pencilWidth: 3,
  highlighterWidth: 12,
  eraserWidth: 10,
  history: [],
  historyIndex: -1,

  setActiveTool: (tool) => set({ activeTool: tool }),
  setPencilColor: (color) => set({ pencilColor: color }),
  setHighlighterColor: (color) => set({ highlighterColor: color }),
  setGraphicsColor: (color) => set({ graphicsColor: color }),
  setGraphicsShape: (shape) => set({ graphicsShape: shape }),
  setPencilWidth: (width) => set({ pencilWidth: width }),
  setHighlighterWidth: (width) => set({ highlighterWidth: width }),
  setEraserWidth: (width) => set({ eraserWidth: width }),
  setHistory: (history) => set({ history }),
  setHistoryIndex: (index) => set({ historyIndex: index }),
}))

export default useCanvasStore