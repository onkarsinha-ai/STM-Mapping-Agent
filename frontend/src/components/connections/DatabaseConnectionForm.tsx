import { useState, useEffect } from 'react'
import { connectionsApi } from '../../services/api'
import { BasicSection } from './form-sections/BasicSection'
import { ConnectionSection } from './form-sections/ConnectionSection'
import { AuthenticationSection } from './form-sections/AuthenticationSection'
import { AdvancedSection } from './form-sections/AdvancedSection'
import { TestTube, Save, Loader2, CheckCircle, XCircle } from 'lucide-react'

const DEFAULT_PARAMS: Record<string, Record<string, any>> = {
  postgresql: { host: 'localhost', port: '5432', schema: 'public', ssl_mode: 'prefer', timeout: '30' },
  mysql: { host: 'localhost', port: '3306', charset: 'utf8mb4', timeout: '30' },
  sqlserver: { port: '1433', encrypt: true, trust_server_certificate: false, timeout: '15' },
  oracle: { port: '1521', timeout: '15' },
  snowflake: { login_timeout: '60', query_timeout: '0' },
  bigquery: { location: 'US', priority: 'INTERACTIVE', use_query_cache: true },
  csv: { delimiter: ',', encoding: 'utf-8', header_row: true },
  parquet: { compression: 'snappy' },
}

export function DatabaseConnectionForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [connectionType, setConnectionType] = useState('source')
  const [dbType, setDbType] = useState('postgresql')
  const [params, setParams] = useState<Record<string, any>>({ ...DEFAULT_PARAMS.postgresql })
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setParams({ ...DEFAULT_PARAMS[dbType] })
    setTestResult(null)
  }, [dbType])

  const getErrorMessage = (e: any): string => {
    const detail = e.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) return detail.map((d: any) => d.msg || String(d)).join(', ')
    if (detail) return JSON.stringify(detail)
    return e.message || 'Request failed'
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await connectionsApi.test({
        connection_type: connectionType,
        provider: dbType,
        db_type: dbType,
        params: { ...params, db_type: dbType }
      })
      setTestResult(res.data)
    } catch (e: any) {
      setTestResult({ success: false, message: getErrorMessage(e) })
    }
    setTesting(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await connectionsApi.create({
        name,
        connection_type: connectionType,
        db_type: dbType,
        provider: dbType,
        params: { ...params, db_type: dbType }
      })
      onSuccess()
      setName('')
      setDescription('')
      setTestResult(null)
    } catch (e: any) {
      alert(getErrorMessage(e))
    }
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      <BasicSection
        name={name}
        description={description}
        type={connectionType}
        onNameChange={setName}
        onDescriptionChange={setDescription}
        showTypeSelector={true}
        onTypeChange={setConnectionType}
      />
      <ConnectionSection
        dbType={dbType}
        params={params}
        onDbTypeChange={setDbType}
        onParamsChange={setParams}
      />
      <AuthenticationSection
        dbType={dbType}
        params={params}
        onParamsChange={setParams}
      />
      <AdvancedSection
        dbType={dbType}
        params={params}
        onParamsChange={setParams}
      />

      {testResult && (
        <div
          className="p-3 rounded-lg flex items-start gap-2 text-sm"
          style={{
            backgroundColor: testResult.success ? 'var(--success-soft)' : 'var(--error-soft)',
            color: testResult.success ? 'var(--success)' : 'var(--error)'
          }}
        >
          <span className="mt-0.5 shrink-0">
            {testResult.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
          </span>
          <span className="break-words">{testResult.message}</span>
        </div>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={handleTest} disabled={testing} className="btn-secondary">
          {testing ? (
            <><Loader2 size={16} className="animate-spin" /> Testing...</>
          ) : (
            <><TestTube size={16} /> Test Connection</>
          )}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !testResult?.success || !name}
          className="btn-primary"
        >
          {saving ? (
            <><Loader2 size={16} className="animate-spin" /> Saving...</>
          ) : (
            <><Save size={16} /> Save Connection</>
          )}
        </button>
      </div>
    </div>
  )
}
