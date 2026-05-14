import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { mappingsApi, exportApi } from '../../services/api'
import { Check, X, Download } from 'lucide-react'

export function MappingTable({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['mappings', projectId],
    queryFn: () => mappingsApi.list(projectId)
  })

  if (isLoading) return <div>Loading mappings...</div>

  const mappings = data?.data || []
  const filtered = filter === 'all' ? mappings : mappings.filter((m: any) => m.status === filter)

  const handleAction = async (mappingId: string, action: string) => {
    await mappingsApi.update(mappingId, { status: action })
    queryClient.invalidateQueries({ queryKey: ['mappings', projectId] })
  }

  const handleExport = async () => {
    const res = await exportApi.download(projectId)
    const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stm_mapping_${projectId}.xlsx`
    a.click()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {['all', 'proposed', 'approved', 'rejected'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-sm capitalize ${
                filter === f ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {f} ({f === 'all' ? mappings.length : mappings.filter((m: any) => m.status === f).length})
            </button>
          ))}
        </div>
        <button onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
          <Download size={16} />
          Export Excel
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Target</th>
              <th className="px-4 py-3 text-left font-medium">Source</th>
              <th className="px-4 py-3 text-left font-medium">Business Logic</th>
              <th className="px-4 py-3 text-left font-medium">Confidence</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((mapping: any) => (
              <tr key={mapping.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium">{mapping.target_table}.{mapping.target_column}</div>
                </td>
                <td className="px-4 py-3">
                  {mapping.source_table ? `${mapping.source_table}.${mapping.source_column}` : '-'}
                </td>
                <td className="px-4 py-3 max-w-xs truncate">{mapping.business_logic || '-'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    (mapping.confidence_score || 0) > 0.8 ? 'bg-green-100 text-green-700' :
                    (mapping.confidence_score || 0) > 0.5 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {Math.round((mapping.confidence_score || 0) * 100)}%
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs capitalize ${
                    mapping.status === 'approved' ? 'bg-green-100 text-green-700' :
                    mapping.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    mapping.status === 'modified' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {mapping.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => handleAction(mapping.id, 'approved')}
                      className="p-1 text-green-600 hover:bg-green-50 rounded">
                      <Check size={16} />
                    </button>
                    <button onClick={() => handleAction(mapping.id, 'rejected')}
                      className="p-1 text-red-600 hover:bg-red-50 rounded">
                      <X size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
