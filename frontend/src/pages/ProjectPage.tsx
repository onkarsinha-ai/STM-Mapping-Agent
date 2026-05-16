import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { projectsApi, discoveryApi, proposeApi } from '../services/api'
import { SchemaBrowser } from '../components/schema/SchemaBrowser'
import { MappingTable } from '../components/mappings/MappingTable'
import { ArrowLeft, FolderOpen, Play, Sparkles, Loader2 } from 'lucide-react'

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
  const queryClient = useQueryClient()

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

  const [proposing, setProposing] = useState(false)

  const handleDiscover = async () => {
    await discoveryApi.discover(id!)
    queryClient.invalidateQueries({ queryKey: ['project', id] })
    queryClient.invalidateQueries({ queryKey: ['schema', id] })
  }

  const handlePropose = async () => {
    setProposing(true)
    try {
      await proposeApi.generate(id!)
      queryClient.invalidateQueries({ queryKey: ['project', id] })
      queryClient.invalidateQueries({ queryKey: ['mappings', id] })
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to generate proposals')
    }
    setProposing(false)
  }

  const handlePhaseChange = async (phase: string) => {
    await projectsApi.updatePhase(id!, phase)
    queryClient.invalidateQueries({ queryKey: ['project', id] })
  }

  // Phase guard: only allow clicking phases that have been reached
  const canReachPhase = (targetPhase: string) => {
    const targetIndex = PHASES.indexOf(targetPhase)
    const currentIndex = PHASES.indexOf(phase)
    return targetIndex <= currentIndex + 1
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
                    className={`phase-step ${isCompleted ? 'completed' : isCurrent ? 'current' : 'pending'} ${canReachPhase(p) ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-50'} transition-opacity`}
                    onClick={() => canReachPhase(p) && handlePhaseChange(p)}
                    role="button"
                    tabIndex={canReachPhase(p) ? 0 : -1}
                    onKeyDown={(e) => { if (canReachPhase(p) && (e.key === 'Enter' || e.key === ' ')) handlePhaseChange(p) }}
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
            <div className="flex items-center gap-3">
              <span className="badge" style={{ backgroundColor: 'var(--cyan-soft)', color: 'var(--cyan)' }}>
                Live
              </span>
              <button
                onClick={handlePropose}
                disabled={proposing || Object.keys(schema).length === 0}
                className="btn-primary"
              >
                {proposing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Generate Proposals
                  </>
                )}
              </button>
            </div>
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
