import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { projectsApi, connectionsApi } from '../../services/api'

export function ProjectWizard({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sourceId, setSourceId] = useState('')
  const [targetId, setTargetId] = useState('')
  const [llmId, setLlmId] = useState('')
  const [jiraKey, setJiraKey] = useState('')
  const [creating, setCreating] = useState(false)

  const queryClient = useQueryClient()
  const { data: connectionsData } = useQuery({
    queryKey: ['connections'],
    queryFn: () => connectionsApi.list()
  })

  const connections = connectionsData?.data || []
  const sourceConnections = connections.filter((c: any) => c.connection_type === 'source')
  const targetConnections = connections.filter((c: any) => c.connection_type === 'target')
  const llmConnections = connections.filter((c: any) => c.connection_type === 'llm')

  const handleCreate = async () => {
    setCreating(true)
    try {
      await projectsApi.create({
        name,
        description,
        source_connection_id: sourceId || null,
        target_connection_id: targetId || null,
        llm_connection_id: llmId || null,
        jira_ticket_key: jiraKey || null
      })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      onCreated()
      setName('')
      setDescription('')
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to create project')
    }
    setCreating(false)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">New Mapping Project</h3>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Customer DWH Mapping" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <input type="text" value={description} onChange={e => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Source Connection</label>
          <select value={sourceId} onChange={e => setSourceId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md">
            <option value="">Select source...</option>
            {sourceConnections.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Target Connection</label>
          <select value={targetId} onChange={e => setTargetId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md">
            <option value="">Select target...</option>
            {targetConnections.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">LLM Connection</label>
          <select value={llmId} onChange={e => setLlmId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md">
            <option value="">Select LLM...</option>
            {llmConnections.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Jira Ticket (optional)</label>
          <input type="text" value={jiraKey} onChange={e => setJiraKey(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="PROJ-123" />
        </div>
      </div>

      <button onClick={handleCreate} disabled={creating || !name}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
        {creating ? 'Creating...' : 'Create Project'}
      </button>
    </div>
  )
}
