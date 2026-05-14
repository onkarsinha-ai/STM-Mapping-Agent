interface BasicSectionProps {
  name: string
  description: string
  type: string
  onNameChange: (name: string) => void
  onDescriptionChange: (desc: string) => void
  showTypeSelector?: boolean
  onTypeChange?: (type: string) => void
}

export function BasicSection({
  name, description, type,
  onNameChange, onDescriptionChange,
  showTypeSelector = false, onTypeChange
}: BasicSectionProps) {
  return (
    <div className="space-y-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Connection Name <span style={{ color: 'var(--error)' }}>*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={e => onNameChange(e.target.value)}
            className="input-dark w-full"
            placeholder="Production Postgres"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={e => onDescriptionChange(e.target.value)}
            className="input-dark w-full"
            placeholder="Optional description"
          />
        </div>
      </div>
      {showTypeSelector && onTypeChange && (
        <div className="flex gap-2">
          {['source', 'target'].map(t => (
            <button
              key={t}
              type="button"
              onClick={() => onTypeChange(t)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                type === t
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t}
            </button>
          ))}
          <span className="text-xs self-center ml-2" style={{ color: 'var(--text-muted)' }}>
            Connection type
          </span>
        </div>
      )}
    </div>
  )
}
