import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { projectsApi, discoveryApi } from '../services/api'
import { SchemaBrowser } from '../components/schema/SchemaBrowser'
import { MappingTable } from '../components/mappings/MappingTable'

const PHASES = ['input', 'discovery', 'propose', 'review', 'export']

export function ProjectPage() {
  const { id } = useParams<{ id: string }>()

  const { data: projectData } = useQuery({
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

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">{project?.name}</h2>
        <p className="text-gray-500">{project?.description}</p>
      </div>

      {/* Phase Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {PHASES.map((p, i) => (
          <div key={p} className="flex items-center gap-2">
            <div className={`px-3 py-1 rounded-full text-sm capitalize ${
              p === phase ? 'bg-blue-600 text-white' :
              phaseIndex > i ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {p}
            </div>
            {i < 4 && <div className="w-8 h-px bg-gray-300" />}
          </div>
        ))}
      </div>

      {phase === 'input' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Ready to Discover</h3>
          <p className="text-gray-600 mb-4">Source and target connections are configured. Click below to start schema discovery.</p>
          <button onClick={handleDiscover}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Start Discovery
          </button>
        </div>
      )}

      {phase === 'discovery' && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Schema Discovery</h3>
          <SchemaBrowser schema={schema} />
        </div>
      )}

      {(phase === 'propose' || phase === 'review') && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Review Mappings</h3>
          <MappingTable projectId={id!} />
        </div>
      )}

      {phase === 'export' && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Export</h3>
          <MappingTable projectId={id!} />
        </div>
      )}
    </div>
  )
}
