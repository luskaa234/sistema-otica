export function Input({ label, error, className = '', id, ...props }) {
  const inputId = id || props.name

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 disabled:bg-gray-50 disabled:text-gray-400 ${
          error ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-gray-300'
        } ${className}`}
        {...props}
      />
      {error && <span className="text-xs font-medium text-red-600">{error}</span>}
    </div>
  )
}
