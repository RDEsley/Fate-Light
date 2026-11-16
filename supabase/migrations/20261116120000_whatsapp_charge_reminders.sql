-- Lembretes de cobrança pelo WhatsApp (ADR-0024).
--
-- Três tabelas expostas e uma privada:
-- - `whatsapp_reminder_settings`: uma linha por workspace com a conta da Meta, os templates e
--   os dias de antecedência/atraso. Sem linha ou com `enabled = false`, nada é enviado.
-- - `client_whatsapp_preferences`: opt-in por cliente, com telefone e nome opcionais que
--   substituem os do cadastro.
-- - `whatsapp_reminder_deliveries`: registro de cada lembrete. A unicidade por
--   `(charge_id, kind, due_date)` torna o agendador idempotente.
-- - `private.whatsapp_credentials`: token da Meta, sem grant para `authenticated`.
--
-- O agendador e o webhook rodam com a chave secreta e só usam as funções `claim_*` e
-- `record_*`, cujo execute é exclusivo de `service_role`.

create table public.whatsapp_reminder_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  enabled boolean not null default false,
  phone_number_id text,
  template_language text not null default 'pt_BR',
  template_before text,
  template_due text,
  template_overdue text,
  days_before smallint not null default 0,
  days_after smallint not null default 0,
  header_image_url text,
  pix_key text,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid not null default auth.uid(),
  updated_by uuid not null default auth.uid(),
  constraint whatsapp_settings_phone_number_id_check
    check (phone_number_id is null or phone_number_id ~ '^[0-9]{5,32}$'),
  constraint whatsapp_settings_language_check
    check (template_language ~ '^[a-z]{2}(_[A-Z]{2})?$'),
  constraint whatsapp_settings_templates_check check (
    (template_before is null or (template_before ~ '^[a-z0-9_]+$' and char_length(template_before) <= 512))
    and (template_due is null or (template_due ~ '^[a-z0-9_]+$' and char_length(template_due) <= 512))
    and (template_overdue is null or (template_overdue ~ '^[a-z0-9_]+$' and char_length(template_overdue) <= 512))
  ),
  constraint whatsapp_settings_days_check
    check (days_before between 0 and 15 and days_after between 0 and 30),
  constraint whatsapp_settings_image_check
    check (
      header_image_url is null
      or (header_image_url ~ '^https://' and char_length(header_image_url) <= 1000)
    ),
  constraint whatsapp_settings_pix_check
    check (pix_key is null or char_length(btrim(pix_key)) between 3 and 140),
  -- Ligar a automação exige o mínimo para enviar: número e template do vencimento.
  constraint whatsapp_settings_enabled_check
    check (not enabled or (phone_number_id is not null and template_due is not null))
);

create table public.client_whatsapp_preferences (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null,
  enabled boolean not null default false,
  phone text,
  contact_name text,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid not null default auth.uid(),
  updated_by uuid not null default auth.uid(),
  primary key (workspace_id, client_id),
  constraint client_whatsapp_preferences_client_fk
    foreign key (workspace_id, client_id)
    references public.clients (workspace_id, id)
    on delete cascade,
  constraint client_whatsapp_preferences_phone_check
    check (phone is null or phone ~ '^[0-9]{10,15}$'),
  constraint client_whatsapp_preferences_name_check
    check (contact_name is null or char_length(btrim(contact_name)) between 2 and 80)
);

create table public.whatsapp_reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  charge_id uuid not null,
  client_id uuid not null,
  kind text not null,
  due_date date not null,
  scheduled_on date not null,
  recipient_phone text not null,
  contact_name text not null,
  status text not null default 'sending',
  attempts smallint not null default 0,
  wa_message_id text,
  error_message text,
  sent_at timestamptz,
  status_at timestamptz not null default statement_timestamp(),
  created_at timestamptz not null default statement_timestamp(),
  constraint whatsapp_deliveries_charge_fk
    foreign key (workspace_id, charge_id)
    references public.charges (workspace_id, id)
    on delete cascade,
  constraint whatsapp_deliveries_client_fk
    foreign key (workspace_id, client_id)
    references public.clients (workspace_id, id)
    on delete cascade,
  constraint whatsapp_deliveries_once unique (charge_id, kind, due_date),
  constraint whatsapp_deliveries_wa_message_id_unique unique (wa_message_id),
  constraint whatsapp_deliveries_kind_check check (kind in ('before', 'due', 'overdue')),
  constraint whatsapp_deliveries_status_check
    check (status in ('sending', 'sent', 'delivered', 'read', 'failed')),
  constraint whatsapp_deliveries_attempts_check check (attempts between 0 and 10),
  constraint whatsapp_deliveries_error_check
    check (error_message is null or char_length(error_message) <= 500)
);

create index whatsapp_deliveries_workspace_created_idx
  on public.whatsapp_reminder_deliveries (workspace_id, created_at desc);

create table private.whatsapp_credentials (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  access_token text not null,
  updated_at timestamptz not null default statement_timestamp(),
  constraint whatsapp_credentials_token_check
    check (char_length(access_token) between 20 and 1024)
);

revoke all on table private.whatsapp_credentials from public, anon, authenticated;

-- RLS e grants mínimos.

alter table public.whatsapp_reminder_settings enable row level security;
alter table public.whatsapp_reminder_settings force row level security;
alter table public.client_whatsapp_preferences enable row level security;
alter table public.client_whatsapp_preferences force row level security;
alter table public.whatsapp_reminder_deliveries enable row level security;
alter table public.whatsapp_reminder_deliveries force row level security;

revoke all on table public.whatsapp_reminder_settings from public, anon, authenticated;
revoke all on table public.client_whatsapp_preferences from public, anon, authenticated;
revoke all on table public.whatsapp_reminder_deliveries from public, anon, authenticated;

grant select on table public.whatsapp_reminder_settings to authenticated;
grant insert (
  workspace_id, enabled, phone_number_id, template_language, template_before, template_due,
  template_overdue, days_before, days_after, header_image_url, pix_key
) on table public.whatsapp_reminder_settings to authenticated;
grant update (
  enabled, phone_number_id, template_language, template_before, template_due,
  template_overdue, days_before, days_after, header_image_url, pix_key
) on table public.whatsapp_reminder_settings to authenticated;

grant select, delete on table public.client_whatsapp_preferences to authenticated;
grant insert (workspace_id, client_id, enabled, phone, contact_name)
  on table public.client_whatsapp_preferences to authenticated;
grant update (enabled, phone, contact_name)
  on table public.client_whatsapp_preferences to authenticated;

-- O histórico de envios é escrito somente pelo agendador e pelo webhook.
grant select on table public.whatsapp_reminder_deliveries to authenticated;
grant select on table public.whatsapp_reminder_deliveries to service_role;

create trigger whatsapp_reminder_settings_set_updated_at
before update on public.whatsapp_reminder_settings
for each row execute function private.set_updated_at();

create trigger whatsapp_reminder_settings_set_updated_by
before update on public.whatsapp_reminder_settings
for each row execute function private.set_operational_updated_by();

create trigger client_whatsapp_preferences_set_updated_at
before update on public.client_whatsapp_preferences
for each row execute function private.set_updated_at();

create trigger client_whatsapp_preferences_set_updated_by
before update on public.client_whatsapp_preferences
for each row execute function private.set_operational_updated_by();

create policy whatsapp_settings_select_owner on public.whatsapp_reminder_settings
for select to authenticated
using ((select private.is_active_workspace_owner(workspace_id)));

create policy whatsapp_settings_insert_owner on public.whatsapp_reminder_settings
for insert to authenticated
with check ((select private.is_active_workspace_owner(workspace_id)));

create policy whatsapp_settings_update_owner on public.whatsapp_reminder_settings
for update to authenticated
using ((select private.is_active_workspace_owner(workspace_id)))
with check ((select private.is_active_workspace_owner(workspace_id)));

create policy client_whatsapp_preferences_select_owner on public.client_whatsapp_preferences
for select to authenticated
using ((select private.is_active_workspace_owner(workspace_id)));

create policy client_whatsapp_preferences_insert_owner on public.client_whatsapp_preferences
for insert to authenticated
with check ((select private.is_active_workspace_owner(workspace_id)));

create policy client_whatsapp_preferences_update_owner on public.client_whatsapp_preferences
for update to authenticated
using ((select private.is_active_workspace_owner(workspace_id)))
with check ((select private.is_active_workspace_owner(workspace_id)));

create policy client_whatsapp_preferences_delete_owner on public.client_whatsapp_preferences
for delete to authenticated
using ((select private.is_active_workspace_owner(workspace_id)));

create policy whatsapp_deliveries_select_owner on public.whatsapp_reminder_deliveries
for select to authenticated
using ((select private.is_active_workspace_owner(workspace_id)));

-- Token da Meta: o owner grava ou remove; nunca é lido de volta pela aplicação do usuário.

create or replace function public.set_whatsapp_access_token(p_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
begin
  select member.workspace_id
  into v_workspace_id
  from public.workspace_members as member
  where member.user_id = (select auth.uid())
    and member.role = 'owner'
    and member.status = 'active';

  if v_workspace_id is null
    or not (select private.is_active_workspace_owner(v_workspace_id)) then
    raise insufficient_privilege using message = 'active workspace owner required';
  end if;

  if p_token is null or btrim(p_token) = '' then
    delete from private.whatsapp_credentials where workspace_id = v_workspace_id;
    return false;
  end if;

  insert into private.whatsapp_credentials (workspace_id, access_token)
  values (v_workspace_id, btrim(p_token))
  on conflict (workspace_id) do update
  set access_token = excluded.access_token, updated_at = statement_timestamp();

  return true;
end;
$$;

create or replace function public.has_whatsapp_access_token()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.whatsapp_credentials as credential
    join public.workspace_members as member on member.workspace_id = credential.workspace_id
    where member.user_id = (select auth.uid())
      and member.role = 'owner'
      and member.status = 'active'
  );
$$;

revoke all on function public.set_whatsapp_access_token(text) from public, anon;
revoke all on function public.has_whatsapp_access_token() from public, anon;
grant execute on function public.set_whatsapp_access_token(text) to authenticated;
grant execute on function public.has_whatsapp_access_token() to authenticated;

-- Agendador: registra os lembretes devidos hoje (no fuso de cada workspace) e devolve o que
-- precisa ser enviado agora, incluindo falhas do dia com menos de três tentativas.

create or replace function public.claim_whatsapp_reminders(p_now timestamptz default null)
returns table (
  delivery_id uuid,
  workspace_id uuid,
  kind text,
  template_name text,
  template_language text,
  phone_number_id text,
  access_token text,
  header_image_url text,
  pix_key text,
  recipient_phone text,
  contact_name text,
  description text,
  amount numeric,
  due_date date
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_now timestamptz := coalesce(p_now, statement_timestamp());
begin
  with candidates as (
    select
      charge.workspace_id,
      charge.id as charge_id,
      charge.client_id,
      moment.kind,
      charge.due_date,
      (v_now at time zone workspace.timezone)::date as today,
      coalesce(preference.phone, regexp_replace(coalesce(client.phone, ''), '\D', '', 'g'))
        as recipient_phone,
      coalesce(nullif(btrim(preference.contact_name), ''), client.name) as contact_name
    from public.charges as charge
    join public.workspaces as workspace on workspace.id = charge.workspace_id
    join public.whatsapp_reminder_settings as settings
      on settings.workspace_id = charge.workspace_id and settings.enabled
    join private.whatsapp_credentials as credential
      on credential.workspace_id = charge.workspace_id
    join public.client_whatsapp_preferences as preference
      on preference.workspace_id = charge.workspace_id
      and preference.client_id = charge.client_id
      and preference.enabled
    join public.clients as client
      on client.workspace_id = charge.workspace_id and client.id = charge.client_id
    cross join lateral (
      values
        ('before', settings.template_before, settings.days_before),
        ('due', settings.template_due, 0::smallint),
        ('overdue', settings.template_overdue, (-settings.days_after)::smallint)
    ) as moment (kind, template_name, offset_days)
    where charge.status = 'pending'
      and workspace.status = 'active'
      and client.commercial_status <> 'archived'
      and moment.template_name is not null
      and (moment.kind = 'due' or moment.offset_days <> 0)
      and charge.due_date = (v_now at time zone workspace.timezone)::date + moment.offset_days
  )
  insert into public.whatsapp_reminder_deliveries (
    workspace_id, charge_id, client_id, kind, due_date, scheduled_on, recipient_phone,
    contact_name, status, attempts
  )
  select
    candidate.workspace_id, candidate.charge_id, candidate.client_id, candidate.kind,
    candidate.due_date, candidate.today, candidate.recipient_phone, candidate.contact_name,
    'sending', 0
  from candidates as candidate
  where candidate.recipient_phone <> ''
  on conflict on constraint whatsapp_deliveries_once do nothing;

  -- Uma execução interrompida não pode deixar entregas presas em "sending". Expira os itens
  -- de dias anteriores e encerra tentativas esgotadas no próprio dia.
  update public.whatsapp_reminder_deliveries as delivery
  set
    status = 'failed',
    error_message = coalesce(delivery.error_message, 'Agendamento expirado antes da confirmação do envio.'),
    status_at = v_now
  from public.workspaces as workspace
  where workspace.id = delivery.workspace_id
    and delivery.status = 'sending'
    and delivery.scheduled_on < (v_now at time zone workspace.timezone)::date;

  update public.whatsapp_reminder_deliveries as delivery
  set
    status = 'failed',
    error_message = coalesce(delivery.error_message, 'Limite de tentativas atingido após uma interrupção.'),
    status_at = v_now
  from public.workspaces as workspace
  where workspace.id = delivery.workspace_id
    and delivery.status = 'sending'
    and delivery.attempts >= 3
    and delivery.scheduled_on = (v_now at time zone workspace.timezone)::date
    and delivery.status_at < v_now - interval '15 minutes';

  return query
  with claimed as (
  update public.whatsapp_reminder_deliveries as delivery
  set
    status = 'sending',
    attempts = delivery.attempts + 1,
    error_message = null,
    status_at = v_now
  from public.charges as charge,
    public.whatsapp_reminder_settings as settings,
    private.whatsapp_credentials as credential,
    public.workspaces as workspace,
    public.client_whatsapp_preferences as preference,
    public.clients as client
  where charge.id = delivery.charge_id
    and settings.workspace_id = delivery.workspace_id
    and credential.workspace_id = delivery.workspace_id
    and workspace.id = delivery.workspace_id
    and preference.workspace_id = delivery.workspace_id
    and preference.client_id = delivery.client_id
    and preference.enabled
    and client.workspace_id = delivery.workspace_id
    and client.id = delivery.client_id
    and client.commercial_status <> 'archived'
    and workspace.status = 'active'
    and charge.status = 'pending'
    and charge.due_date = delivery.due_date
    and settings.enabled
    and case delivery.kind
      when 'before' then settings.template_before is not null
      when 'due' then settings.template_due is not null
      when 'overdue' then settings.template_overdue is not null
    end
    and delivery.scheduled_on = (v_now at time zone workspace.timezone)::date
    and (
      (delivery.status = 'sending' and delivery.attempts = 0)
      or (delivery.status = 'failed' and delivery.attempts < 3)
      or (
        delivery.status = 'sending'
        and delivery.attempts < 3
        and delivery.status_at < v_now - interval '15 minutes'
      )
    )
  returning
    delivery.id,
    delivery.workspace_id,
    delivery.kind,
    case delivery.kind
      when 'before' then settings.template_before
      when 'due' then settings.template_due
      else settings.template_overdue
    end,
    settings.template_language,
    settings.phone_number_id,
    credential.access_token,
    settings.header_image_url,
    settings.pix_key,
    delivery.recipient_phone,
    delivery.contact_name,
    charge.description,
    charge.gross_total,
    delivery.due_date
  )
  select * from claimed;
end;
$$;

-- Resultado do envio feito pelo agendador.
create or replace function public.record_whatsapp_send_result(
  p_delivery_id uuid,
  p_wa_message_id text default null,
  p_error_message text default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.whatsapp_reminder_deliveries
  set
    status = case when p_wa_message_id is null then 'failed' else 'sent' end,
    wa_message_id = p_wa_message_id,
    error_message = left(p_error_message, 500),
    sent_at = case when p_wa_message_id is null then null else statement_timestamp() end,
    status_at = statement_timestamp()
  where id = p_delivery_id
    and status = 'sending';
$$;

-- Status vindo do webhook da Meta. Nunca regride (lido não volta a entregue); falha só vale
-- enquanto a mensagem não foi entregue.
create or replace function public.record_whatsapp_status(
  p_wa_message_id text,
  p_status text,
  p_error_message text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  if p_status not in ('sent', 'delivered', 'read', 'failed') then
    return false;
  end if;

  update public.whatsapp_reminder_deliveries
  set
    status = p_status,
    error_message = case when p_status = 'failed' then left(p_error_message, 500) else null end,
    status_at = statement_timestamp()
  where wa_message_id = p_wa_message_id
    and (
      case status
        when 'sending' then 0 when 'sent' then 1 when 'delivered' then 2 when 'read' then 3
        else 4
      end
    ) < (
      case p_status
        when 'sent' then 1 when 'delivered' then 2 when 'read' then 3 else 4
      end
    )
    and not (p_status = 'failed' and status in ('delivered', 'read'));

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

revoke all on function public.claim_whatsapp_reminders(timestamptz)
  from public, anon, authenticated;
revoke all on function public.record_whatsapp_send_result(uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.record_whatsapp_status(text, text, text)
  from public, anon, authenticated;
grant execute on function public.claim_whatsapp_reminders(timestamptz) to service_role;
grant execute on function public.record_whatsapp_send_result(uuid, text, text) to service_role;
grant execute on function public.record_whatsapp_status(text, text, text) to service_role;

comment on table public.whatsapp_reminder_settings is
  'Automação de lembretes de cobrança pelo WhatsApp do workspace (ADR-0024).';
comment on table public.client_whatsapp_preferences is
  'Opt-in do cliente nos lembretes pelo WhatsApp, com telefone e nome opcionais.';
comment on table public.whatsapp_reminder_deliveries is
  'Histórico idempotente de lembretes de cobrança enviados pelo WhatsApp.';
