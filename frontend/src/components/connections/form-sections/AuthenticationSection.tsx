interface AuthenticationSectionProps {
  dbType: string
  params: Record<string, any>
  onParamsChange: (params: Record<string, any>) => void
}

export function AuthenticationSection({ dbType, params, onParamsChange }: AuthenticationSectionProps) {
  const updateParam = (key: string, value: any) => {
    onParamsChange({ ...params, [key]: value })
  }

  const renderAuth = () => {
    if (dbType === 'bigquery') {
      return (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Auth Method</label>
            <select
              value={params.auth_method || 'adc'}
              onChange={e => updateParam('auth_method', e.target.value)}
              className="input-dark w-full"
            >
              <option value="adc">Application Default Credentials</option>
              <option value="service_account">Service Account Key</option>
            </select>
          </div>
          {params.auth_method === 'service_account' && (
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Service Account JSON</label>
              <textarea
                value={params.service_account_json || ''}
                onChange={e => updateParam('service_account_json', e.target.value)}
                className="input-dark w-full h-24 font-mono text-xs"
                placeholder="Paste JSON key here"
              />
            </div>
          )}
        </>
      )
    }

    if (dbType === 'csv' || dbType === 'parquet') {
      return (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No authentication required for local files.</p>
      )
    }

    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Username <span style={{ color: 'var(--error)' }}>*</span></label>
            <input type="text" value={params.username || ''} onChange={e => updateParam('username', e.target.value)} className="input-dark w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Password <span style={{ color: 'var(--error)' }}>*</span></label>
            <input type="password" value={params.password || ''} onChange={e => updateParam('password', e.target.value)} className="input-dark w-full" />
          </div>
        </div>
        {dbType === 'sqlserver' && (
          <div className="mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={params.windows_auth || false}
                onChange={e => updateParam('windows_auth', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Use Windows Authentication</span>
            </label>
          </div>
        )}
        {dbType === 'snowflake' && (
          <div className="mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={params.auth_method === 'keypair'}
                onChange={e => updateParam('auth_method', e.target.checked ? 'keypair' : 'password')}
                className="rounded"
              />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Use Key-Pair Authentication</span>
            </label>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="mb-6">
      <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Authentication</h4>
      {renderAuth()}
    </div>
  )
}
