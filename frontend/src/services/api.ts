import axios from 'axios'

/// <reference types="vite/client" />

const api = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json'
  }
})

export default api

// Connection APIs
export const connectionsApi = {
  list: () => api.get('/connections/'),
  create: (data: any) => api.post('/connections/', data),
  test: (data: any) => api.post('/connections/test', data),
  delete: (id: string) => api.delete(`/connections/${id}`)
}

// Project APIs
export const projectsApi = {
  list: () => api.get('/projects/'),
  create: (data: any) => api.post('/projects/', data),
  get: (id: string) => api.get(`/projects/${id}`),
  updatePhase: (id: string, phase: string) => api.put(`/projects/${id}/phase`, { phase })
}

// Discovery APIs
export const discoveryApi = {
  discover: (projectId: string) => api.post(`/projects/${projectId}/discover`),
  getSchema: (projectId: string) => api.get(`/projects/${projectId}/schema`)
}

// Mapping APIs
export const mappingsApi = {
  list: (projectId: string) => api.get(`/projects/${projectId}/mappings`),
  update: (mappingId: string, data: any) => api.put(`/mappings/${mappingId}`, data)
}

// Export APIs
export const exportApi = {
  generate: (projectId: string) => api.post(`/projects/${projectId}/export`),
  download: (projectId: string) => api.get(`/projects/${projectId}/export`, { responseType: 'blob' })
}
