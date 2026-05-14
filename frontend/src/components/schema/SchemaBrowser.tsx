import { useState } from 'react'
import { ChevronRight, ChevronDown, Table, Columns } from 'lucide-react'

interface SchemaBrowserProps {
  schema: Record<string, Record<string, Array<{name: string, type: string, nullable: boolean}>>>
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

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {Object.entries(schema).map(([schemaName, tables]) => (
        <div key={schemaName} className="border-b border-gray-100 last:border-0">
          <button
            onClick={() => toggleSchema(schemaName)}
            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-left"
          >
            {expandedSchemas.has(schemaName) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <span className="font-medium text-gray-700">{schemaName}</span>
          </button>

          {expandedSchemas.has(schemaName) && (
            <div className="pl-8">
              {Object.entries(tables).map(([tableName, columns]) => (
                <div key={tableName}>
                  <button
                    onClick={() => toggleTable(`${schemaName}.${tableName}`)}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-left"
                  >
                    {expandedTables.has(`${schemaName}.${tableName}`) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <Table size={16} className="text-blue-600" />
                    <span className="text-gray-700">{tableName}</span>
                    <span className="text-xs text-gray-400">({columns.length} columns)</span>
                  </button>

                  {expandedTables.has(`${schemaName}.${tableName}`) && (
                    <div className="pl-8">
                      {columns.map(col => (
                        <div key={col.name} className="flex items-center gap-2 px-4 py-1 text-sm">
                          <Columns size={14} className="text-gray-400" />
                          <span className="text-gray-700">{col.name}</span>
                          <span className="text-xs text-gray-400">{col.type}</span>
                          {col.nullable && <span className="text-xs text-orange-400">nullable</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
