import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { projectsApi } from '../../services/api'
import { ArrowRight, FolderOpen } from 'lucide-react'

export function ProjectList() {
  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list()
  })

  if (isLoading) return <div>Loading projects...</div>

  const projects = data?.data || []

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project: any) => (
        <Link
          key={project.id}
          to={`/projects/${project.id}`}
          className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <FolderOpen size={18} className="text-blue-600" />
              <h3 className="font-semibold text-gray-900">{project.name}</h3>
            </div>
            <ArrowRight size={16} className="text-gray-400" />
          </div>
          <p className="text-sm text-gray-500 mb-3">{project.description || 'No description'}</p>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full capitalize">
              {project.current_phase}
            </span>
            <span className="px-2 py-1 bg-gray-50 text-gray-600 text-xs rounded-full capitalize">
              {project.status}
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}
