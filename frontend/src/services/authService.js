import api from './api.js'

export const registerUser = async (name, email, password) => {
  const { data } = await api.post('/auth/register', { name, email, password })
  return data
}

export const loginUser = async (email, password) => {
  const { data } = await api.post('/auth/login', { email, password })
  return data
}

export const logoutUser = async () => {
  await api.post('/auth/logout')
}

export const getMe = async () => {
  const { data } = await api.get('/auth/me')
  return data
}