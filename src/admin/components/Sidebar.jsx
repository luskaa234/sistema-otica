import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Package,
  Wallet,
  Megaphone,
  UserCog,
  Settings,
} from 'lucide-react'

const itens = [
  { to: '/admin', fim: true, label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/clientes', label: 'Clientes', icon: Users },
  { to: '/admin/vendas', label: 'Vendas / OS', icon: ShoppingCart },
  { to: '/admin/estoque', label: 'Estoque', icon: Package },
  { to: '/admin/financeiro', label: 'Financeiro', icon: Wallet },
  { to: '/admin/marketing', label: 'Marketing', icon: Megaphone },
  { to: '/admin/funcionarios', label: 'Funcionários', icon: UserCog },
  { to: '/admin/configuracoes', label: 'Configurações', icon: Settings },
]

export function Sidebar() {
  return (
    <aside className="flex h-full w-60 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 py-4">
        <span className="text-lg font-semibold text-gray-900">Ótica Monte Sinai</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-2">
        {itens.map(({ to, fim, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={fim}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
