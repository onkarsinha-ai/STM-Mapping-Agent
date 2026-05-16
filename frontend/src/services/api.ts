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
  update: (id: string, data: any) => api.put(`/connections/${id}`, data),
  test: (data: any) => api.post('/connections/test', data),
  testById: (id: string) => api.post(`/connections/${id}/test`),
  delete: (id: string) => api.delete(`/connections/${id}`),
  get: (id: string) => api.get(`/connections/${id}`)
}

// Project APIs
export const projectsApi = {
  list: () => api.get('/projects/'),
  create: (data: any) => api.post('/projects/', data),
  get: (id: string) => api.get(`/projects/${id}`),
  updatePhase: (id: string, phase: string) => api.put(`/projects/${id}/phase`, { phase }),
  delete: (id: string) => api.delete(`/projects/${id}`)
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

// File APIs
export const filesApi = {
  extractSchema: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/files/extract-schema', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  }
}
