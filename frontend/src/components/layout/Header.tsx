import { Cpu, Circle } from 'lucide-react'

export function Header() {
  return (
    <header
      className="h-14 flex items-center justify-between px-6 border-b shrink-0"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)'
      }}
    >
      <div className="flex items-center gap-2">
        <Cpu size={16} style={{ color: 'var(--accent)' }} />
        <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          STM Mapping Agent
        </span>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{
            backgroundColor: 'var(--success-soft)',
            color: 'var(--success)'
          }}
        >
          v0.1
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Circle size={8} fill="currentColor" style={{ color: 'var(--success)' }} />
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Local Mode
        </span>
      </div>
    </header>
  )
}
