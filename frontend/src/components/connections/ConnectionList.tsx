import { useState, useMemo, memo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { connectionsApi } from '../../services/api'
import { Trash2, CheckCircle, XCircle, Database, Server, Link2, Sparkles, Pencil } from 'lucide-react'

const typeIcons: Record<string, React.ReactNode> = {
  source: <Database size={16} style={{ color: 'var(--cyan)' }} />,
  target: <Database size={16} style={{ color: 'var(--success)' }} />,
  jira: <Link2 size={16} style={{ color: 'var(--warning)' }} />,
  llm: <Sparkles size={16} style={{ color: 'var(--accent)' }} />,
}

const typeColors: Record<string, { bg: string }> = {
  source: { bg: 'var(--cyan-soft)' },
  target: { bg: 'var(--success-soft)' },
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
        ? connections.filter((c: any) => c.connection_type === 'source' || c.connection_type === 'target')
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
              <th>Status</th>
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
                    {conn.is_tested ? (
                      <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: 'var(--success)' }}>
                        <CheckCircle size={14} /> Tested
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
                        <XCircle size={14} /> Untested
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
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
                          await connectionsApi.delete(conn.id)
                          onDelete()
                        }}
                        className="p-2 rounded-md transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--error)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                      >
                        <Trash2 size={16} />
                      </button>
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
