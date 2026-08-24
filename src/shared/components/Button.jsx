const variantes = {
  primary:
    'bg-brand-600 text-white shadow-soft hover:bg-brand-700 focus-visible:ring-brand-300 active:bg-brand-800',
  secondary:
    'bg-white text-gray-700 border border-gray-200 shadow-soft hover:bg-gray-50 hover:border-gray-300 focus-visible:ring-gray-300',
  danger:
    'bg-red-600 text-white shadow-soft hover:bg-red-700 focus-visible:ring-red-300 active:bg-red-800',
  ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-gray-300',
}

const tamanhos = {
  sm: 'px-2.5 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-base gap-2',
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  as: Elemento = 'button',
  ...props
}) {
  const ehBotaoNativo = Elemento === 'button'

  return (
    <Elemento
      {...(ehBotaoNativo ? { disabled: disabled || loading } : {})}
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none ${variantes[variant]} ${tamanhos[size]} ${className}`}
      {...props}
    >
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </Elemento>
  )
}
