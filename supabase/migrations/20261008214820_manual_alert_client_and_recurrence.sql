-- Lembretes avulsos ganham dois recursos opcionais: vínculo com um cliente e repetição.
-- Nada muda para os lembretes existentes: `client_id` nasce nulo e `recurrence`, 'none'.

alter table public.manual_alerts
  add column client_id uuid,
  add column recurrence text not null default 'none';

alter table public.manual_alerts
  add constraint manual_alerts_recurrence_check
    check (recurrence in ('none', 'weekly', 'monthly', 'annual')),
  -- FK composta, como nos demais registros: o banco recusa por construção um cliente de
  -- outro workspace. Excluir o cliente mantém o lembrete, apenas sem o vínculo.
  add constraint manual_alerts_client_fk
    foreign key (workspace_id, client_id)
    references public.clients (workspace_id, id)
    on delete set null (client_id);

create index manual_alerts_client_idx
  on public.manual_alerts (workspace_id, client_id)
  where client_id is not null;

-- Só a criação informa vínculo e repetição. Sem grant de UPDATE nessas colunas, um
-- lembrete não troca de cliente nem de regra depois de criado.
grant insert (client_id, recurrence) on table public.manual_alerts to authenticated;

comment on column public.manual_alerts.client_id is
  'Cliente a que o lembrete se refere; opcional e sempre do mesmo workspace.';
comment on column public.manual_alerts.recurrence is
  'Repetição do lembrete; ao resolver, a aplicação cria a próxima ocorrência.';
