import { useState } from 'react'
import { connectionsApi } from '../../services/api'

export function ConnectionForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('source')
  const [dbType, setDbType] = useState('postgresql')
  const [host, setHost] = useState('localhost')
  const [port, setPort] = useState('5432')
  const [database, setDatabase] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleTest = async () => {
    setTesting(true)
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

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">Add Connection</h3>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Production Postgres" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select value={type} onChange={e => setType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md">
            <option value="source">Source</option>
            <option value="target">Target</option>
            <option value="jira">Jira</option>
            <option value="llm">LLM</option>
          </select>
        </div>
      </div>

      {type !== 'jira' && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Database Type</label>
              <select value={dbType} onChange={e => setDbType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md">
                <option value="postgresql">PostgreSQL</option>
                <option value="mysql">MySQL</option>
                <option value="snowflake">Snowflake</option>
                <option value="bigquery">BigQuery</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
              <input type="text" value={host} onChange={e => setHost(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
              <input type="text" value={port} onChange={e => setPort(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Database</label>
              <input type="text" value={database} onChange={e => setDatabase(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md" />
          </div>
        </>
      )}

      {testResult && (
        <div className={`p-3 rounded-md mb-4 ${testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {testResult.message}
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={handleTest} disabled={testing}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50">
          {testing ? 'Testing...' : 'Test Connection'}
        </button>
        <button onClick={handleSave} disabled={saving || !testResult?.success}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Connection'}
        </button>
      </div>
    </div>
  )
}
