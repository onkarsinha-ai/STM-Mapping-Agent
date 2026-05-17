import { useState, useMemo, memo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { connectionsApi } from '../../services/api'
import { Trash2, Database, Server, Link2, Sparkles, Pencil, Play } from 'lucide-react'

const typeIcons: Record<string, React.ReactNode> = {
  source: <Database size={16} style={{ color: 'var(--cyan)' }} />,
  target: <Database size={16} style={{ color: 'var(--success)' }} />,
  database: <Database size={16} style={{ color: 'var(--accent)' }} />,
  jira: <Link2 size={16} style={{ color: 'var(--warning)' }} />,
  llm: <Sparkles size={16} style={{ color: 'var(--accent)' }} />,
}

const typeColors: Record<string, { bg: string }> = {
  source: { bg: 'var(--cyan-soft)' },
  target: { bg: 'var(--success-soft)' },
  database: { bg: 'var(--accent-soft)' },
  jira: { bg: 'var(--warning-soft)' },
  llm: { bg: 'var(--accent-soft)' },
}

type FilterType = 'all' | 'database' | 'llm' | 'jira'

const FILTERS: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'database', label: 'Databases' },
  { id: 'llm', label: 'LLMs' },
  { id: 'jira', label: 'Jira' },
]

function ConnectionListInner({ onDelete, onEdit }: { onDelete: () => void; onEdit?: (conn: any) => void }) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteResult, setDeleteResult] = useState<{ id: string; success: boolean; message: string } | null>(null)
  const { data, isLoading } = useQuery({
    queryKey: ['connections'],
    queryFn: () => connectionsApi.list(),
    staleTime: 60000
  })

  const connections = data?.data || []

  const filtered = useMemo(() => {
    return filter === 'all'
      ? connections
      : filter === 'database'
        ? connections.filter((c: any) => c.connection_type === 'source' || c.connection_type === 'target' || c.connection_type === 'database')
        : connections.filter((c: any) => c.connection_type === filter)
  }, [connections, filter])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3" style={{ color: 'var(--text-muted)' }}>
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Loading connections...
        </div>
      </div>
    )
  }

  if (connections.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--accent-soft)' }}>
          <Server size={28} style={{ color: 'var(--accent)' }} />
        </div>
        <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>No connections yet</h3>
        <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
          Add your first database, LLM, or Jira connection to start building mapping projects.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === f.id
                ? 'text-white'
                : 'hover:bg-gray-100'
            }`}
            style={filter === f.id ? { backgroundColor: 'var(--accent)' } : { color: 'var(--text-secondary)' }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="table-dark">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Flavor</th>
              <th className="w-24"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((conn: any) => {
              const typeStyle = typeColors[conn.connection_type] || typeColors.source
              const flavor = conn.provider || conn.db_type || conn.connection_type
              return (
                <tr key={conn.id}>
                  <td className="font-medium">{conn.name}</td>
                  <td>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: typeStyle.bg }}>
                        {typeIcons[conn.connection_type]}
                      </span>
                      <span className="capitalize">{conn.connection_type}</span>
                    </span>
                  </td>
                  <td>
                    <span className="px-2 py-0.5 rounded text-xs font-medium capitalize" style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}>
                      {flavor}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={async () => {
                          setTestingId(conn.id)
                          setTestResult(null)
                          try {
                            const res = await connectionsApi.testById(conn.id)
                            setTestResult({ id: conn.id, success: res.data.success, message: res.data.message })
                          } catch (err: any) {
                            setTestResult({ id: conn.id, success: false, message: err.response?.data?.detail || 'Test failed' })
                          } finally {
                            setTestingId(null)
                          }
                        }}
                        disabled={testingId === conn.id}
                        className="p-2 rounded-md transition-colors disabled:opacity-50"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--success)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                        title="Test connection"
                      >
                        {testingId === conn.id ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Play size={16} />
                        )}
                      </button>
                      {testResult && testResult.id === conn.id && (
                        <span className={`text-xs ${testResult.success ? 'text-green-500' : 'text-red-500'}`}>
                          {testResult.success ? 'OK' : 'Failed'}
                        </span>
                      )}
                      {onEdit && (
                        <button
                          onClick={() => onEdit(conn)}
                          className="p-2 rounded-md transition-colors"
                          style={{ color: 'var(--text-muted)' }}
                          onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          if (!window.confirm('Are you sure you want to delete this connection?')) return
                          setDeletingId(conn.id)
                          setDeleteResult(null)
                          try {
                            await connectionsApi.delete(conn.id)
                            onDelete()
                            setDeleteResult({ id: conn.id, success: true, message: 'Deleted' })
                          } catch (err: any) {
                            setDeleteResult({ id: conn.id, success: false, message: err.response?.data?.detail || 'Delete failed' })
                          } finally {
                            setDeletingId(null)
                          }
                        }}
                        disabled={deletingId === conn.id}
                        className="p-2 rounded-md transition-colors disabled:opacity-50"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--error)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                        title="Delete connection"
                      >
                        {deletingId === conn.id ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                      {deleteResult && deleteResult.id === conn.id && (
                        <span className={`text-xs ${deleteResult.success ? 'text-green-500' : 'text-red-500'}`}>
                          {deleteResult.message}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export const ConnectionList = memo(ConnectionListInner)
