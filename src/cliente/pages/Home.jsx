import { Link } from 'react-router-dom'
import { FileText, ShoppingBag, Wallet } from 'lucide-react'

const atalhos = [
  { to: '/app/receitas', label: 'Minhas Receitas', icon: FileText },
  { to: '/app/pedidos', label: 'Meus Pedidos', icon: ShoppingBag },
  { to: '/app/pagamentos', label: 'Pagamentos', icon: Wallet },
]

export default function Home() {
  return (
    <div className="flex flex-col gap-3">
      {atalhos.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <Icon size={22} className="text-blue-600" />
          <span className="font-medium text-gray-800">{label}</span>
        </Link>
      ))}
    </div>
  )
}
