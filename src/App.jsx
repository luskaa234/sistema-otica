import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { RotaProtegida } from './shared/components/RotaProtegida'

import Login from './pages/Login'

const BYPASS_AUTH = import.meta.env.VITE_DEV_BYPASS_AUTH !== 'false'

import { AdminLayout } from './admin/layouts/AdminLayout'
import { EstoqueLayout } from './admin/layouts/EstoqueLayout'
import { FinanceiroLayout } from './admin/layouts/FinanceiroLayout'
import Dashboard from './admin/pages/Dashboard'
import ListaClientes from './admin/pages/clientes/ListaClientes'
import FormularioCliente from './admin/pages/clientes/FormularioCliente'
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
import Relatorios from './admin/pages/financeiro/Relatorios'
import Campanhas from './admin/pages/marketing/Campanhas'
import ListaFuncionarios from './admin/pages/funcionarios/ListaFuncionarios'
import DadosLoja from './admin/pages/configuracoes/DadosLoja'

import { ClienteLayout } from './cliente/layouts/ClienteLayout'
import LoginCliente from './cliente/pages/Login'
import ClienteHome from './cliente/pages/Home'
import MinhasReceitas from './cliente/pages/MinhasReceitas'
import DetalheReceitaCliente from './cliente/pages/DetalheReceita'
import MinhasOS from './cliente/pages/MinhasOS'
import Pagamentos from './cliente/pages/Pagamentos'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={BYPASS_AUTH ? <Navigate to="/admin" replace /> : <Login />} />

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
          <Route path="clientes/novo" element={<FormularioCliente />} />
          <Route path="clientes/:id" element={<DetalheCliente />} />
          <Route path="clientes/:id/editar" element={<FormularioCliente />} />
          <Route path="clientes/:id/receitas/nova" element={<FormularioReceita />} />
          <Route path="vendas" element={<ListaOS />} />
          <Route path="vendas/novo" element={<NovoOrcamento />} />
          <Route path="vendas/:id" element={<DetalheOS />} />
          <Route path="estoque" element={<EstoqueLayout />}>
            <Route index element={<Armacoes />} />
            <Route path="lentes" element={<Lentes />} />
            <Route path="fornecedores" element={<Fornecedores />} />
          </Route>
          <Route path="financeiro" element={<FinanceiroLayout />}>
            <Route index element={<ContasReceber />} />
            <Route path="pagar" element={<ContasPagar />} />
            <Route path="fluxo-caixa" element={<FluxoCaixa />} />
            <Route path="comissoes" element={<Comissoes />} />
            <Route path="relatorios" element={<Relatorios />} />
          </Route>
          <Route path="marketing" element={<Campanhas />} />
          <Route path="funcionarios" element={<ListaFuncionarios />} />
          <Route path="configuracoes" element={<DadosLoja />} />
        </Route>

        <Route path="/app/login" element={<LoginCliente />} />

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
          <Route path="receitas/:id" element={<DetalheReceitaCliente />} />
          <Route path="pedidos" element={<MinhasOS />} />
          <Route path="pagamentos" element={<Pagamentos />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
