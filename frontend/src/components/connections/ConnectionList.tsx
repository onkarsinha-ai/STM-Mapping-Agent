import { useQuery } from '@tanstack/react-query'
import { connectionsApi } from '../../services/api'
import { Trash2, CheckCircle, XCircle } from 'lucide-react'

export function ConnectionList({ onDelete }: { onDelete: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['connections'],
    queryFn: () => connectionsApi.list()
  })

  if (isLoading) return <div>Loading...</div>

  const connections = data?.data || []

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-700">Name</th>
            <th className="px-4 py-3 text-left font-medium text-gray-700">Type</th>
            <th className="px-4 py-3 text-left font-medium text-gray-700">DB Type</th>
            <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
            <th className="px-4 py-3 text-left font-medium text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {connections.map((conn: any) => (
            <tr key={conn.id} className="border-b border-gray-100">
              <td className="px-4 py-3 font-medium">{conn.name}</td>
              <td className="px-4 py-3 capitalize">{conn.connection_type}</td>
              <td className="px-4 py-3">{conn.db_type || '-'}</td>
              <td className="px-4 py-3">
                {conn.is_tested ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle size={16} /> Tested
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-gray-400">
                    <XCircle size={16} /> Untested
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                <button onClick={async () => {
                  await connectionsApi.delete(conn.id)
                  onDelete()
                }} className="text-red-600 hover:text-red-800">
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
