export function Select({ label, error, options, className = '', id, ...props }) {
  const selectId = id || props.name

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`rounded-lg border bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-blue-500 ${
          error ? 'border-red-400' : 'border-gray-300'
        } ${className}`}
        {...props}
      >
        {options.map((opcao) => (
          <option key={opcao.value} value={opcao.value}>
            {opcao.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
