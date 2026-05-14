const DB_TYPES = [
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'sqlserver', label: 'SQL Server' },
  { value: 'oracle', label: 'Oracle' },
  { value: 'snowflake', label: 'Snowflake' },
  { value: 'bigquery', label: 'BigQuery' },
  { value: 'csv', label: 'CSV' },
  { value: 'parquet', label: 'Parquet' },
]

interface ConnectionSectionProps {
  dbType: string
  params: Record<string, any>
  onDbTypeChange: (dbType: string) => void
  onParamsChange: (params: Record<string, any>) => void
}

export function ConnectionSection({ dbType, params, onDbTypeChange, onParamsChange }: ConnectionSectionProps) {
  const updateParam = (key: string, value: any) => {
    onParamsChange({ ...params, [key]: value })
  }

  const renderFields = () => {
    switch (dbType) {
      case 'postgresql':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Host</label>
                <input type="text" value={params.host || ''} onChange={e => updateParam('host', e.target.value)} className="input-dark w-full" placeholder="localhost" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Port</label>
                <input type="text" value={params.port || ''} onChange={e => updateParam('port', e.target.value)} className="input-dark w-full" placeholder="5432" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Database <span style={{ color: 'var(--error)' }}>*</span></label>
                <input type="text" value={params.database || ''} onChange={e => updateParam('database', e.target.value)} className="input-dark w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Schema</label>
                <input type="text" value={params.schema || ''} onChange={e => updateParam('schema', e.target.value)} className="input-dark w-full" placeholder="public" />
              </div>
            </div>
          </>
        )
      case 'mysql':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Host</label>
                <input type="text" value={params.host || ''} onChange={e => updateParam('host', e.target.value)} className="input-dark w-full" placeholder="localhost" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Port</label>
                <input type="text" value={params.port || ''} onChange={e => updateParam('port', e.target.value)} className="input-dark w-full" placeholder="3306" />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Database <span style={{ color: 'var(--error)' }}>*</span></label>
              <input type="text" value={params.database || ''} onChange={e => updateParam('database', e.target.value)} className="input-dark w-full" />
            </div>
          </>
        )
      case 'snowflake':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Account <span style={{ color: 'var(--error)' }}>*</span></label>
                <input type="text" value={params.account || ''} onChange={e => updateParam('account', e.target.value)} className="input-dark w-full" placeholder="xy12345.us-east-1" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Warehouse <span style={{ color: 'var(--error)' }}>*</span></label>
                <input type="text" value={params.warehouse || ''} onChange={e => updateParam('warehouse', e.target.value)} className="input-dark w-full" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Database <span style={{ color: 'var(--error)' }}>*</span></label>
                <input type="text" value={params.database || ''} onChange={e => updateParam('database', e.target.value)} className="input-dark w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Schema <span style={{ color: 'var(--error)' }}>*</span></label>
                <input type="text" value={params.schema || ''} onChange={e => updateParam('schema', e.target.value)} className="input-dark w-full" />
              </div>
            </div>
          </>
        )
      case 'bigquery':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Project ID <span style={{ color: 'var(--error)' }}>*</span></label>
                <input type="text" value={params.project_id || ''} onChange={e => updateParam('project_id', e.target.value)} className="input-dark w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Dataset <span style={{ color: 'var(--error)' }}>*</span></label>
                <input type="text" value={params.dataset || ''} onChange={e => updateParam('dataset', e.target.value)} className="input-dark w-full" />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Location</label>
              <input type="text" value={params.location || ''} onChange={e => updateParam('location', e.target.value)} className="input-dark w-full" placeholder="US" />
            </div>
          </>
        )
      case 'csv':
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>File Path / URL <span style={{ color: 'var(--error)' }}>*</span></label>
              <input type="text" value={params.file_path || ''} onChange={e => updateParam('file_path', e.target.value)} className="input-dark w-full" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Delimiter</label>
                <input type="text" value={params.delimiter || ''} onChange={e => updateParam('delimiter', e.target.value)} className="input-dark w-full" placeholder="," />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Encoding</label>
                <input type="text" value={params.encoding || ''} onChange={e => updateParam('encoding', e.target.value)} className="input-dark w-full" placeholder="utf-8" />
              </div>
            </div>
          </>
        )
      case 'parquet':
        return (
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>File Path / URL <span style={{ color: 'var(--error)' }}>*</span></label>
            <input type="text" value={params.file_path || ''} onChange={e => updateParam('file_path', e.target.value)} className="input-dark w-full" />
          </div>
        )
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Host</label>
              <input type="text" value={params.host || ''} onChange={e => updateParam('host', e.target.value)} className="input-dark w-full" placeholder="localhost" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Port</label>
              <input type="text" value={params.port || ''} onChange={e => updateParam('port', e.target.value)} className="input-dark w-full" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Database <span style={{ color: 'var(--error)' }}>*</span></label>
              <input type="text" value={params.database || ''} onChange={e => updateParam('database', e.target.value)} className="input-dark w-full" />
            </div>
          </div>
        )
    }
  }

  return (
    <div className="mb-6">
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
          Database Type <span style={{ color: 'var(--error)' }}>*</span>
        </label>
        <select
          value={dbType}
          onChange={e => onDbTypeChange(e.target.value)}
          className="input-dark w-full"
        >
          {DB_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>
      {renderFields()}
    </div>
  )
}
