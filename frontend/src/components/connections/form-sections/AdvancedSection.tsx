interface AdvancedSectionProps {
  dbType: string
  params: Record<string, any>
  onParamsChange: (params: Record<string, any>) => void
}

export function AdvancedSection({ dbType, params, onParamsChange }: AdvancedSectionProps) {
  const updateParam = (key: string, value: any) => {
    onParamsChange({ ...params, [key]: value })
  }

  const renderAdvanced = () => {
    switch (dbType) {
      case 'postgresql':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>SSL Mode</label>
              <select value={params.ssl_mode || 'prefer'} onChange={e => updateParam('ssl_mode', e.target.value)} className="input-dark w-full">
                <option value="disable">disable</option>
                <option value="allow">allow</option>
                <option value="prefer">prefer</option>
                <option value="require">require</option>
                <option value="verify-ca">verify-ca</option>
                <option value="verify-full">verify-full</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Connection Timeout</label>
              <input type="text" value={params.timeout || ''} onChange={e => updateParam('timeout', e.target.value)} className="input-dark w-full" placeholder="30" />
            </div>
          </div>
        )
      case 'mysql':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={params.ssl || false} onChange={e => updateParam('ssl', e.target.checked)} className="rounded" />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Enable SSL</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Connection Timeout</label>
              <input type="text" value={params.timeout || ''} onChange={e => updateParam('timeout', e.target.value)} className="input-dark w-full" placeholder="30" />
            </div>
          </div>
        )
      case 'snowflake':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Role</label>
              <input type="text" value={params.role || ''} onChange={e => updateParam('role', e.target.value)} className="input-dark w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Login Timeout</label>
              <input type="text" value={params.login_timeout || ''} onChange={e => updateParam('login_timeout', e.target.value)} className="input-dark w-full" placeholder="60" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Query Timeout</label>
              <input type="text" value={params.query_timeout || ''} onChange={e => updateParam('query_timeout', e.target.value)} className="input-dark w-full" placeholder="0" />
            </div>
          </div>
        )
      case 'bigquery':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Priority</label>
              <select value={params.priority || 'INTERACTIVE'} onChange={e => updateParam('priority', e.target.value)} className="input-dark w-full">
                <option value="INTERACTIVE">INTERACTIVE</option>
                <option value="BATCH">BATCH</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer mt-6">
                <input type="checkbox" checked={params.use_query_cache !== false} onChange={e => updateParam('use_query_cache', e.target.checked)} className="rounded" />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Use Query Cache</span>
              </label>
            </div>
          </div>
        )
      case 'csv':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={params.header_row !== false} onChange={e => updateParam('header_row', e.target.checked)} className="rounded" />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Header Row</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Skip Rows</label>
              <input type="text" value={params.skip_rows || ''} onChange={e => updateParam('skip_rows', e.target.value)} className="input-dark w-full" placeholder="0" />
            </div>
          </div>
        )
      case 'parquet':
        return (
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Compression</label>
            <select value={params.compression || 'snappy'} onChange={e => updateParam('compression', e.target.value)} className="input-dark w-full">
              <option value="snappy">snappy</option>
              <option value="gzip">gzip</option>
              <option value="brotli">brotli</option>
              <option value="zstd">zstd</option>
              <option value="lz4">lz4</option>
              <option value="none">none</option>
            </select>
          </div>
        )
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Connection Timeout</label>
              <input type="text" value={params.timeout || ''} onChange={e => updateParam('timeout', e.target.value)} className="input-dark w-full" placeholder="30" />
            </div>
          </div>
        )
    }
  }

  return (
    <div className="mb-6">
      <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Advanced Options</h4>
      {renderAdvanced()}
    </div>
  )
}
