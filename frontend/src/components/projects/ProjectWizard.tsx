import { useState, useRef, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { projectsApi, connectionsApi, filesApi } from '../../services/api'
import { Database, Sparkles, Link2, Hash, Loader2, Upload, FileText, X } from 'lucide-react'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/* ─── Reusable sub-components ─── */

interface ModeToggleProps {
  mode: 'connection' | 'file'
  onChange: (mode: 'connection' | 'file') => void
  activeColorClass: string
  fileLabel: string
}

function ModeToggle({ mode, onChange, activeColorClass, fileLabel }: ModeToggleProps) {
  const activeBase = activeColorClass === 'cyan' ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' : 'bg-green-500/20 border-green-500/50 text-green-400'
  return (
    <div className="flex gap-2 mb-2">
      <button
        type="button"
        onClick={() => onChange('connection')}
        className={`px-3 py-1 text-xs rounded-md border transition-colors ${
          mode === 'connection'
            ? activeBase
            : 'border-gray-700 text-gray-400 hover:text-gray-300'
        }`}
      >
        Connection
      </button>
      <button
        type="button"
        onClick={() => onChange('file')}
        className={`px-3 py-1 text-xs rounded-md border transition-colors ${
          mode === 'file'
            ? activeBase
            : 'border-gray-700 text-gray-400 hover:text-gray-300'
        }`}
      >
        {fileLabel}
      </button>
    </div>
  )
}

interface FileUploadEntryProps {
  entry: FileEntry
  onRemove: () => void
  color: string
}

function FileUploadEntry({ entry, onRemove, color }: FileUploadEntryProps) {
  return (
    <div className="flex items-start gap-2 p-2 rounded-md bg-gray-800/50 border border-gray-700">
      <FileText size={14} className="mt-0.5 shrink-0" style={{ color: `var(--${color})` }} />
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
        onClick={onRemove}
        className="shrink-0 text-gray-500 hover:text-red-400 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  )
}

/* ─── Types ─── */

interface FileEntry {
  id: string
  file: File
  schema: any
  uploading: boolean
  error?: string
}

/* ─── Main component ─── */

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
  const [sourceFiles, setSourceFiles] = useState<FileEntry[]>([])
  const [targetFile, setTargetFile] = useState<FileEntry | null>(null)

  // Abort/cleanup tracking for in-flight requests
  const cancelledIds = useRef<Set<string>>(new Set())

  const queryClient = useQueryClient()
  const { data: connectionsData } = useQuery({
    queryKey: ['connections'],
    queryFn: () => connectionsApi.list()
  })

  const connections = connectionsData?.data || []
  const sourceConnections = connections.filter((c: any) => c.connection_type === 'source')
  const targetConnections = connections.filter((c: any) => c.connection_type === 'target')
  const llmConnections = connections.filter((c: any) => c.connection_type === 'llm')

  const cancelId = useCallback((id: string) => {
    cancelledIds.current.add(id)
  }, [])

  const isCancelled = useCallback((id: string) => {
    return cancelledIds.current.has(id)
  }, [])

  const handleSourceFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const newEntries: FileEntry[] = files.map(file => {
      if (file.size > MAX_FILE_SIZE) {
        return { id: generateId(), file, schema: null, uploading: false, error: 'File exceeds 10MB limit' }
      }
      return { id: generateId(), file, schema: null, uploading: true }
    })

    setSourceFiles(prev => [...prev, ...newEntries])

    for (const entry of newEntries) {
      if (entry.error) continue // skip oversized files

      try {
        const response = await filesApi.extractSchema(entry.file)
        if (isCancelled(entry.id)) continue
        setSourceFiles(prev => {
          const idx = prev.findIndex(f => f.id === entry.id)
          if (idx === -1) return prev
          const updated = [...prev]
          updated[idx] = { ...updated[idx], schema: response.data, uploading: false }
          return updated
        })
      } catch (err: any) {
        if (isCancelled(entry.id)) continue
        setSourceFiles(prev => {
          const idx = prev.findIndex(f => f.id === entry.id)
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

    if (file.size > MAX_FILE_SIZE) {
      const id = generateId()
      setTargetFile({ id, file, schema: null, uploading: false, error: 'File exceeds 10MB limit' })
      return
    }

    const id = generateId()
    setTargetFile({ id, file, schema: null, uploading: true })

    try {
      const response = await filesApi.extractSchema(file)
      if (isCancelled(id)) return
      setTargetFile({ id, file, schema: response.data, uploading: false })
    } catch (err: any) {
      if (isCancelled(id)) return
      setTargetFile({ id, file, schema: null, uploading: false, error: err.response?.data?.detail || 'Parse failed' })
    }
  }

  const removeSourceFile = (id: string) => {
    cancelId(id)
    setSourceFiles(prev => prev.filter(f => f.id !== id))
  }

  const removeTargetFile = () => {
    if (targetFile) cancelId(targetFile.id)
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
        // Send full schema response {source_name, columns}
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
      cancelledIds.current.clear()
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
        {/* Source */}
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            <span className="inline-flex items-center gap-1.5">
              <Database size={14} style={{ color: 'var(--cyan)' }} />
              Source
            </span>
          </label>
          <ModeToggle
            mode={sourceMode}
            onChange={setSourceMode}
            activeColorClass="cyan"
            fileLabel="Upload File(s)"
          />
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
                {sourceFiles.map(entry => (
                  <FileUploadEntry
                    key={entry.id}
                    entry={entry}
                    onRemove={() => removeSourceFile(entry.id)}
                    color="cyan"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Target */}
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            <span className="inline-flex items-center gap-1.5">
              <Database size={14} style={{ color: 'var(--success)' }} />
              Target
            </span>
          </label>
          <ModeToggle
            mode={targetMode}
            onChange={setTargetMode}
            activeColorClass="green"
            fileLabel="Upload File"
          />
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
                <div className="mt-2">
                  <FileUploadEntry
                    entry={targetFile}
                    onRemove={removeTargetFile}
                    color="success"
                  />
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
