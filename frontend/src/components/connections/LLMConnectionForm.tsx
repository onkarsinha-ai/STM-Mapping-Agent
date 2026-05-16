import { useState, useEffect } from 'react'
import { connectionsApi } from '../../services/api'
import { BasicSection } from './form-sections/BasicSection'
import { TestTube, Save, Loader2, CheckCircle, XCircle } from 'lucide-react'

const LLM_PROVIDERS = [
  { value: 'openai', label: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4', 'gpt-3.5-turbo'] },
  { value: 'anthropic', label: 'Anthropic', models: ['claude-sonnet-4-6', 'claude-opus-4-7', 'claude-haiku-4-5'] },
  { value: 'azure', label: 'Azure OpenAI', models: [] },
  { value: 'local', label: 'Local / Self-Hosted', models: [] },
  { value: 'ollama', label: 'Ollama', models: ['llama3', 'mistral', 'codellama'] },
  { value: 'groq', label: 'Groq', models: ['llama3-70b-8192', 'mixtral-8x7b-32768'] },
  { value: 'cohere', label: 'Cohere', models: ['command-r', 'command-r-plus'] },
  { value: 'gemini', label: 'Google Gemini', models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-pro'] },
  { value: 'kimi', label: 'Kimi (Moonshot AI)', models: ['kimi-k2', 'kimi-latest'] },
]

const DEFAULT_BASE_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com',
  azure: '',
  local: 'http://localhost:8000/v1',
  ollama: 'http://localhost:11434',
  groq: '',
  cohere: '',
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
  kimi: 'https://api.moonshot.cn/v1',
}

export function LLMConnectionForm({ onSuccess, editingConnection }: { onSuccess: () => void; editingConnection?: any }) {
  const isEditing = !!editingConnection

  const [name, setName] = useState(editingConnection?.name || '')
  const [description, setDescription] = useState(editingConnection?.description || '')
  const [provider, setProvider] = useState(editingConnection?.provider || 'openai')
  const [params, setParams] = useState<Record<string, any>>(() => {
    const providerValue = editingConnection?.provider || 'openai'
    const providerInfo = LLM_PROVIDERS.find(p => p.value === providerValue)
    const defaultUrl = DEFAULT_BASE_URLS[providerValue] || ''
    const savedMetadata = editingConnection?.metadata
    const savedModel = savedMetadata?.model
    const hasValidSavedModel = savedModel && (providerInfo?.models.includes(savedModel) || providerInfo?.models.length === 0)
    if (savedMetadata && hasValidSavedModel) {
      return {
        model: savedModel,
        api_key: '',
        base_url: savedMetadata.base_url || defaultUrl,
        ...savedMetadata,
      }
    }
    return {
      model: providerInfo?.models[0] || '',
      api_key: '',
      base_url: defaultUrl,
    }
  })
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [customEndpoint, setCustomEndpoint] = useState(() => {
    if (editingConnection?.metadata?.base_url) {
      const defaultUrl = DEFAULT_BASE_URLS[editingConnection?.provider] || ''
      return editingConnection.metadata.base_url !== defaultUrl
    }
    return false
  })

  const providerInfo = LLM_PROVIDERS.find(p => p.value === provider)

  useEffect(() => {
    if (isEditing) return
    const defaultUrl = DEFAULT_BASE_URLS[provider] || ''
    setParams(prev => ({
      ...prev,
      model: providerInfo?.models[0] || '',
      api_key: '',
      base_url: defaultUrl,
    }))
    setCustomEndpoint(false)
    setTestResult(null)
  }, [provider, isEditing])

  const updateParam = (key: string, value: any) => {
    setParams(prev => ({ ...prev, [key]: value }))
  }

  const buildApiParams = () => {
    const apiParams = { ...params }
    if (!customEndpoint) {
      delete apiParams.base_url
    }
    // If using a custom model, replace 'custom' with the actual model name
    if (apiParams.model === 'custom' && apiParams.custom_model) {
      apiParams.model = apiParams.custom_model
    }
    delete apiParams.custom_model
    return apiParams
  }

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
        connection_type: 'llm',
        provider,
        params: buildApiParams()
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
      const payload = {
        name,
        connection_type: 'llm',
        provider,
        params: buildApiParams()
      }
      if (isEditing) {
        await connectionsApi.update(editingConnection.id, payload)
      } else {
        await connectionsApi.create(payload)
      }
      onSuccess()
      if (!isEditing) {
        setName('')
        setDescription('')
        setTestResult(null)
      }
    } catch (e: any) {
      alert(getErrorMessage(e))
    }
    setSaving(false)
  }

  const needsApiKey = provider !== 'ollama'
  const needsBaseUrl = ['openai', 'anthropic', 'azure', 'local', 'ollama', 'kimi'].includes(provider)

  return (
    <div className="space-y-4">
      <BasicSection
        name={name}
        description={description}
        type="llm"
        onNameChange={setName}
        onDescriptionChange={setDescription}
      />

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
          Provider <span style={{ color: 'var(--error)' }}>*</span>
        </label>
        <select
          value={provider}
          onChange={e => setProvider(e.target.value)}
          className="input-dark w-full"
        >
          {LLM_PROVIDERS.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Model <span style={{ color: 'var(--error)' }}>*</span>
          </label>
          {providerInfo?.models.length ? (
            <select
              value={params.model || ''}
              onChange={e => updateParam('model', e.target.value)}
              className="input-dark w-full"
            >
              {providerInfo.models.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
              <option value="custom">Custom...</option>
            </select>
          ) : (
            <input
              type="text"
              value={params.model || ''}
              onChange={e => updateParam('model', e.target.value)}
              className="input-dark w-full"
              placeholder="model-name"
            />
          )}
          {params.model === 'custom' && (
            <input
              type="text"
              value={params.custom_model || ''}
              onChange={e => updateParam('custom_model', e.target.value)}
              className="input-dark w-full mt-2"
              placeholder="Enter custom model name"
            />
          )}
        </div>
        {provider === 'azure' && (
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>API Version</label>
            <input type="text" value={params.api_version || '2024-02-01'} onChange={e => updateParam('api_version', e.target.value)} className="input-dark w-full" />
          </div>
        )}
      </div>

      {needsApiKey && (
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            API Key {provider !== 'local' && <span style={{ color: 'var(--error)' }}>*</span>}
          </label>
          <input
            type="password"
            value={params.api_key || ''}
            onChange={e => updateParam('api_key', e.target.value)}
            className="input-dark w-full"
            placeholder={provider === 'local' ? 'not-needed (optional)' : 'sk-...'}
          />
        </div>
      )}

      {needsBaseUrl && (
        <div>
          <label className="flex items-center gap-2 cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={customEndpoint}
              onChange={e => setCustomEndpoint(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Use custom endpoint</span>
          </label>
          {customEndpoint && (
            <input
              type="text"
              value={params.base_url || ''}
              onChange={e => updateParam('base_url', e.target.value)}
              className="input-dark w-full"
              placeholder={DEFAULT_BASE_URLS[provider]}
            />
          )}
        </div>
      )}

      {provider === 'openai' && (
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Organization ID (optional)</label>
          <input type="text" value={params.organization_id || ''} onChange={e => updateParam('organization_id', e.target.value)} className="input-dark w-full" />
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
          disabled={saving || (!isEditing && !testResult?.success) || !name}
          className="btn-primary"
        >
          {saving ? (
            <><Loader2 size={16} className="animate-spin" /> {isEditing ? 'Updating...' : 'Saving...'}</>
          ) : (
            <><Save size={16} /> {isEditing ? 'Update Connection' : 'Save Connection'}</>
          )}
        </button>
      </div>
    </div>
  )
}
