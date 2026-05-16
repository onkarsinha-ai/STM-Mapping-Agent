import { Link, useLocation } from 'react-router-dom'
import { Database, FolderKanban, Plus, GitBranch, MessageSquare } from 'lucide-react'

export function Sidebar() {
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Projects', icon: FolderKanban },
    { path: '/connections', label: 'Connections', icon: Database },
    { path: '/chat', label: 'LLM Chat', icon: MessageSquare },
  ]

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <aside
      className="w-64 flex flex-col border-r"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)'
      }}
    >
      {/* Logo */}
      <div
        className="px-5 py-4 border-b flex items-center gap-3"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: 'var(--accent-soft)' }}
        >
          <GitBranch size={18} style={{ color: 'var(--accent)' }} />
        </div>
        <div>
          <h1 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            STM Agent
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Mapping Engine
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        <div className="px-3 py-2 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Workspace
        </div>
        {navItems.map(item => {
          const Icon = item.icon
          const active = isActive(item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${active ? 'active' : ''}`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* New Project CTA */}
      <div
        className="p-3 border-t"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <Link
          to="/"
          className="btn-primary w-full justify-center"
        >
          <Plus size={16} />
          New Project
        </Link>
      </div>
    </aside>
  )
}
