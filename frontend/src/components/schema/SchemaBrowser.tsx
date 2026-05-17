import { useState } from 'react'
import { ChevronRight, ChevronDown, Table2, Columns, Key, Hash, Type, ArrowRight, ArrowLeftRight } from 'lucide-react'

interface Column {
  name: string
  type: string
  nullable: boolean
  is_target?: boolean | string | null
}

interface SchemaBrowserProps {
  schema: Record<string, Record<string, Column[]>>
}

function getTypeIcon(type: string) {
  const t = type.toLowerCase()
  if (t.includes('int') || t.includes('serial')) return <Hash size={12} />
  if (t.includes('char') || t.includes('text') || t.includes('varchar')) return <Type size={12} />
  if (t.includes('key') || t.includes('uuid') || t.includes('id')) return <Key size={12} />
  return <Columns size={12} />
}

function getTableRole(columns: Column[]): { role: 'source' | 'target' | 'both' | null, icon: any } {
  const targets = new Set<boolean | string | null | undefined>()
  for (const col of columns) {
    targets.add(col.is_target)
  }
  const hasTrue = targets.has(true) || targets.has('both')
  const hasFalse = targets.has(false) || targets.has('both')
  const hasNull = targets.has(null) || targets.has(undefined)

  // If all columns have is_target=null/undefined, show no badge (same-connection, unassigned)
  if (!hasTrue && !hasFalse && hasNull) return { role: null, icon: null }

  if (hasTrue && hasFalse) return { role: 'both', icon: <ArrowLeftRight size={12} /> }
  if (hasTrue) return { role: 'target', icon: <ArrowRight size={12} /> }
  if (hasFalse) return { role: 'source', icon: <ArrowLeftRight size={12} className="rotate-180" /> }
  return { role: null, icon: null }
}

const ROLE_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  source: { bg: 'var(--cyan-soft)', text: 'var(--cyan)', label: 'Source' },
  target: { bg: 'var(--success-soft)', text: 'var(--success)', label: 'Target' },
  both: { bg: 'var(--warning-soft)', text: 'var(--warning)', label: 'Source + Target' },
}

export function SchemaBrowser({ schema }: SchemaBrowserProps) {
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set())
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set())

  const toggleSchema = (schemaName: string) => {
    const next = new Set(expandedSchemas)
    if (next.has(schemaName)) next.delete(schemaName)
    else next.add(schemaName)
    setExpandedSchemas(next)
  }

  const toggleTable = (key: string) => {
    const next = new Set(expandedTables)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setExpandedTables(next)
  }

  const schemaEntries = Object.entries(schema)

  if (schemaEntries.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: 'var(--accent-soft)' }}
        >
          <Table2 size={28} style={{ color: 'var(--accent)' }} />
        </div>
        <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          No schema data
        </h3>
        <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
          Run schema discovery to populate this view with your database structure.
        </p>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      {schemaEntries.map(([schemaName, tables]) => (
        <div key={schemaName}>
          <button
            onClick={() => toggleSchema(schemaName)}
            className="w-full flex items-center gap-2 px-5 py-3 text-left transition-colors hover:bg-white/5"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            {expandedSchemas.has(schemaName) ? (
              <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />
            ) : (
              <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
            )}
            <span className="schema-node font-semibold" style={{ color: 'var(--accent)' }}>
              {schemaName}
            </span>
            <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>
              ({Object.keys(tables).length} tables)
            </span>
          </button>

          {expandedSchemas.has(schemaName) && (
            <div>
              {Object.entries(tables).map(([tableName, columns]) => {
                const { role, icon } = getTableRole(columns)
                return (
                <div key={tableName}>
                  <button
                    onClick={() => toggleTable(`${schemaName}.${tableName}`)}
                    className="w-full flex items-center gap-2 px-5 py-2.5 text-left transition-colors hover:bg-white/5"
                    style={{
                      paddingLeft: '2.5rem',
                      borderBottom: '1px solid var(--border-subtle)'
                    }}
                  >
                    {expandedTables.has(`${schemaName}.${tableName}`) ? (
                      <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
                    ) : (
                      <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                    )}
                    <Table2 size={16} style={{ color: 'var(--cyan)' }} />
                    <span className="schema-node" style={{ color: 'var(--text-primary)' }}>
                      {tableName}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      ({columns.length} columns)
                    </span>
                    {role && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded ml-auto flex items-center gap-1"
                        style={{
                          backgroundColor: ROLE_BADGE[role].bg,
                          color: ROLE_BADGE[role].text
                        }}
                      >
                        {icon}
                        {ROLE_BADGE[role].label}
                      </span>
                    )}
                  </button>

                  {expandedTables.has(`${schemaName}.${tableName}`) && (
                    <div style={{ paddingLeft: '3.5rem' }}>
                      {columns.map((col) => (
                        <div
                          key={col.name}
                          className="flex items-center gap-2.5 px-5 py-2 transition-colors hover:bg-white/5"
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            paddingLeft: '1rem'
                          }}
                        >
                          <span style={{ color: 'var(--text-muted)' }}>
                            {getTypeIcon(col.type)}
                          </span>
                          <span className="schema-node" style={{ color: 'var(--text-secondary)' }}>
                            {col.name}
                          </span>
                          <span
                            className="schema-node text-xs px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: 'var(--bg-elevated)',
                              color: 'var(--cyan)'
                            }}
                          >
                            {col.type}
                          </span>
                          {col.nullable && (
                            <span
                              className="text-xs px-1.5 py-0.5 rounded"
                              style={{
                                backgroundColor: 'var(--warning-soft)',
                                color: 'var(--warning)'
                              }}
                            >
                              nullable
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )})}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
