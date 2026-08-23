import { Outlet, NavLink } from 'react-router-dom'
import { Home, FileText, ShoppingBag, Wallet } from 'lucide-react'

const itens = [
  { to: '/app', fim: true, label: 'Início', icon: Home },
  { to: '/app/receitas', label: 'Receitas', icon: FileText },
  { to: '/app/pedidos', label: 'Pedidos', icon: ShoppingBag },
  { to: '/app/pagamentos', label: 'Pagamentos', icon: Wallet },
]

export function ClienteLayout() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-3 text-center">
        <span className="font-semibold text-gray-900">Ótica Monte Sinai</span>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        <Outlet />
      </main>

      <nav className="grid grid-cols-4 border-t border-gray-200 bg-white">
        {itens.map(({ to, fim, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={fim}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2 text-xs ${
                isActive ? 'text-blue-600' : 'text-gray-500'
              }`
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
