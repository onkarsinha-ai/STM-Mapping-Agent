import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ProjectWizard } from '../components/projects/ProjectWizard'
import { ProjectList } from '../components/projects/ProjectList'
import { Plus, FolderKanban } from 'lucide-react'

export function Dashboard() {
  const queryClient = useQueryClient()
  const [showWizard, setShowWizard] = useState(false)

  const handleDelete = () => {
    queryClient.invalidateQueries({ queryKey: ['projects'] })
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
            <FolderKanban size={20} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              Projects
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Manage your data mapping projects
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowWizard(!showWizard)}
          className="btn-primary"
        >
          <Plus size={16} />
          {showWizard ? 'Cancel' : 'New Project'}
        </button>
      </div>

      {/* Wizard */}
      {showWizard && (
        <div className="animate-slide-up mb-8">
          <ProjectWizard onCreated={() => setShowWizard(false)} />
        </div>
      )}

      {/* Project List */}
      <ProjectList onDelete={handleDelete} />
    </div>
  )
}
