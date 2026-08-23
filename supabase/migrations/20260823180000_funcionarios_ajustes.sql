-- Ajustes ao schema para o Módulo 7 (Funcionários & Permissões).

alter table public.funcionarios
  add column telefone text,
  add column data_admissao date;

-- Passa a registrar também em logs_auditoria (além do os_status_historico)
-- toda mudança de status de OS, para o log de auditoria do Módulo 7
-- mostrar "quem alterou status de OS" num único lugar.
create or replace function public.avancar_status_os(
  p_os_id uuid,
  p_novo_status text,
  p_funcionario_id uuid,
  p_motivo text default null
)
returns void
language plpgsql
security invoker
as $$
declare
  v_status_atual text;
begin
  select status into v_status_atual from public.ordens_servico where id = p_os_id;

  update public.ordens_servico
  set
    status = p_novo_status,
    updated_at = now(),
    motivo_cancelamento = case when p_novo_status = 'cancelado' then p_motivo else motivo_cancelamento end
  where id = p_os_id;

  insert into public.os_status_historico (os_id, status_anterior, status_novo, funcionario_id, motivo)
  values (p_os_id, v_status_atual, p_novo_status, p_funcionario_id, p_motivo);

  if p_funcionario_id is not null then
    insert into public.logs_auditoria (funcionario_id, acao, tabela_afetada, registro_id, detalhes)
    values (
      p_funcionario_id,
      'alterar_status_os',
      'ordens_servico',
      p_os_id,
      jsonb_build_object('de', v_status_atual, 'para', p_novo_status, 'motivo', p_motivo)
    );
  end if;

  if p_novo_status = 'aprovado' and v_status_atual is distinct from 'aprovado' then
    insert into public.pedidos_lente (os_id, produto_id, fornecedor_id, prazo_estimado)
    select
      oi.os_id,
      oi.produto_id,
      p.fornecedor_id,
      case when p.prazo_dias is not null then current_date + p.prazo_dias else null end
    from public.os_itens oi
    join public.produtos p on p.id = oi.produto_id
    where oi.os_id = p_os_id
      and p.tipo = 'lente'
      and not exists (
        select 1 from public.pedidos_lente pl
        where pl.os_id = oi.os_id and pl.produto_id = oi.produto_id
      );
  end if;
end;
$$;
