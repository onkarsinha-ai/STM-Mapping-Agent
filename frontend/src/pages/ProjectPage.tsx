import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { projectsApi, discoveryApi } from '../services/api'
import { SchemaBrowser } from '../components/schema/SchemaBrowser'
import { MappingTable } from '../components/mappings/MappingTable'
import { ArrowLeft, FolderOpen, Play } from 'lucide-react'

const PHASES = ['input', 'discovery', 'propose', 'review', 'export']
const PHASE_LABELS: Record<string, string> = {
  input: 'Configure',
  discovery: 'Discovery',
  propose: 'Propose',
  review: 'Review',
  export: 'Export'
}

export function ProjectPage() {
  const { id } = useParams<{ id: string }>()

  const { data: projectData, isLoading: projectLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id!)
  })

  const { data: schemaData } = useQuery({
    queryKey: ['schema', id],
    queryFn: () => discoveryApi.getSchema(id!),
    enabled: !!id
  })

  const project = projectData?.data
  const schema = schemaData?.data || {}
  const phase = project?.current_phase || 'input'
  const phaseIndex = PHASES.indexOf(phase)

  const handleDiscover = async () => {
    await discoveryApi.discover(id!)
    window.location.reload()
  }

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3" style={{ color: 'var(--text-muted)' }}>
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Loading project...
        </div>
      </div>
    )
  }

  return (
    <div className="animate-slide-up max-w-6xl mx-auto">
      {/* Back + Title */}
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm mb-4 transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <ArrowLeft size={14} />
          Back to Projects
        </Link>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--accent-soft)' }}
          >
            <FolderOpen size={20} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              {project?.name}
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {project?.description || 'No description'}
            </p>
          </div>
        </div>
      </div>

      {/* Phase Stepper */}
      <div className="card p-5 mb-8">
        <div className="flex items-center justify-center">
          {PHASES.map((p, i) => {
            const isCompleted = phaseIndex > i
            const isCurrent = p === phase

            return (
              <div key={p} className="flex items-center">
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`phase-step ${isCompleted ? 'completed' : isCurrent ? 'current' : 'pending'}`}
                  >
                    {isCompleted ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <span>{i + 1}</span>
                    )}
                  </div>
                  <span
                    className="text-xs font-medium capitalize"
                    style={{
                      color: isCurrent ? 'var(--accent)' : isCompleted ? 'var(--success)' : 'var(--text-muted)'
                    }}
                  >
                    {PHASE_LABELS[p]}
                  </span>
                </div>
                {i < 4 && (
                  <div
                    className={`phase-connector mx-2 ${isCompleted ? 'active' : ''}`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Phase Content */}
      {phase === 'input' && (
        <div className="card p-8 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: 'var(--accent-soft)' }}
          >
            <Play size={28} style={{ color: 'var(--accent)' }} />
          </div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            Ready to Discover
          </h3>
          <p className="text-sm max-w-md mx-auto mb-6" style={{ color: 'var(--text-muted)' }}>
            Source and target connections are configured. Click below to start schema discovery and let the LLM analyze your database structure.
          </p>
          <button onClick={handleDiscover} className="btn-primary animate-pulse-glow">
            <Play size={16} />
            Start Discovery
          </button>
        </div>
      )}

      {phase === 'discovery' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Schema Discovery
            </h3>
            <span className="badge" style={{ backgroundColor: 'var(--cyan-soft)', color: 'var(--cyan)' }}>
              Live
            </span>
          </div>
          <SchemaBrowser schema={schema} />
        </div>
      )}

      {(phase === 'propose' || phase === 'review') && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Review Mappings
            </h3>
            <span className="badge" style={{ backgroundColor: 'var(--warning-soft)', color: 'var(--warning)' }}>
              Review Required
            </span>
          </div>
          <MappingTable projectId={id!} />
        </div>
      )}

      {phase === 'export' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Export Mappings
            </h3>
            <span className="badge" style={{ backgroundColor: 'var(--success-soft)', color: 'var(--success)' }}>
              Ready
            </span>
          </div>
          <MappingTable projectId={id!} />
        </div>
      )}
    </div>
  )
}
