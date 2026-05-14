import { useState } from 'react'
import { ProjectWizard } from '../components/projects/ProjectWizard'
import { ProjectList } from '../components/projects/ProjectList'

export function Dashboard() {
  const [showWizard, setShowWizard] = useState(false)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Projects</h2>
        <button
          onClick={() => setShowWizard(!showWizard)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {showWizard ? 'Cancel' : 'New Project'}
        </button>
      </div>

      {showWizard && (
        <ProjectWizard onCreated={() => setShowWizard(false)} />
      )}

      <ProjectList />
    </div>
  )
}
