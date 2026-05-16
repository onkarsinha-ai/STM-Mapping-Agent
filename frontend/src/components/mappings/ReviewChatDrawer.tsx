import { useState, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { reviewChatApi } from '../../services/api'
import { Send, Bot, User, Loader2, X, Sparkles, CheckCircle } from 'lucide-react'

interface Message {
  id?: string
  role: 'user' | 'assistant'
  content: string
  mapping_changes?: any[]
}

interface ReviewChatDrawerProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
}

export function ReviewChatDrawer({ projectId, isOpen, onClose }: ReviewChatDrawerProps) {
  const queryClient = useQueryClient()
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [localMessages, setLocalMessages] = useState<Message[]>([])
  const [finishing, setFinishing] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['review-chat', projectId],
    queryFn: () => reviewChatApi.getHistory(projectId),
    enabled: isOpen && !!projectId
  })

  useEffect(() => {
    if (historyData?.data) {
      setLocalMessages(historyData.data.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        mapping_changes: m.mapping_changes
      })))
    }
  }, [historyData])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [localMessages])

  const handleSend = async () => {
    if (!input.trim() || sending) return

    const userMsg = input.trim()
    setLocalMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setInput('')
    setSending(true)

    try {
      const res = await reviewChatApi.sendMessage(projectId, userMsg)
      setLocalMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data.response,
        mapping_changes: res.data.mapping_changes
      }])
      // Refresh mappings table since AI may have updated mappings
      queryClient.invalidateQueries({ queryKey: ['mappings', projectId] })
    } catch (e: any) {
      setLocalMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }])
    }

    setSending(false)
  }

  const handleFinishReview = async () => {
    setFinishing(true)
    try {
      await reviewChatApi.finishReview(projectId)
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      onClose()
    } catch (e) {
      alert('Failed to finish review')
    }
    setFinishing(false)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 h-full z-50 flex flex-col animate-slide-in-right"
        style={{
          width: '400px',
          backgroundColor: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border-subtle)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <Sparkles size={18} style={{ color: 'var(--accent)' }} />
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              AI Review Assistant
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ minHeight: 0 }}>
          {historyLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
            </div>
          )}

          {localMessages.length === 0 && !historyLoading && (
            <div className="text-center py-8">
              <Bot size={28} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Hi! I'm your mapping review assistant.
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Ask me about any mapping — I can explain logic, suggest improvements, or update mappings.
              </p>
            </div>
          )}

          {localMessages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: msg.role === 'user' ? 'var(--accent-soft)' : 'var(--bg-surface-hover)'
                }}
              >
                {msg.role === 'user' ? (
                  <User size={16} style={{ color: 'var(--accent)' }} />
                ) : (
                  <Bot size={16} style={{ color: 'var(--text-muted)' }} />
                )}
              </div>
              <div className="max-w-[80%]">
                <div
                  className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                  style={{
                    backgroundColor: msg.role === 'user' ? 'var(--accent-soft)' : 'var(--bg-surface-hover)',
                    color: 'var(--text-primary)',
                    borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px'
                  }}
                >
                  {msg.content}
                </div>
                {msg.mapping_changes && msg.mapping_changes.length > 0 && (
                  <div
                    className="mt-1.5 text-xs px-2 py-1 rounded-md inline-flex items-center gap-1"
                    style={{ backgroundColor: 'var(--success-soft)', color: 'var(--success)' }}
                  >
                    <CheckCircle size={12} />
                    Updated {msg.mapping_changes.length} mapping{msg.mapping_changes.length > 1 ? 's' : ''}
                  </div>
                )}
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

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="p-4 border-t space-y-3" style={{ borderColor: 'var(--border-subtle)' }}>
          <button
            onClick={handleFinishReview}
            disabled={finishing || localMessages.length === 0}
            className="w-full btn-primary py-2 text-sm"
          >
            {finishing ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Finishing...
              </>
            ) : (
              <>
                <CheckCircle size={14} />
                Finish Review
              </>
            )}
          </button>

          <div className="flex gap-2">
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
              placeholder="Ask about your mappings..."
              disabled={sending}
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
              disabled={!input.trim() || sending}
              className="btn-primary px-4"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
