import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { RotaProtegida } from './shared/components/RotaProtegida'

import Login from './pages/Login'

import { AdminLayout } from './admin/layouts/AdminLayout'
import Dashboard from './admin/pages/Dashboard'
import ListaClientes from './admin/pages/clientes/ListaClientes'
import DetalheCliente from './admin/pages/clientes/DetalheCliente'
import FormularioReceita from './admin/pages/clientes/FormularioReceita'
import ListaOS from './admin/pages/vendas/ListaOS'
import DetalheOS from './admin/pages/vendas/DetalheOS'
import NovoOrcamento from './admin/pages/vendas/NovoOrcamento'
import Armacoes from './admin/pages/estoque/Armacoes'
import Lentes from './admin/pages/estoque/Lentes'
import Fornecedores from './admin/pages/estoque/Fornecedores'
import ContasReceber from './admin/pages/financeiro/ContasReceber'
import ContasPagar from './admin/pages/financeiro/ContasPagar'
import FluxoCaixa from './admin/pages/financeiro/FluxoCaixa'
import Comissoes from './admin/pages/financeiro/Comissoes'
import ListaFuncionarios from './admin/pages/funcionarios/ListaFuncionarios'
import DadosLoja from './admin/pages/configuracoes/DadosLoja'

import { ClienteLayout } from './cliente/layouts/ClienteLayout'
import ClienteHome from './cliente/pages/Home'
import MinhasReceitas from './cliente/pages/MinhasReceitas'
import MinhasOS from './cliente/pages/MinhasOS'
import Pagamentos from './cliente/pages/Pagamentos'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route
          path="/admin"
          element={
            <RotaProtegida perfilPermitido="funcionario">
              <AdminLayout />
            </RotaProtegida>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="clientes" element={<ListaClientes />} />
          <Route path="clientes/:id" element={<DetalheCliente />} />
          <Route path="clientes/:id/receitas/nova" element={<FormularioReceita />} />
          <Route path="vendas" element={<ListaOS />} />
          <Route path="vendas/novo" element={<NovoOrcamento />} />
          <Route path="vendas/:id" element={<DetalheOS />} />
          <Route path="estoque" element={<Armacoes />} />
          <Route path="estoque/lentes" element={<Lentes />} />
          <Route path="estoque/fornecedores" element={<Fornecedores />} />
          <Route path="financeiro" element={<ContasReceber />} />
          <Route path="financeiro/pagar" element={<ContasPagar />} />
          <Route path="financeiro/fluxo-caixa" element={<FluxoCaixa />} />
          <Route path="financeiro/comissoes" element={<Comissoes />} />
          <Route path="funcionarios" element={<ListaFuncionarios />} />
          <Route path="configuracoes" element={<DadosLoja />} />
        </Route>

        <Route
          path="/app"
          element={
            <RotaProtegida perfilPermitido="cliente">
              <ClienteLayout />
            </RotaProtegida>
          }
        >
          <Route index element={<ClienteHome />} />
          <Route path="receitas" element={<MinhasReceitas />} />
          <Route path="pedidos" element={<MinhasOS />} />
          <Route path="pagamentos" element={<Pagamentos />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
