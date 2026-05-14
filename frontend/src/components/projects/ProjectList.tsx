import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { projectsApi } from '../../services/api'
import { ArrowRight, FolderOpen, GitBranch, Database, Sparkles } from 'lucide-react'

const phaseIcons: Record<string, React.ReactNode> = {
  input: <Sparkles size={14} />,
  discovery: <Database size={14} />,
  propose: <GitBranch size={14} />,
  review: <GitBranch size={14} />,
  export: <ArrowRight size={14} />,
}

const phaseColors: Record<string, { bg: string; text: string }> = {
  input: { bg: 'var(--accent-soft)', text: 'var(--accent)' },
  discovery: { bg: 'var(--cyan-soft)', text: 'var(--cyan)' },
  propose: { bg: 'var(--warning-soft)', text: 'var(--warning)' },
  review: { bg: 'var(--warning-soft)', text: 'var(--warning)' },
  export: { bg: 'var(--success-soft)', text: 'var(--success)' },
}

const statusColors: Record<string, { bg: string; text: string }> = {
  active: { bg: 'var(--success-soft)', text: 'var(--success)' },
  completed: { bg: 'var(--accent-soft)', text: 'var(--accent)' },
  archived: { bg: 'var(--bg-surface-hover)', text: 'var(--text-muted)' },
}

export function ProjectList() {
  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list()
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3" style={{ color: 'var(--text-muted)' }}>
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Loading projects...
        </div>
      </div>
    )
  }

  const projects = data?.data || []

  if (projects.length === 0) {
    return (
      <div
        className="card p-12 text-center"
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: 'var(--accent-soft)' }}
        >
          <FolderOpen size={28} style={{ color: 'var(--accent)' }} />
        </div>
        <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          No projects yet
        </h3>
        <p className="text-sm mb-6 max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
          Create your first mapping project to start discovering schemas and generating data mappings.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project: any) => {
        const phaseStyle = phaseColors[project.current_phase] || phaseColors.input
        const statusStyle = statusColors[project.status] || statusColors.active
        return (
          <Link
            key={project.id}
            to={`/projects/${project.id}`}
            className="card card-glow p-5 group"
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'var(--accent-soft)' }}
              >
                <FolderOpen size={20} style={{ color: 'var(--accent)' }} />
              </div>
              <ArrowRight
                size={18}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: 'var(--text-muted)' }}
              />
            </div>

            <h3 className="font-semibold text-base mb-1" style={{ color: 'var(--text-primary)' }}>
              {project.name}
            </h3>
            <p className="text-sm mb-4 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
              {project.description || 'No description'}
            </p>

            <div className="flex items-center gap-2">
              <span
                className="badge"
                style={{
                  backgroundColor: phaseStyle.bg,
                  color: phaseStyle.text,
                }}
              >
                {phaseIcons[project.current_phase]}
                <span className="capitalize">{project.current_phase}</span>
              </span>
              <span
                className="badge"
                style={{
                  backgroundColor: statusStyle.bg,
                  color: statusStyle.text,
                }}
              >
                <span className="capitalize">{project.status}</span>
              </span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
