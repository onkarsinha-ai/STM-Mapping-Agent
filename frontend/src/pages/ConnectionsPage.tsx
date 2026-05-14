import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ConnectionForm } from '../components/connections/ConnectionForm'
import { ConnectionList } from '../components/connections/ConnectionList'
import { Database, Plus } from 'lucide-react'

export function ConnectionsPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['connections'] })
    setShowForm(false)
  }

  return (
    <div className="animate-slide-up max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--accent-soft)' }}
          >
            <Database size={20} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              Connections
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Manage database, LLM, and Jira connections
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary"
        >
          <Plus size={16} />
          {showForm ? 'Cancel' : 'Add Connection'}
        </button>
      </div>

      {showForm && (
        <div className="mb-8 animate-slide-up">
          <ConnectionForm onSuccess={handleSuccess} />
        </div>
      )}

      <ConnectionList onDelete={handleSuccess} />
    </div>
  )
}
