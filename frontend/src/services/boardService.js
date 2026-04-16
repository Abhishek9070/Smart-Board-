import api from './api.js'

export const getBoards = async () => {
  const { data } = await api.get('/boards')
  return data
}

export const createBoard = async (title = 'Class Flow') => {
  const { data } = await api.post('/boards', { title })
  return data
}

export const getBoard = async (id) => {
  const { data } = await api.get(`/boards/${id}`)
  return data
}

export const updateBoardTitle = async (id, title) => {
  const { data } = await api.put(`/boards/${id}`, { title })
  return data
}

export const createShareLink = async (id) => {
  const { data } = await api.post(`/boards/${id}/share`)
  return data
}

export const deleteBoard = async (id) => {
  await api.delete(`/boards/${id}`)
}

export const getPages = async (boardId) => {
  const { data } = await api.get(`/pages/${boardId}`)
  return data
}

export const savePage = async (boardId, pageNumber, canvasData, background) => {
  const payload = { canvasData }
  if (background) payload.background = background
  const { data } = await api.put(`/pages/${boardId}/${pageNumber}`, payload)
  return data
}

export const addPage = async (boardId) => {
  const { data } = await api.post(`/pages/${boardId}`)
  return data
}

export const deletePage = async (boardId, pageNumber) => {
  await api.delete(`/pages/${boardId}/${pageNumber}`)
}

export const getSharedBoard = async (token) => {
  const { data } = await api.get(`/share/${token}`)
  return data
}