import { Outlet, NavLink } from 'react-router-dom'
import { Home, FileText, ShoppingBag, Wallet, Glasses } from 'lucide-react'

const itens = [
  { to: '/app', fim: true, label: 'Início', icon: Home },
  { to: '/app/receitas', label: 'Receitas', icon: FileText },
  { to: '/app/pedidos', label: 'Pedidos', icon: ShoppingBag },
  { to: '/app/pagamentos', label: 'Pagamentos', icon: Wallet },
]

export function ClienteLayout() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-gray-50/60">
      <header className="flex items-center justify-center gap-2 border-b border-gray-100 bg-white px-4 py-3.5 shadow-soft">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white">
          <Glasses size={15} />
        </div>
        <span className="font-bold text-gray-900">Ótica Monte Sinai</span>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-2">
        <Outlet />
      </main>

      <nav className="sticky bottom-0 grid grid-cols-4 border-t border-gray-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm">
        {itens.map(({ to, fim, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={fim}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                isActive ? 'text-brand-600' : 'text-gray-400'
              }`
            }
          >
            <Icon size={20} strokeWidth={2.1} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
