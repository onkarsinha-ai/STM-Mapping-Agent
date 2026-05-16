import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { mappingsApi, exportApi } from '../../services/api'
import { Check, X, Filter, FileSpreadsheet, Loader2 } from 'lucide-react'

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
  const filtered = filter === 'all' ? mappings : mappings.filter((m: any) => m.status === filter)

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

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
          <table className="table-dark" style={{ minWidth: '900px' }}>
          <thead>
            <tr>
              <th>Target</th>
              <th>Source</th>
              <th>Logic</th>
              <th className="w-24">Confidence</th>
              <th className="w-24">Status</th>
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
                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {mapping.target_table}
                    </div>
                    <div className="text-xs schema-node" style={{ color: 'var(--cyan)' }}>
                      {mapping.target_column}
                    </div>
                  </td>
                  <td>
                    {mapping.source_table ? (
                      <div>
                        <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                          {mapping.source_table}
                        </div>
                        <div className="text-xs schema-node" style={{ color: 'var(--cyan)' }}>
                          {mapping.source_column}
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
    </div>
  )
}
