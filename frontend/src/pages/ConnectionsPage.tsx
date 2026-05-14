import { useQueryClient } from '@tanstack/react-query'
import { ConnectionForm } from '../components/connections/ConnectionForm'
import { ConnectionList } from '../components/connections/ConnectionList'

export function ConnectionsPage() {
  const queryClient = useQueryClient()

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['connections'] })
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Connections</h2>
      <ConnectionForm onSuccess={handleSuccess} />
      <ConnectionList onDelete={handleSuccess} onEdit={(conn) => console.log('Edit', conn)} />
    </div>
  )
}
