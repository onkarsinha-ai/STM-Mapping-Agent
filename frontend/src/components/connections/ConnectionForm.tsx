import { useState } from 'react'
import { Database, Sparkles, Link2 } from 'lucide-react'
import { DatabaseConnectionForm } from './DatabaseConnectionForm'
import { LLMConnectionForm } from './LLMConnectionForm'
import { JiraConnectionForm } from './JiraConnectionForm'

type TabType = 'database' | 'llm' | 'jira'

const TABS: { id: TabType; label: string; icon: typeof Database }[] = [
  { id: 'database', label: 'Database', icon: Database },
  { id: 'llm', label: 'LLM Model', icon: Sparkles },
  { id: 'jira', label: 'Jira', icon: Link2 },
]

export function ConnectionForm({ onSuccess }: { onSuccess: () => void }) {
  const [activeTab, setActiveTab] = useState<TabType>('database')

  return (
    <div className="card p-6 animate-slide-up">
      <div className="flex items-center gap-2 mb-6 border-b pb-4" style={{ borderColor: 'var(--border-color)' }}>
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'text-white'
                  : 'hover:bg-gray-100'
              }`}
              style={isActive ? { backgroundColor: 'var(--accent)' } : { color: 'var(--text-secondary)' }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'database' && <DatabaseConnectionForm onSuccess={onSuccess} />}
      {activeTab === 'llm' && <LLMConnectionForm onSuccess={onSuccess} />}
      {activeTab === 'jira' && <JiraConnectionForm onSuccess={onSuccess} />}
    </div>
  )
}
