import { useState } from 'react'
import { connectionsApi } from '../../services/api'
import { Database, TestTube, Save, Loader2, CheckCircle, XCircle } from 'lucide-react'

export function ConnectionForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('source')
  const [dbType, setDbType] = useState('postgresql')
  const [host, setHost] = useState('localhost')
  const [port, setPort] = useState('5432')
  const [database, setDatabase] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await connectionsApi.test({
        db_type: dbType,
        params: { db_type: dbType, host, port: parseInt(port), database, username, password }
      })
      setTestResult(res.data)
    } catch (e: any) {
      setTestResult({ success: false, message: e.response?.data?.detail || 'Test failed' })
    }
    setTesting(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await connectionsApi.create({
        name,
        connection_type: type,
        db_type: dbType,
        params: { db_type: dbType, host, port: parseInt(port), database, username, password }
      })
      onSuccess()
      setName('')
      setTestResult(null)
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Save failed')
    }
    setSaving(false)
  }

  const inputGrid = 'grid grid-cols-1 md:grid-cols-2 gap-4 mb-4'

  return (
    <div className="card p-6 animate-slide-up">
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: 'var(--cyan-soft)' }}
        >
          <Database size={18} style={{ color: 'var(--cyan)' }} />
        </div>
        <div>
          <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            Add Connection
          </h3>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Configure and test a new database or service connection
          </p>
        </div>
      </div>

      <div className={inputGrid}>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Connection Name
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="input-dark w-full"
            placeholder="Production Postgres"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Type
          </label>
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            className="input-dark w-full"
          >
            <option value="source">Source</option>
            <option value="target">Target</option>
            <option value="jira">Jira</option>
            <option value="llm">LLM</option>
          </select>
        </div>
      </div>

      {type !== 'jira' && (
        <>
          <div className={inputGrid}>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Database Type
              </label>
              <select
                value={dbType}
                onChange={e => setDbType(e.target.value)}
                className="input-dark w-full"
              >
                <option value="postgresql">PostgreSQL</option>
                <option value="mysql">MySQL</option>
                <option value="snowflake">Snowflake</option>
                <option value="bigquery">BigQuery</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Host
              </label>
              <input
                type="text"
                value={host}
                onChange={e => setHost(e.target.value)}
                className="input-dark w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Port
              </label>
              <input
                type="text"
                value={port}
                onChange={e => setPort(e.target.value)}
                className="input-dark w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Database
              </label>
              <input
                type="text"
                value={database}
                onChange={e => setDatabase(e.target.value)}
                className="input-dark w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="input-dark w-full"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input-dark w-full"
            />
          </div>
        </>
      )}

      {testResult && (
        <div
          className="p-3 rounded-lg mb-4 flex items-center gap-2 text-sm"
          style={{
            backgroundColor: testResult.success ? 'var(--success-soft)' : 'var(--error-soft)',
            color: testResult.success ? 'var(--success)' : 'var(--error)'
          }}
        >
          {testResult.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {testResult.message}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleTest}
          disabled={testing}
          className="btn-secondary"
        >
          {testing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <TestTube size={16} />
              Test Connection
            </>
          )}
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !testResult?.success || !name}
          className="btn-primary"
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save size={16} />
              Save Connection
            </>
          )}
        </button>
      </div>
    </div>
  )
}
