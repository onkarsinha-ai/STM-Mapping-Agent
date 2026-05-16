import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { connectionsApi, chatApi } from '../services/api'
import { MessageSquare, Send, Bot, User, Loader2, AlertCircle } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function ChatPage() {
  const [selectedConnId, setSelectedConnId] = useState('')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: connectionsData } = useQuery({
    queryKey: ['connections'],
    queryFn: () => connectionsApi.list()
  })

  const llmConnections =
    connectionsData?.data?.filter((c: any) => c.connection_type === 'llm') || []

  useEffect(() => {
    if (llmConnections.length > 0 && !selectedConnId) {
      setSelectedConnId(llmConnections[0].id)
    }
  }, [llmConnections, selectedConnId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || !selectedConnId || sending) return

    const userMsg = input.trim()
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setInput('')
    setSending(true)
    setError('')

    try {
      const res = await chatApi.send(selectedConnId, userMsg)
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.response }])
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to get response')
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please check your LLM connection.' }])
    }

    setSending(false)
  }

  const selectedConn = llmConnections.find((c: any) => c.id === selectedConnId)

  return (
    <div className="animate-slide-up max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--accent-soft)' }}
          >
            <MessageSquare size={20} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              LLM Chat
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Test your LLM connections with direct messages
            </p>
          </div>
        </div>

        {/* Connection selector */}
        {llmConnections.length === 0 ? (
          <div
            className="flex items-center gap-2 text-sm p-3 rounded-lg"
            style={{ backgroundColor: 'var(--warning-soft)', color: 'var(--warning)' }}
          >
            <AlertCircle size={16} />
            No LLM connections found. Add one in Connections first.
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Using:</span>
            <select
              value={selectedConnId}
              onChange={e => {
                setSelectedConnId(e.target.value)
                setMessages([])
                setError('')
              }}
              className="text-sm px-3 py-1.5 rounded-lg border"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)'
              }}
            >
              {llmConnections.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.provider})
                </option>
              ))}
            </select>
            {selectedConn?.is_tested && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: 'var(--success-soft)', color: 'var(--success)' }}
              >
                Tested
              </span>
            )}
          </div>
        )}
      </div>

      {/* Chat area */}
      <div
        className="flex-1 card overflow-hidden flex flex-col"
        style={{ minHeight: 0 }}
      >
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <Bot size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Start a conversation with your LLM to verify it's working.
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Try: "What can you help me with?" or "Summarize this schema..."
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor:
                    msg.role === 'user' ? 'var(--accent-soft)' : 'var(--bg-surface-hover)'
                }}
              >
                {msg.role === 'user' ? (
                  <User size={16} style={{ color: 'var(--accent)' }} />
                ) : (
                  <Bot size={16} style={{ color: 'var(--text-muted)' }} />
                )}
              </div>
              <div
                className="max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                style={{
                  backgroundColor:
                    msg.role === 'user' ? 'var(--accent-soft)' : 'var(--bg-surface-hover)',
                  color: 'var(--text-primary)',
                  borderRadius:
                    msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px'
                }}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'var(--bg-surface-hover)' }}
              >
                <Bot size={16} style={{ color: 'var(--text-muted)' }} />
              </div>
              <div
                className="px-4 py-2.5 rounded-2xl text-sm flex items-center gap-2"
                style={{
                  backgroundColor: 'var(--bg-surface-hover)',
                  color: 'var(--text-muted)',
                  borderRadius: '16px 16px 16px 4px'
                }}
              >
                <Loader2 size={14} className="animate-spin" />
                Thinking...
              </div>
            </div>
          )}

          {error && (
            <div
              className="text-xs text-center py-2 px-3 rounded-lg mx-auto max-w-md"
              style={{ backgroundColor: 'var(--error-soft)', color: 'var(--error)' }}
            >
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div
          className="p-3 border-t flex gap-2"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder={
              llmConnections.length === 0
                ? 'Add an LLM connection first...'
                : 'Type a message...'
            }
            disabled={llmConnections.length === 0 || sending}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm border outline-none focus:ring-1"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
              caretColor: 'var(--accent)'
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || llmConnections.length === 0 || sending}
            className="btn-primary px-4"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  )
}
