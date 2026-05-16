import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { projectsApi, connectionsApi, filesApi } from '../../services/api'
import { Database, Sparkles, Link2, Hash, Loader2, Upload, FileText, X } from 'lucide-react'

export function ProjectWizard({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sourceId, setSourceId] = useState('')
  const [targetId, setTargetId] = useState('')
  const [llmId, setLlmId] = useState('')
  const [jiraKey, setJiraKey] = useState('')
  const [creating, setCreating] = useState(false)

  const [sourceMode, setSourceMode] = useState<'connection' | 'file'>('connection')
  const [targetMode, setTargetMode] = useState<'connection' | 'file'>('connection')
  const [sourceFiles, setSourceFiles] = useState<Array<{ file: File; schema: any; uploading: boolean; error?: string }>>([])
  const [targetFile, setTargetFile] = useState<{ file: File; schema: any; uploading: boolean; error?: string } | null>(null)

  const queryClient = useQueryClient()
  const { data: connectionsData } = useQuery({
    queryKey: ['connections'],
    queryFn: () => connectionsApi.list()
  })

  const connections = connectionsData?.data || []
  const sourceConnections = connections.filter((c: any) => c.connection_type === 'source')
  const targetConnections = connections.filter((c: any) => c.connection_type === 'target')
  const llmConnections = connections.filter((c: any) => c.connection_type === 'llm')

  const handleSourceFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const newEntries = files.map(file => ({ file, schema: null, uploading: true }))
    setSourceFiles(prev => [...prev, ...newEntries])

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        const response = await filesApi.extractSchema(file)
        setSourceFiles(prev => {
          const idx = prev.findIndex(f => f.file === file)
          if (idx === -1) return prev
          const updated = [...prev]
          updated[idx] = { ...updated[idx], schema: response.data, uploading: false }
          return updated
        })
      } catch (err: any) {
        setSourceFiles(prev => {
          const idx = prev.findIndex(f => f.file === file)
          if (idx === -1) return prev
          const updated = [...prev]
          updated[idx] = { ...updated[idx], uploading: false, error: err.response?.data?.detail || 'Parse failed' }
          return updated
        })
      }
    }
  }

  const handleTargetFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setTargetFile({ file, schema: null, uploading: true })
    try {
      const response = await filesApi.extractSchema(file)
      setTargetFile({ file, schema: response.data, uploading: false })
    } catch (err: any) {
      setTargetFile({ file, schema: null, uploading: false, error: err.response?.data?.detail || 'Parse failed' })
    }
  }

  const removeSourceFile = (file: File) => {
    setSourceFiles(prev => prev.filter(f => f.file !== file))
  }

  const removeTargetFile = () => {
    setTargetFile(null)
  }

  const handleCreate = async () => {
    setCreating(true)
    try {
      const payload: any = {
        name,
        description,
        llm_connection_id: llmId || null,
        jira_ticket_key: jiraKey || null
      }

      if (sourceMode === 'connection') {
        payload.source_connection_id = sourceId || null
      } else {
        payload.source_schemas = sourceFiles.filter(f => f.schema).map(f => f.schema)
      }

      if (targetMode === 'connection') {
        payload.target_connection_id = targetId || null
      } else {
        payload.target_schema = targetFile?.schema || null
      }

      await projectsApi.create(payload)
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      onCreated()
      setName('')
      setDescription('')
      setSourceId('')
      setTargetId('')
      setLlmId('')
      setJiraKey('')
      setSourceFiles([])
      setTargetFile(null)
      setSourceMode('connection')
      setTargetMode('connection')
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to create project')
    }
    setCreating(false)
  }

  const inputGrid = 'grid grid-cols-1 md:grid-cols-2 gap-4 mb-4'

  const isCreateDisabled = creating || !name || (
    sourceMode === 'connection' ? !sourceId : sourceFiles.filter(f => f.schema).length === 0
  ) || (
    targetMode === 'connection' ? !targetId : !targetFile?.schema
  )

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
              Source
            </span>
          </label>
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => setSourceMode('connection')}
              className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                sourceMode === 'connection'
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                  : 'border-gray-700 text-gray-400 hover:text-gray-300'
              }`}
            >
              Connection
            </button>
            <button
              type="button"
              onClick={() => setSourceMode('file')}
              className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                sourceMode === 'file'
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                  : 'border-gray-700 text-gray-400 hover:text-gray-300'
              }`}
            >
              Upload File(s)
            </button>
          </div>
          {sourceMode === 'connection' ? (
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
          ) : (
            <div>
              <label className="flex items-center gap-2 px-3 py-2 rounded-md border border-dashed border-gray-600 hover:border-gray-500 cursor-pointer transition-colors">
                <Upload size={14} style={{ color: 'var(--cyan)' }} />
                <span className="text-sm text-gray-400">Choose files...</span>
                <input
                  type="file"
                  multiple
                  accept=".csv,.json,.parquet,.xlsx,.xls,.avro"
                  onChange={handleSourceFileSelect}
                  className="hidden"
                />
              </label>
              <div className="mt-2 space-y-2">
                {sourceFiles.map((entry, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-2 rounded-md bg-gray-800/50 border border-gray-700"
                  >
                    <FileText size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--cyan)' }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-300 truncate">{entry.file.name}</span>
                        {entry.uploading && <Loader2 size={12} className="animate-spin text-gray-400" />}
                        {entry.schema && <span className="text-xs text-green-400">Ready</span>}
                        {entry.error && <span className="text-xs text-red-400">{entry.error}</span>}
                      </div>
                      {entry.schema && (
                        <div className="mt-1 text-xs text-gray-400">
                          {entry.schema.columns?.length || 0} columns: {entry.schema.columns?.map((c: any) => c.name || c).join(', ')}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSourceFile(entry.file)}
                      className="shrink-0 text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            <span className="inline-flex items-center gap-1.5">
              <Database size={14} style={{ color: 'var(--success)' }} />
              Target
            </span>
          </label>
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => setTargetMode('connection')}
              className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                targetMode === 'connection'
                  ? 'bg-green-500/20 border-green-500/50 text-green-400'
                  : 'border-gray-700 text-gray-400 hover:text-gray-300'
              }`}
            >
              Connection
            </button>
            <button
              type="button"
              onClick={() => setTargetMode('file')}
              className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                targetMode === 'file'
                  ? 'bg-green-500/20 border-green-500/50 text-green-400'
                  : 'border-gray-700 text-gray-400 hover:text-gray-300'
              }`}
            >
              Upload File
            </button>
          </div>
          {targetMode === 'connection' ? (
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
          ) : (
            <div>
              <label className="flex items-center gap-2 px-3 py-2 rounded-md border border-dashed border-gray-600 hover:border-gray-500 cursor-pointer transition-colors">
                <Upload size={14} style={{ color: 'var(--success)' }} />
                <span className="text-sm text-gray-400">Choose file...</span>
                <input
                  type="file"
                  accept=".csv,.json,.parquet,.xlsx,.xls,.avro"
                  onChange={handleTargetFileSelect}
                  className="hidden"
                />
              </label>
              {targetFile && (
                <div className="mt-2 flex items-start gap-2 p-2 rounded-md bg-gray-800/50 border border-gray-700">
                  <FileText size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--success)' }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-300 truncate">{targetFile.file.name}</span>
                      {targetFile.uploading && <Loader2 size={12} className="animate-spin text-gray-400" />}
                      {targetFile.schema && <span className="text-xs text-green-400">Ready</span>}
                      {targetFile.error && <span className="text-xs text-red-400">{targetFile.error}</span>}
                    </div>
                    {targetFile.schema && (
                      <div className="mt-1 text-xs text-gray-400">
                        {targetFile.schema.columns?.length || 0} columns: {targetFile.schema.columns?.map((c: any) => c.name || c).join(', ')}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={removeTargetFile}
                    className="shrink-0 text-gray-500 hover:text-red-400 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
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
          disabled={isCreateDisabled}
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
