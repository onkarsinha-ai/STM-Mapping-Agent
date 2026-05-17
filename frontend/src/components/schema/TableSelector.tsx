import { useState, useMemo, useEffect } from 'react'
import { Check, Database, ArrowRight, AlertCircle, CheckSquare, Square, Search } from 'lucide-react'
import type { SchemaTree } from '../../types'

interface TableSelectorProps {
  schema: SchemaTree
  initialSourceTables?: string[]
  initialTargetTable?: string
  onSave: (sourceTables: string[], targetTable: string) => void
  saving?: boolean
}

function flattenTables(schema: SchemaTree): { key: string; schema: string; table: string }[] {
  const tables: { key: string; schema: string; table: string }[] = []
  for (const [schemaName, schemaTables] of Object.entries(schema)) {
    for (const tableName of Object.keys(schemaTables)) {
      tables.push({ key: `${schemaName}.${tableName}`, schema: schemaName, table: tableName })
    }
  }
  return tables
}

export function TableSelector({ schema, initialSourceTables, initialTargetTable, onSave, saving }: TableSelectorProps) {
  const tables = useMemo(() => flattenTables(schema), [schema])
  const [selectedSources, setSelectedSources] = useState<Set<string>>(
    new Set(initialSourceTables || [])
  )
  const [selectedTarget, setSelectedTarget] = useState<string>(initialTargetTable || '')
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredTables = useMemo(() => {
    if (!searchQuery.trim()) return tables
    const q = searchQuery.toLowerCase()
    return tables.filter(t => t.key.toLowerCase().includes(q) || t.table.toLowerCase().includes(q))
  }, [tables, searchQuery])

  // Sync with saved selections when they load asynchronously
  useEffect(() => {
    if (initialSourceTables !== undefined) {
      setSelectedSources(new Set(initialSourceTables))
    }
  }, [initialSourceTables])

  useEffect(() => {
    if (initialTargetTable !== undefined) {
      setSelectedTarget(initialTargetTable)
    }
  }, [initialTargetTable])

  const toggleSource = (key: string) => {
    setError('')
    const next = new Set(selectedSources)
    if (next.has(key)) {
      next.delete(key)
    } else {
      next.add(key)
      // If this was the target, clear target
      if (selectedTarget === key) {
        setSelectedTarget('')
      }
    }
    setSelectedSources(next)
  }

  const allSourcesSelected = filteredTables.length > 0 && filteredTables.every(t => selectedSources.has(t.key))

  const toggleSelectAllSources = () => {
    setError('')
    if (allSourcesSelected) {
      // Deselect all filtered, but keep target if it's selected and not in filtered
      const next = new Set<string>()
      for (const key of selectedSources) {
        if (!filteredTables.some(t => t.key === key)) {
          next.add(key)
        }
      }
      if (selectedTarget) next.add(selectedTarget)
      setSelectedSources(next)
    } else {
      // Select all filtered
      const next = new Set(selectedSources)
      for (const t of filteredTables) {
        next.add(t.key)
      }
      setSelectedSources(next)
    }
  }

  const setTarget = (key: string) => {
    setError('')
    setSelectedTarget(key)
    // Ensure target is also in sources (it can be mapped to itself)
    const next = new Set(selectedSources)
    next.add(key)
    setSelectedSources(next)
  }

  const handleSave = () => {
    if (!selectedTarget) {
      setError('Please select exactly one target table')
      return
    }
    if (selectedSources.size === 0) {
      setError('Please select at least one source table')
      return
    }
    onSave(Array.from(selectedSources), selectedTarget)
  }

  return (
    <div className="card p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: 'var(--warning-soft)' }}
        >
          <Database size={18} style={{ color: 'var(--warning)' }} />
        </div>
        <div>
          <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            Select Tables
          </h3>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Source and target share the same connection. Choose which table is the target and which are sources.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 mb-4 p-3 rounded-md bg-red-500/10">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search tables..."
          className="w-full pl-9 pr-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 focus:border-cyan-500/50 focus:outline-none transition-colors"
          style={{ color: 'var(--text-primary)' }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Source Tables */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--cyan)' }}>
              <ArrowRight size={14} className="rotate-180" />
              Source Tables ({selectedSources.size} selected)
            </h4>
            <button
              onClick={toggleSelectAllSources}
              className="text-xs flex items-center gap-1 px-2 py-1 rounded-md transition-colors hover:bg-white/5"
              style={{ color: 'var(--cyan)' }}
            >
              {allSourcesSelected ? <CheckSquare size={12} /> : <Square size={12} />}
              {allSourcesSelected ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
            {filteredTables.map(({ key, schema: s, table }) => (
              <button
                key={key}
                onClick={() => toggleSource(key)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors ${
                  selectedSources.has(key)
                    ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400'
                    : 'border border-transparent hover:bg-white/5 text-gray-400'
                }`}
              >
                <Check
                  size={14}
                  className={selectedSources.has(key) ? 'opacity-100' : 'opacity-30'}
                />
                <span className="truncate">{s}.{table}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Target Table */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2" style={{ color: 'var(--success)' }}>
            <ArrowRight size={14} />
            Target Table
          </h4>
          <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
            {filteredTables.map(({ key, schema: s, table }) => (
              <button
                key={key}
                onClick={() => setTarget(key)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors ${
                  selectedTarget === key
                    ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                    : 'border border-transparent hover:bg-white/5 text-gray-400'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                    selectedTarget === key
                      ? 'border-green-400'
                      : 'border-gray-600'
                  }`}
                >
                  {selectedTarget === key && (
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  )}
                </div>
                <span className="truncate">{s}.{table}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary"
        >
          {saving ? 'Saving...' : 'Save Selections'}
        </button>
      </div>
    </div>
  )
}
