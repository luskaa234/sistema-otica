import { ChevronDown } from 'lucide-react'

export function Select({ label, error, options, className = '', id, ...props }) {
  const selectId = id || props.name

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="relative inline-block">
        <select
          id={selectId}
          className={`appearance-none rounded-lg border bg-white px-3 py-2 pr-9 text-sm text-gray-900 outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-100 ${
            error ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-gray-300'
          } ${className}`}
          {...props}
        >
          {options.map((opcao) => (
            <option key={opcao.value} value={opcao.value}>
              {opcao.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
      </div>
      {error && <span className="text-xs font-medium text-red-600">{error}</span>}
    </div>
  )
}
