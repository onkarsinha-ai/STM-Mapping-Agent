import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { mappingsApi, exportApi } from '../../services/api'
import { Check, X, Filter, FileSpreadsheet, Loader2, Sparkles, ArrowUp, ArrowDown } from 'lucide-react'
import { ReviewChatDrawer } from './ReviewChatDrawer'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'proposed', label: 'Proposed' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
]

const statusStyles: Record<string, { bg: string; text: string }> = {
  approved: { bg: 'var(--success-soft)', text: 'var(--success)' },
  rejected: { bg: 'var(--error-soft)', text: 'var(--error)' },
  modified: { bg: 'var(--accent-soft)', text: 'var(--accent)' },
  proposed: { bg: 'var(--bg-surface-hover)', text: 'var(--text-muted)' },
}

function confidenceStyle(score: number) {
  if (score > 0.8) return { bg: 'var(--success-soft)', text: 'var(--success)' }
  if (score > 0.5) return { bg: 'var(--warning-soft)', text: 'var(--warning)' }
  return { bg: 'var(--error-soft)', text: 'var(--error)' }
}

export function MappingTable({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('all')
  const [exporting, setExporting] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  const handleSort = (key: string) => {
    setSort(prev => {
      if (prev?.key === key) {
        return prev.direction === 'asc' ? { key, direction: 'desc' } : null
      }
      return { key, direction: 'asc' }
    })
  }

  const sortMappings = (mappings: any[]) => {
    if (!sort) return mappings
    const { key, direction } = sort
    const dir = direction === 'asc' ? 1 : -1
    return [...mappings].sort((a, b) => {
      let va: string | number = ''
      let vb: string | number = ''
      if (key === 'target') {
        va = `${a.target_table}.${a.target_column}`.toLowerCase()
        vb = `${b.target_table}.${b.target_column}`.toLowerCase()
      } else if (key === 'source') {
        va = a.source_table ? `${a.source_table}.${a.source_column}`.toLowerCase() : ''
        vb = b.source_table ? `${b.source_table}.${b.source_column}`.toLowerCase() : ''
      } else if (key === 'confidence') {
        va = a.confidence_score || 0
        vb = b.confidence_score || 0
      } else if (key === 'status') {
        va = (a.status || '').toLowerCase()
        vb = (b.status || '').toLowerCase()
      }
      if (va < vb) return -1 * dir
      if (va > vb) return 1 * dir
      return 0
    })
  }

  const { data, isLoading } = useQuery({
    queryKey: ['mappings', projectId],
    queryFn: () => mappingsApi.list(projectId)
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3" style={{ color: 'var(--text-muted)' }}>
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Loading mappings...
        </div>
      </div>
    )
  }

  const mappings = data?.data || []
  const filtered = sortMappings(
    filter === 'all' ? mappings : mappings.filter((m: any) => m.status === filter)
  )

  const handleAction = async (mappingId: string, action: string) => {
    await mappingsApi.update(mappingId, { status: action })
    queryClient.invalidateQueries({ queryKey: ['mappings', projectId] })
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await exportApi.download(projectId)
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `stm_mapping_${projectId}.xlsx`
      a.click()
    } catch (e) {
      alert('Export failed')
    }
    setExporting(false)
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter size={16} style={{ color: 'var(--text-muted)' }} />
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: filter === f.key ? 'var(--accent-soft)' : 'transparent',
                color: filter === f.key ? 'var(--accent)' : 'var(--text-muted)',
                boxShadow: filter === f.key ? 'inset 0 0 0 1px rgba(59,130,246,0.2)' : 'none',
              }}
            >
              {f.label}
              <span
                className="ml-1.5 text-xs px-1.5 py-0.5 rounded-md"
                style={{
                  backgroundColor: filter === f.key ? 'rgba(59,130,246,0.15)' : 'var(--bg-surface-hover)',
                }}
              >
                {f.key === 'all' ? mappings.length : mappings.filter((m: any) => m.status === f.key).length}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDrawerOpen(true)}
            className="btn-secondary flex items-center gap-1.5"
          >
            <Sparkles size={16} />
            AI Review Assistant
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="btn-primary"
          >
            {exporting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <FileSpreadsheet size={16} />
                Export Excel
              </>
            )}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
          <table className="table-dark" style={{ minWidth: '900px' }}>
          <thead>
            <tr>
              <th className="cursor-pointer select-none" onClick={() => handleSort('target')}>
                <span className="inline-flex items-center gap-1">
                  Target
                  {sort?.key === 'target' && (
                    sort.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                  )}
                </span>
              </th>
              <th className="cursor-pointer select-none" onClick={() => handleSort('source')}>
                <span className="inline-flex items-center gap-1">
                  Source
                  {sort?.key === 'source' && (
                    sort.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                  )}
                </span>
              </th>
              <th>Logic</th>
              <th className="w-24 cursor-pointer select-none" onClick={() => handleSort('confidence')}>
                <span className="inline-flex items-center gap-1">
                  Confidence
                  {sort?.key === 'confidence' && (
                    sort.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                  )}
                </span>
              </th>
              <th className="w-24 cursor-pointer select-none" onClick={() => handleSort('status')}>
                <span className="inline-flex items-center gap-1">
                  Status
                  {sort?.key === 'status' && (
                    sort.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                  )}
                </span>
              </th>
              <th className="w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((mapping: any) => {
              const confStyle = confidenceStyle(mapping.confidence_score || 0)
              const statusStyle = statusStyles[mapping.status] || statusStyles.proposed
              return (
                <tr key={mapping.id}>
                  <td>
                    <div className="font-medium schema-node" style={{ color: 'var(--text-primary)' }}>
                      {mapping.target_column}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {mapping.target_table}
                    </div>
                  </td>
                  <td>
                    {mapping.source_table ? (
                      <div>
                        <div className="font-medium schema-node" style={{ color: 'var(--text-primary)' }}>
                          {mapping.source_column}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {mapping.source_table}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>-</span>
                    )}
                  </td>
                  <td>
                    <div className="max-w-xs truncate text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {mapping.business_logic || '-'}
                    </div>
                  </td>
                  <td>
                    <span
                      className="badge"
                      style={{ backgroundColor: confStyle.bg, color: confStyle.text }}
                    >
                      {Math.round((mapping.confidence_score || 0) * 100)}%
                    </span>
                  </td>
                  <td>
                    <span
                      className="badge capitalize"
                      style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
                    >
                      {mapping.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleAction(mapping.id, 'approved')}
                        className="p-1.5 rounded-md transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--success)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                        title="Approve"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => handleAction(mapping.id, 'rejected')}
                        className="p-1.5 rounded-md transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--error)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                        title="Reject"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              No mappings match the selected filter.
            </p>
          </div>
        )}
      </div>

      <ReviewChatDrawer
        projectId={projectId}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  )
}
