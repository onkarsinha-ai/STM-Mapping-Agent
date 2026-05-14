import { Link, useLocation } from 'react-router-dom'
import { Database, FolderKanban, Plus } from 'lucide-react'

export function Sidebar() {
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Projects', icon: FolderKanban },
    { path: '/connections', label: 'Connections', icon: Database },
  ]

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-900">STM Agent</h1>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <Link
          to="/"
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
        >
          <Plus size={18} />
          New Project
        </Link>
      </div>
    </aside>
  )
}
