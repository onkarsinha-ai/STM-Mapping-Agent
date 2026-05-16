import { useState, useEffect } from 'react'
import { connectionsApi } from '../../services/api'
import { BasicSection } from './form-sections/BasicSection'
import { TestTube, Save, Loader2, CheckCircle, XCircle, ExternalLink } from 'lucide-react'

const AUTH_METHODS_CLOUD = [
  { value: 'basic', label: 'Basic Auth (Email + API Token)' },
  { value: 'oauth2', label: 'OAuth 2.0' },
]

const AUTH_METHODS_SERVER = [
  { value: 'basic', label: 'Basic Auth (Username + Password)' },
  { value: 'pat', label: 'Personal Access Token' },
  { value: 'oauth1', label: 'OAuth 1.0a' },
]

export function JiraConnectionForm({ onSuccess, editingConnection: _editingConnection }: { onSuccess: () => void; editingConnection?: any }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [instanceType, setInstanceType] = useState('jira_cloud')
  const [params, setParams] = useState<Record<string, any>>({
    base_url: 'https://your-domain.atlassian.net',
    auth_method: 'basic',
  })
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)

  const updateParam = (key: string, value: any) => {
    setParams(prev => ({ ...prev, [key]: value }))
  }

  const getErrorMessage = (e: any): string => {
    const detail = e.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) return detail.map((d: any) => d.msg || String(d)).join(', ')
    if (detail) return JSON.stringify(detail)
    return e.message || 'Request failed'
  }

  useEffect(() => {
    const defaultUrl = instanceType === 'jira_cloud'
      ? 'https://your-domain.atlassian.net'
      : 'https://jira.company.com'
    setParams({
      base_url: defaultUrl,
      auth_method: 'basic',
    })
    setTestResult(null)
  }, [instanceType])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'jira_oauth_success') {
        updateParam('access_token', event.data.access_token)
        updateParam('refresh_token', event.data.refresh_token)
        setTestResult({ success: true, message: 'OAuth authorization successful!' })
      } else if (event.data?.type === 'jira_oauth_error') {
        setTestResult({ success: false, message: event.data.error })
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const handleAuthorize = () => {
    const clientId = params.client_id
    const redirectUri = `${window.location.origin.replace('5173', '8000')}/connections/jira/callback`
    const state = btoa(JSON.stringify({
      client_id: clientId,
      client_secret: params.client_secret,
      redirect_uri: redirectUri
    }))
    const scopes = 'read:jira-work read:jira-user read:project:jira'
    const authUrl = `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&response_type=code&prompt=consent`

    window.open(authUrl, 'jira_oauth', 'width=600,height=700')
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await connectionsApi.test({
        connection_type: 'jira',
        provider: instanceType,
        params
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
        connection_type: 'jira',
        provider: instanceType,
        params
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

  const authMethods = instanceType === 'jira_cloud' ? AUTH_METHODS_CLOUD : AUTH_METHODS_SERVER

  return (
    <div className="space-y-4">
      <BasicSection
        name={name}
        description={description}
        type="jira"
        onNameChange={setName}
        onDescriptionChange={setDescription}
      />

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
          Instance Type <span style={{ color: 'var(--error)' }}>*</span>
        </label>
        <div className="flex gap-2">
          {['jira_cloud', 'jira_server'].map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setInstanceType(t)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                instanceType === t
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t === 'jira_cloud' ? 'Jira Cloud' : 'Jira Server / DC'}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
          Base URL <span style={{ color: 'var(--error)' }}>*</span>
        </label>
        <input
          type="text"
          value={params.base_url || ''}
          onChange={e => updateParam('base_url', e.target.value)}
          className="input-dark w-full"
          placeholder={instanceType === 'jira_cloud' ? 'https://your-domain.atlassian.net' : 'https://jira.company.com'}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Project Key(s)</label>
        <input
          type="text"
          value={params.project_keys || ''}
          onChange={e => updateParam('project_keys', e.target.value)}
          className="input-dark w-full"
          placeholder="PROJ, DEV, DATA"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
          Auth Method <span style={{ color: 'var(--error)' }}>*</span>
        </label>
        <select
          value={params.auth_method || 'basic'}
          onChange={e => updateParam('auth_method', e.target.value)}
          className="input-dark w-full"
        >
          {authMethods.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {params.auth_method === 'basic' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              {instanceType === 'jira_cloud' ? 'Email' : 'Username'} <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <input
              type="text"
              value={params.email || params.username || ''}
              onChange={e => updateParam(instanceType === 'jira_cloud' ? 'email' : 'username', e.target.value)}
              className="input-dark w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              {instanceType === 'jira_cloud' ? 'API Token' : 'Password'} <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <input
              type="password"
              value={params.api_token || params.password || ''}
              onChange={e => updateParam(instanceType === 'jira_cloud' ? 'api_token' : 'password', e.target.value)}
              className="input-dark w-full"
            />
          </div>
        </div>
      )}

      {params.auth_method === 'pat' && (
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Personal Access Token <span style={{ color: 'var(--error)' }}>*</span>
          </label>
          <input
            type="password"
            value={params.token || ''}
            onChange={e => updateParam('token', e.target.value)}
            className="input-dark w-full"
          />
        </div>
      )}

      {params.auth_method === 'oauth2' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Client ID <span style={{ color: 'var(--error)' }}>*</span></label>
              <input type="text" value={params.client_id || ''} onChange={e => updateParam('client_id', e.target.value)} className="input-dark w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Client Secret <span style={{ color: 'var(--error)' }}>*</span></label>
              <input type="password" value={params.client_secret || ''} onChange={e => updateParam('client_secret', e.target.value)} className="input-dark w-full" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Scopes</label>
            <input type="text" value={params.scopes || 'read:jira-work read:jira-user read:project:jira'} onChange={e => updateParam('scopes', e.target.value)} className="input-dark w-full" />
          </div>
          <button
            type="button"
            onClick={handleAuthorize}
            disabled={!params.client_id || !params.client_secret}
            className="btn-secondary"
          >
            <ExternalLink size={16} /> Authorize with Atlassian
          </button>
          {params.access_token && (
            <div className="p-2 rounded text-xs font-mono break-all" style={{ backgroundColor: 'var(--success-soft)', color: 'var(--success)' }}>
              Access token received
            </div>
          )}
        </div>
      )}

      {params.auth_method === 'oauth1' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Consumer Key</label>
            <input type="text" value={params.consumer_key || ''} onChange={e => updateParam('consumer_key', e.target.value)} className="input-dark w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Access Token</label>
            <input type="password" value={params.access_token || ''} onChange={e => updateParam('access_token', e.target.value)} className="input-dark w-full" />
          </div>
        </div>
      )}

      {instanceType === 'jira_server' && (
        <div className="mt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={params.ssl_verify !== false}
              onChange={e => updateParam('ssl_verify', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Verify SSL/TLS Certificate</span>
          </label>
        </div>
      )}

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
