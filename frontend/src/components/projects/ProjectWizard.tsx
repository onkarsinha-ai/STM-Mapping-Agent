import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { projectsApi, connectionsApi } from '../../services/api'
import { Database, Sparkles, Link2, Hash, Loader2 } from 'lucide-react'

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
      setSourceId('')
      setTargetId('')
      setLlmId('')
      setJiraKey('')
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to create project')
    }
    setCreating(false)
  }

  const inputGrid = 'grid grid-cols-1 md:grid-cols-2 gap-4 mb-4'

  return (
    <div className="card p-6 animate-slide-up">
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: 'var(--accent-soft)' }}
        >
          <Sparkles size={18} style={{ color: 'var(--accent)' }} />
        </div>
        <div>
          <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            New Mapping Project
          </h3>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Configure source, target, and LLM connections
          </p>
        </div>
      </div>

      <div className={inputGrid}>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Project Name
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="input-dark w-full"
            placeholder="Customer DWH Mapping"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="input-dark w-full"
            placeholder="Brief description..."
          />
        </div>
      </div>

      <div className={inputGrid}>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            <span className="inline-flex items-center gap-1.5">
              <Database size={14} style={{ color: 'var(--cyan)' }} />
              Source Connection
            </span>
          </label>
          <select
            value={sourceId}
            onChange={e => setSourceId(e.target.value)}
            className="input-dark w-full"
          >
            <option value="">Select source...</option>
            {sourceConnections.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            <span className="inline-flex items-center gap-1.5">
              <Database size={14} style={{ color: 'var(--success)' }} />
              Target Connection
            </span>
          </label>
          <select
            value={targetId}
            onChange={e => setTargetId(e.target.value)}
            className="input-dark w-full"
          >
            <option value="">Select target...</option>
            {targetConnections.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={inputGrid}>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles size={14} style={{ color: 'var(--accent)' }} />
              LLM Connection
            </span>
          </label>
          <select
            value={llmId}
            onChange={e => setLlmId(e.target.value)}
            className="input-dark w-full"
          >
            <option value="">Select LLM...</option>
            {llmConnections.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            <span className="inline-flex items-center gap-1.5">
              <Hash size={14} style={{ color: 'var(--warning)' }} />
              Jira Ticket (optional)
            </span>
          </label>
          <input
            type="text"
            value={jiraKey}
            onChange={e => setJiraKey(e.target.value)}
            className="input-dark w-full"
            placeholder="PROJ-123"
          />
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={handleCreate}
          disabled={creating || !name}
          className="btn-primary"
        >
          {creating ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Link2 size={16} />
              Create Project
            </>
          )}
        </button>
      </div>
    </div>
  )
}
