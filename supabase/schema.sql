create table if not exists public.quotes (
  id uuid primary key,
  quote_number text not null,
  client_code text,
  client_name text not null,
  phone text,
  quote_value text,
  group_codes text,
  rotax_value numeric not null default 0,
  payment_terms text,
  quote_date date not null,
  seller text not null check (seller in ('Elton', 'Bruno', 'Stephanie')),
  notes text,
  is_interest boolean not null default false,
  loss_reason jsonb,
  history jsonb not null default '[]'::jsonb,
  follow_up_days integer not null default 1 check (follow_up_days >= 1),
  follow_up_amount numeric not null default 1 check (follow_up_amount > 0),
  follow_up_unit text not null default 'days' check (follow_up_unit in ('days', 'hours', 'minutes')),
  follow_up_started_at timestamptz,
  status text not null default 'sem-resposta' check (status in ('sem-resposta', 'negociacao', 'fechada')),
  status_updated_at timestamptz not null,
  archived_at timestamptz,
  close_details jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.online_quotes (
  id uuid primary key default gen_random_uuid(),
  control_number text,
  source text not null default 'rotax-system',
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  customer_prefix text,
  customer_state text,
  customer jsonb not null default '{}'::jsonb,
  items jsonb not null default '[]'::jsonb,
  quote_text text,
  codes_tsv text,
  status text not null default 'nova' check (status in ('nova', 'em-analise', 'finalizada')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tracking_entries (
  id uuid primary key,
  quote_id uuid references public.quotes(id) on delete cascade,
  quote_number text not null,
  client_code text,
  client_name text not null,
  phone text,
  order_number text,
  invoice_number text,
  invoice_issue_date text,
  carrier text,
  carrier_code text,
  freight_value text,
  tracking_code text,
  correios_update_failed boolean not null default false,
  delivery_situation text not null default 'etiqueta' check (
    delivery_situation in (
      'Entregue',
      'Disponível para Retirada',
      'Não encontrado na Base dados',
      'Manifestação',
      'NÃO ENTREGUE',
      'Em correção de rota',
      'Correio não atendido',
      'Em transferencia',
      'Preparando para entrega',
      'saiu para entrega',
      'Postado após limite de horário',
      'etiqueta',
      'Importação'
    )
  ),
  expected_delivery_date date,
  notes text,
  status text not null default 'Em andamento' check (status in ('Em andamento', 'Finalizado', 'Importação')),
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shipping_carriers (
  code text primary key,
  name text not null,
  ddd text,
  phone text,
  uploaded_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.shipping_carrier_uploads (
  id text primary key,
  file_name text,
  uploaded_at timestamptz not null default now()
);

create table if not exists public.info_blocks (
  id uuid primary key,
  block_type text not null default 'text' check (block_type in ('text', 'title', 'bullet', 'toggle', 'divider', 'image', 'table', 'link', 'sidebar')),
  content text,
  position numeric not null default 0,
  is_open boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rotax_training_blocks (
  id uuid primary key,
  category text not null check (category in ('internal', 'explanation', 'indications')),
  title text,
  body text,
  is_open boolean not null default true,
  position numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rotax_training_sessions (
  id uuid primary key,
  training_date date not null unique,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rotax_training_sessions
  add column if not exists archived_at timestamptz;

create table if not exists public.rotax_training_students (
  id uuid primary key,
  training_session_id uuid references public.rotax_training_sessions(id) on delete set null,
  name text not null,
  email text,
  training_types text[] not null default '{}',
  contract_done boolean not null default false,
  contract_signed boolean not null default false,
  quote_number text,
  order_number text,
  address text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rotax_training_contacts (
  id uuid primary key,
  name text not null,
  contact text,
  status text not null default 'Em contato' check (status in ('Em contato', 'Manter na lista')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.upload_audits (
  id uuid primary key,
  user_email text,
  file_name text,
  summary jsonb not null default '{}'::jsonb,
  total_open_value numeric not null default 0,
  total_closed_value numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key,
  client_code text,
  client_name text not null,
  store_code text,
  seller text,
  document text,
  cpf text,
  cnpj text,
  person_type text,
  trade_name text,
  phone text,
  ddd text,
  phone_number text,
  mobile text,
  fiscal_address text,
  city text,
  neighborhood text,
  complement text,
  delivery_address text,
  state text,
  state_registration text,
  email text,
  invoice_email text,
  commercial_email text,
  billing_email text,
  zip_code text,
  last_purchase_at date,
  purchase_count text,
  purchases jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_entries (
  id text primary key,
  seller text not null,
  row_key text not null,
  row_data jsonb not null default '{}'::jsonb,
  notes text,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_uploads (
  seller text primary key,
  file_name text,
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  user_name text,
  entry_count integer not null default 0,
  uploaded_at timestamptz not null default now(),
  previous_entries jsonb,
  previous_upload jsonb,
  has_snapshot boolean not null default false
);

alter table public.billing_uploads add column if not exists previous_entries jsonb;
alter table public.billing_uploads add column if not exists previous_upload jsonb;
alter table public.billing_uploads add column if not exists has_snapshot boolean not null default false;

create or replace function public.replace_billing_entries_with_snapshot(
  p_seller text,
  p_rows jsonb,
  p_upload jsonb
)
returns setof public.billing_entries
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_previous_entries jsonb;
  v_previous_upload jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(entry_row) order by entry_row.order_index), '[]'::jsonb)
    into v_previous_entries
  from public.billing_entries entry_row
  where entry_row.seller = p_seller;

  select to_jsonb(upload_row) - 'previous_entries' - 'previous_upload' - 'has_snapshot'
    into v_previous_upload
  from public.billing_uploads upload_row
  where upload_row.seller = p_seller;

  delete from public.billing_entries where seller = p_seller;

  insert into public.billing_entries (
    id,
    seller,
    row_key,
    row_data,
    notes,
    order_index,
    created_at,
    updated_at
  )
  select
    row_data.id,
    row_data.seller,
    row_data.row_key,
    row_data.row_data,
    row_data.notes,
    row_data.order_index,
    row_data.created_at,
    row_data.updated_at
  from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb)) as row_data(
    id text,
    seller text,
    row_key text,
    row_data jsonb,
    notes text,
    order_index integer,
    created_at timestamptz,
    updated_at timestamptz
  );

  insert into public.billing_uploads (
    seller,
    file_name,
    user_id,
    user_email,
    user_name,
    entry_count,
    uploaded_at,
    previous_entries,
    previous_upload,
    has_snapshot
  )
  values (
    p_seller,
    coalesce(p_upload->>'file_name', ''),
    nullif(p_upload->>'user_id', '')::uuid,
    coalesce(p_upload->>'user_email', ''),
    coalesce(p_upload->>'user_name', ''),
    coalesce((p_upload->>'entry_count')::integer, 0),
    coalesce((p_upload->>'uploaded_at')::timestamptz, now()),
    v_previous_entries,
    v_previous_upload,
    true
  )
  on conflict (seller) do update set
    file_name = excluded.file_name,
    user_id = excluded.user_id,
    user_email = excluded.user_email,
    user_name = excluded.user_name,
    entry_count = excluded.entry_count,
    uploaded_at = excluded.uploaded_at,
    previous_entries = excluded.previous_entries,
    previous_upload = excluded.previous_upload,
    has_snapshot = true;

  return query
  select *
  from public.billing_entries
  where seller = p_seller
  order by order_index;
end;
$$;

create or replace function public.restore_last_billing_upload(p_seller text)
returns setof public.billing_entries
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_previous_entries jsonb;
  v_previous_upload jsonb;
  v_has_snapshot boolean;
begin
  select previous_entries, previous_upload, has_snapshot
    into v_previous_entries, v_previous_upload, v_has_snapshot
  from public.billing_uploads
  where seller = p_seller
  for update;

  if not found or not coalesce(v_has_snapshot, false) then
    raise exception 'Não há upload anterior disponível para restauração.';
  end if;

  delete from public.billing_entries where seller = p_seller;

  insert into public.billing_entries (
    id,
    seller,
    row_key,
    row_data,
    notes,
    order_index,
    created_at,
    updated_at
  )
  select
    row_data.id,
    row_data.seller,
    row_data.row_key,
    row_data.row_data,
    row_data.notes,
    row_data.order_index,
    row_data.created_at,
    row_data.updated_at
  from jsonb_to_recordset(coalesce(v_previous_entries, '[]'::jsonb)) as row_data(
    id text,
    seller text,
    row_key text,
    row_data jsonb,
    notes text,
    order_index integer,
    created_at timestamptz,
    updated_at timestamptz
  );

  if v_previous_upload is null then
    delete from public.billing_uploads where seller = p_seller;
  else
    update public.billing_uploads
    set
      file_name = coalesce(v_previous_upload->>'file_name', ''),
      user_id = nullif(v_previous_upload->>'user_id', '')::uuid,
      user_email = coalesce(v_previous_upload->>'user_email', ''),
      user_name = coalesce(v_previous_upload->>'user_name', ''),
      entry_count = coalesce((v_previous_upload->>'entry_count')::integer, 0),
      uploaded_at = coalesce((v_previous_upload->>'uploaded_at')::timestamptz, now()),
      previous_entries = null,
      previous_upload = null,
      has_snapshot = false
    where seller = p_seller;
  end if;

  return query
  select *
  from public.billing_entries
  where seller = p_seller
  order by order_index;
end;
$$;

revoke all on function public.replace_billing_entries_with_snapshot(text, jsonb, jsonb) from public;
grant execute on function public.replace_billing_entries_with_snapshot(text, jsonb, jsonb) to authenticated;
revoke all on function public.restore_last_billing_upload(text) from public;
grant execute on function public.restore_last_billing_upload(text) to authenticated;

create table if not exists public.rotax_parts (
  pn_key text primary key,
  part_number text not null,
  description text,
  unit text,
  suggested_price numeric not null default 0,
  cruzeiro_price numeric not null default 0,
  batch_id uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.rotax_parts_catalog (
  id text primary key,
  batch_id uuid not null,
  file_name text,
  item_count integer not null default 0,
  updated_by text,
  updated_at timestamptz not null default now()
);

create table if not exists public.stock_items (
  product_key text primary key,
  product text not null,
  description text,
  quantity numeric not null default 0,
  group_code text,
  is_manual boolean not null default false,
  batch_id uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.stock_product_descriptions (
  product_key text primary key,
  product text not null,
  description text not null,
  group_code text,
  updated_at timestamptz not null default now()
);

create table if not exists public.stock_product_addresses (
  product_key text primary key,
  product text not null,
  address text not null,
  batch_id uuid not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.stock_catalog (
  id text primary key,
  batch_id uuid not null,
  file_name text,
  item_count integer not null default 0,
  updated_by text,
  updated_at timestamptz not null default now()
);

create table if not exists public.stock_transfer_lists (
  id uuid primary key,
  name text not null,
  items jsonb not null default '[]'::jsonb,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stock_transfer_candidates (
  product_key text primary key,
  product text not null,
  quantity numeric not null default 0 check (quantity > 0),
  group_code text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dashboard_settings (
  id text primary key,
  period_key text not null default 'current',
  updated_by text,
  updated_at timestamptz not null default now()
);

create table if not exists public.dashboard_monthly_snapshots (
  period_key text primary key,
  quotes_data jsonb not null default '[]'::jsonb,
  captured_by text,
  captured_at timestamptz not null default now()
);

create table if not exists public.return_entries (
  id uuid primary key,
  invoice_number text not null,
  return_type text not null default 'Total' check (return_type in ('Total', 'Parcial')),
  items jsonb not null default '[]'::jsonb,
  status text not null default 'Aguardando retorno cliente' check (
    status in (
      'Aguardando retorno cliente',
      'Solicitado carta faturamento',
      'Aguardando finalização faturamento',
      'Aguardando item chegar matriz',
      'Finalizado'
    )
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.warranty_entries (
  id uuid primary key,
  warranty_number text not null,
  motor_serial_number text,
  statuses jsonb not null default '[]'::jsonb,
  notes text,
  attachment_file_name text,
  attachment_file_data text,
  attachment_mime_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contract_templates (
  template_type text primary key check (template_type in ('motor', 'training', 'return')),
  file_name text not null,
  file_data text not null,
  mime_type text not null default 'application/pdf',
  updated_at timestamptz not null default now()
);

create table if not exists public.rotax_revenue_entries (
  id uuid primary key,
  entry_year integer not null check (entry_year >= 2020),
  entry_month integer not null check (entry_month between 1 and 12),
  revenue_value numeric not null default 0,
  target_value numeric not null default 0,
  matriz_value numeric not null default 0,
  campinas_value numeric not null default 0,
  goiania_value numeric not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entry_year, entry_month)
);

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  current_view text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id bigint generated always as identity primary key,
  user_id uuid,
  user_email text,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  entity_type text not null,
  entity_id text,
  identifier text,
  changed_fields jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id uuid primary key,
  message text not null,
  target_type text not null default 'user' check (target_type in ('user', 'named', 'all')),
  target_user_id uuid references auth.users(id) on delete set null,
  target_email text,
  target_name text,
  created_by_id uuid references auth.users(id) on delete set null,
  created_by_email text,
  schedule_type text not null default 'immediate' check (schedule_type in ('immediate', 'first_login', 'interval', 'date')),
  interval_amount integer not null default 1 check (interval_amount >= 1),
  interval_unit text not null default 'minutes' check (interval_unit in ('minutes', 'hours')),
  scheduled_dates jsonb not null default '[]'::jsonb,
  scheduled_time text,
  next_due_at timestamptz,
  snoozed_until timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.regularization_entries (
  id uuid primary key,
  row_key text not null unique,
  client_code text not null,
  store_code text,
  client_name text not null,
  accumulated_value numeric not null default 0,
  phone text,
  mobile text,
  invoice_email text,
  contract_email text,
  commercial_email text,
  seller text not null,
  status text not null default 'priority_not_sent' check (
    status in ('priority_not_sent', 'sent', 'received_signature', 'signed', 'refused', 'no_whatsapp')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.log_user_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_data jsonb := '{}'::jsonb;
  new_data jsonb := '{}'::jsonb;
  record_data jsonb := '{}'::jsonb;
  changed_fields jsonb := '[]'::jsonb;
  record_id text;
  record_identifier text;
  actor_email text;
begin
  if tg_op <> 'INSERT' then
    old_data := to_jsonb(old);
  end if;

  if tg_op <> 'DELETE' then
    new_data := to_jsonb(new);
  end if;

  old_data := old_data - array['attachment_file_data', 'file_data', 'purchases'];
  new_data := new_data - array['attachment_file_data', 'file_data', 'purchases'];
  record_data := case when tg_op = 'DELETE' then old_data else new_data end;

  if tg_op = 'UPDATE' then
    select coalesce(jsonb_agg(changed.key order by changed.key), '[]'::jsonb)
      into changed_fields
      from (
        select keys.key
        from jsonb_object_keys(new_data || old_data) as keys(key)
        where new_data -> keys.key is distinct from old_data -> keys.key
          and keys.key not in ('updated_at', 'last_seen_at')
      ) changed;
  end if;

  record_id := coalesce(
    record_data ->> 'id',
    record_data ->> 'template_type',
    record_data ->> 'user_id'
  );
  record_identifier := coalesce(
    record_data ->> 'quote_number',
    record_data ->> 'order_number',
    record_data ->> 'invoice_number',
    record_data ->> 'warranty_number',
    record_data ->> 'client_name',
    record_data ->> 'name',
    record_data ->> 'training_date',
    record_data ->> 'template_type',
    record_id
  );
  actor_email := coalesce(auth.jwt() ->> 'email', 'Sistema');

  insert into public.activity_logs (
    user_id, user_email, action, entity_type, entity_id, identifier, changed_fields
  )
  values (
    auth.uid(), actor_email, tg_op, tg_table_name, record_id, record_identifier, changed_fields
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

do $$
declare
  audited_table text;
begin
  foreach audited_table in array array[
    'quotes',
    'tracking_entries',
    'info_blocks',
    'rotax_training_blocks',
    'rotax_training_sessions',
    'rotax_training_students',
    'rotax_training_contacts',
    'upload_audits',
    'customers',
    'billing_entries',
    'billing_uploads',
    'rotax_parts_catalog',
    'stock_catalog',
    'stock_transfer_lists',
    'stock_transfer_candidates',
    'dashboard_settings',
    'return_entries',
    'warranty_entries',
    'contract_templates',
    'rotax_revenue_entries',
    'reminders',
    'regularization_entries'
  ]
  loop
    execute format('drop trigger if exists audit_user_changes on public.%I', audited_table);
    execute format(
      'create trigger audit_user_changes after insert or update or delete on public.%I for each row execute function public.log_user_activity()',
      audited_table
    );
  end loop;
end;
$$;

alter table public.info_blocks drop constraint if exists info_blocks_block_type_check;
alter table public.info_blocks
  add constraint info_blocks_block_type_check
  check (block_type in ('text', 'title', 'bullet', 'toggle', 'divider', 'image', 'table', 'link', 'sidebar'));

alter table public.quotes add column if not exists follow_up_amount numeric not null default 1;
alter table public.quotes add column if not exists follow_up_unit text not null default 'days';
alter table public.quotes add column if not exists follow_up_started_at timestamptz;
alter table public.quotes add column if not exists archived_at timestamptz;
alter table public.quotes add column if not exists notes text;
alter table public.quotes add column if not exists is_interest boolean not null default false;
alter table public.quotes add column if not exists phone text;
alter table public.quotes add column if not exists quote_value text;
alter table public.quotes add column if not exists group_codes text;
alter table public.quotes add column if not exists rotax_value numeric not null default 0;
alter table public.quotes add column if not exists loss_reason jsonb;
alter table public.quotes add column if not exists history jsonb not null default '[]'::jsonb;
alter table public.online_quotes add column if not exists control_number text;
alter table public.online_quotes add column if not exists source text not null default 'rotax-system';
alter table public.online_quotes add column if not exists customer_name text;
alter table public.online_quotes add column if not exists customer_email text;
alter table public.online_quotes add column if not exists customer_phone text;
alter table public.online_quotes add column if not exists customer_prefix text;
alter table public.online_quotes add column if not exists customer_state text;
alter table public.online_quotes add column if not exists customer jsonb not null default '{}'::jsonb;
alter table public.online_quotes add column if not exists items jsonb not null default '[]'::jsonb;
alter table public.online_quotes add column if not exists quote_text text;
alter table public.online_quotes add column if not exists codes_tsv text;
alter table public.online_quotes add column if not exists status text not null default 'nova';
alter table public.online_quotes add column if not exists notes text;
alter table public.online_quotes add column if not exists created_at timestamptz not null default now();
alter table public.online_quotes add column if not exists updated_at timestamptz not null default now();
alter table public.tracking_entries add column if not exists invoice_number text;
alter table public.tracking_entries add column if not exists invoice_issue_date text;
alter table public.tracking_entries add column if not exists phone text;
alter table public.quotes add column if not exists client_code text;
alter table public.tracking_entries add column if not exists client_code text;
alter table public.tracking_entries add column if not exists carrier_code text;
alter table public.tracking_entries add column if not exists freight_value text;
alter table public.tracking_entries add column if not exists correios_update_failed boolean not null default false;
alter table public.tracking_entries drop constraint if exists tracking_entries_delivery_situation_check;
alter table public.tracking_entries
  add constraint tracking_entries_delivery_situation_check
  check (
    delivery_situation in (
      'Entregue',
      'Disponível para Retirada',
      'Não encontrado na Base dados',
      'Manifestação',
      'NÃO ENTREGUE',
      'Em correção de rota',
      'Correio não atendido',
      'Em transferencia',
      'Preparando para entrega',
      'saiu para entrega',
      'Postado após limite de horário',
      'etiqueta',
      'Importação'
    )
  );
alter table public.tracking_entries drop constraint if exists tracking_entries_status_check;
alter table public.tracking_entries
  add constraint tracking_entries_status_check
  check (status in ('Em andamento', 'Finalizado', 'Importação'));
alter table public.customers add column if not exists seller text;
alter table public.customers add column if not exists store_code text;
alter table public.customers add column if not exists cpf text;
alter table public.customers add column if not exists cnpj text;
alter table public.customers add column if not exists person_type text;
alter table public.customers add column if not exists trade_name text;
alter table public.customers add column if not exists ddd text;
alter table public.customers add column if not exists phone_number text;
alter table public.customers add column if not exists mobile text;
alter table public.customers add column if not exists city text;
alter table public.customers add column if not exists neighborhood text;
alter table public.customers add column if not exists complement text;
alter table public.customers add column if not exists state_registration text;
alter table public.customers add column if not exists invoice_email text;
alter table public.customers add column if not exists commercial_email text;
alter table public.customers add column if not exists billing_email text;
alter table public.customers add column if not exists last_purchase_at date;
alter table public.customers add column if not exists purchase_count text;
alter table public.contract_templates add column if not exists mime_type text not null default 'application/pdf';
alter table public.rotax_revenue_entries add column if not exists matriz_value numeric not null default 0;
alter table public.rotax_revenue_entries add column if not exists campinas_value numeric not null default 0;
alter table public.rotax_revenue_entries add column if not exists goiania_value numeric not null default 0;
alter table public.warranty_entries add column if not exists motor_serial_number text;
alter table public.warranty_entries add column if not exists attachment_file_name text;
alter table public.warranty_entries add column if not exists attachment_file_data text;
alter table public.warranty_entries add column if not exists attachment_mime_type text;
alter table public.stock_items add column if not exists is_manual boolean not null default false;
alter table public.stock_items add column if not exists description text;
alter table public.reminders add column if not exists scheduled_dates jsonb not null default '[]'::jsonb;
alter table public.reminders add column if not exists scheduled_time text;
alter table public.reminders drop constraint if exists reminders_schedule_type_check;
alter table public.reminders
  add constraint reminders_schedule_type_check
  check (schedule_type in ('immediate', 'first_login', 'interval', 'date'));
alter table public.regularization_entries add column if not exists row_key text;
alter table public.regularization_entries add column if not exists client_code text;
alter table public.regularization_entries add column if not exists store_code text;
alter table public.regularization_entries add column if not exists client_name text;
alter table public.regularization_entries add column if not exists accumulated_value numeric not null default 0;
alter table public.regularization_entries add column if not exists phone text;
alter table public.regularization_entries add column if not exists mobile text;
alter table public.regularization_entries add column if not exists invoice_email text;
alter table public.regularization_entries add column if not exists contract_email text;
alter table public.regularization_entries add column if not exists commercial_email text;
alter table public.regularization_entries add column if not exists seller text;
alter table public.regularization_entries add column if not exists status text not null default 'priority_not_sent';
alter table public.regularization_entries add column if not exists created_at timestamptz not null default now();
alter table public.regularization_entries add column if not exists updated_at timestamptz not null default now();
alter table public.regularization_entries drop constraint if exists regularization_entries_status_check;
alter table public.regularization_entries
  add constraint regularization_entries_status_check
  check (status in ('priority_not_sent', 'sent', 'received_signature', 'signed', 'refused', 'no_whatsapp'));
create unique index if not exists regularization_entries_row_key_key on public.regularization_entries(row_key);

alter table public.quotes drop constraint if exists quotes_follow_up_amount_check;
alter table public.quotes add constraint quotes_follow_up_amount_check check (follow_up_amount > 0);
alter table public.quotes drop constraint if exists quotes_follow_up_unit_check;
alter table public.quotes add constraint quotes_follow_up_unit_check check (follow_up_unit in ('days', 'hours', 'minutes'));
alter table public.online_quotes drop constraint if exists online_quotes_status_check;
alter table public.online_quotes add constraint online_quotes_status_check check (status in ('nova', 'em-analise', 'finalizada'));

update public.quotes
set follow_up_amount = coalesce(follow_up_amount, follow_up_days, 1),
    follow_up_unit = coalesce(follow_up_unit, 'days'),
    follow_up_started_at = coalesce(follow_up_started_at, created_at)
where follow_up_started_at is null
   or follow_up_amount is null
   or follow_up_unit is null;

alter table public.quotes replica identity full;
alter table public.online_quotes replica identity full;
alter table public.tracking_entries replica identity full;
alter table public.info_blocks replica identity full;
alter table public.rotax_training_blocks replica identity full;
alter table public.rotax_training_sessions replica identity full;
alter table public.rotax_training_students replica identity full;
alter table public.rotax_training_contacts replica identity full;
alter table public.upload_audits replica identity full;
alter table public.customers replica identity full;
alter table public.billing_entries replica identity full;
alter table public.billing_uploads replica identity full;
alter table public.shipping_carriers replica identity full;
alter table public.shipping_carrier_uploads replica identity full;
alter table public.rotax_parts replica identity full;
alter table public.rotax_parts_catalog replica identity full;
alter table public.stock_items replica identity full;
alter table public.stock_product_descriptions replica identity full;
alter table public.stock_product_addresses replica identity full;
alter table public.stock_catalog replica identity full;
alter table public.stock_transfer_lists replica identity full;
alter table public.stock_transfer_candidates replica identity full;
alter table public.dashboard_settings replica identity full;
alter table public.dashboard_monthly_snapshots replica identity full;
alter table public.return_entries replica identity full;
alter table public.warranty_entries replica identity full;
alter table public.contract_templates replica identity full;
alter table public.rotax_revenue_entries replica identity full;
alter table public.user_profiles replica identity full;
alter table public.activity_logs replica identity full;
alter table public.reminders replica identity full;
alter table public.regularization_entries replica identity full;

alter table public.quotes enable row level security;
alter table public.online_quotes enable row level security;
alter table public.tracking_entries enable row level security;
alter table public.info_blocks enable row level security;
alter table public.rotax_training_blocks enable row level security;
alter table public.rotax_training_sessions enable row level security;
alter table public.rotax_training_students enable row level security;
alter table public.rotax_training_contacts enable row level security;
alter table public.upload_audits enable row level security;
alter table public.customers enable row level security;
alter table public.billing_entries enable row level security;
alter table public.billing_uploads enable row level security;
alter table public.shipping_carriers enable row level security;
alter table public.shipping_carrier_uploads enable row level security;
alter table public.rotax_parts enable row level security;
alter table public.rotax_parts_catalog enable row level security;
alter table public.stock_items enable row level security;
alter table public.stock_product_descriptions enable row level security;
alter table public.stock_product_addresses enable row level security;
alter table public.stock_catalog enable row level security;
alter table public.stock_transfer_lists enable row level security;
alter table public.stock_transfer_candidates enable row level security;
alter table public.dashboard_settings enable row level security;
alter table public.dashboard_monthly_snapshots enable row level security;
alter table public.return_entries enable row level security;
alter table public.warranty_entries enable row level security;
alter table public.contract_templates enable row level security;
alter table public.rotax_revenue_entries enable row level security;
alter table public.user_profiles enable row level security;
alter table public.activity_logs enable row level security;
alter table public.reminders enable row level security;
alter table public.regularization_entries enable row level security;

drop policy if exists "Authenticated users can read quotes" on public.quotes;
drop policy if exists "Authenticated users can insert quotes" on public.quotes;
drop policy if exists "Authenticated users can update quotes" on public.quotes;
drop policy if exists "Authenticated users can delete quotes" on public.quotes;
drop policy if exists "Authenticated users can read online quotes" on public.online_quotes;
drop policy if exists "Authenticated users can update online quotes" on public.online_quotes;
drop policy if exists "Authenticated users can delete online quotes" on public.online_quotes;
drop policy if exists "Authenticated users can read tracking entries" on public.tracking_entries;
drop policy if exists "Authenticated users can insert tracking entries" on public.tracking_entries;
drop policy if exists "Authenticated users can update tracking entries" on public.tracking_entries;
drop policy if exists "Authenticated users can delete tracking entries" on public.tracking_entries;
drop policy if exists "Authenticated users can read info blocks" on public.info_blocks;
drop policy if exists "Authenticated users can insert info blocks" on public.info_blocks;
drop policy if exists "Authenticated users can update info blocks" on public.info_blocks;
drop policy if exists "Authenticated users can delete info blocks" on public.info_blocks;
drop policy if exists "Authenticated users can read rotax training blocks" on public.rotax_training_blocks;
drop policy if exists "Authenticated users can insert rotax training blocks" on public.rotax_training_blocks;
drop policy if exists "Authenticated users can update rotax training blocks" on public.rotax_training_blocks;
drop policy if exists "Authenticated users can delete rotax training blocks" on public.rotax_training_blocks;
drop policy if exists "Authenticated users can read rotax training sessions" on public.rotax_training_sessions;
drop policy if exists "Authenticated users can insert rotax training sessions" on public.rotax_training_sessions;
drop policy if exists "Authenticated users can update rotax training sessions" on public.rotax_training_sessions;
drop policy if exists "Authenticated users can delete rotax training sessions" on public.rotax_training_sessions;
drop policy if exists "Authenticated users can read rotax training students" on public.rotax_training_students;
drop policy if exists "Authenticated users can insert rotax training students" on public.rotax_training_students;
drop policy if exists "Authenticated users can update rotax training students" on public.rotax_training_students;
drop policy if exists "Authenticated users can delete rotax training students" on public.rotax_training_students;
drop policy if exists "Authenticated users can read rotax training contacts" on public.rotax_training_contacts;
drop policy if exists "Authenticated users can insert rotax training contacts" on public.rotax_training_contacts;
drop policy if exists "Authenticated users can update rotax training contacts" on public.rotax_training_contacts;
drop policy if exists "Authenticated users can delete rotax training contacts" on public.rotax_training_contacts;
drop policy if exists "Authenticated users can read upload audits" on public.upload_audits;
drop policy if exists "Authenticated users can insert upload audits" on public.upload_audits;
drop policy if exists "Authenticated users can read customers" on public.customers;
drop policy if exists "Authenticated users can insert customers" on public.customers;
drop policy if exists "Authenticated users can update customers" on public.customers;
drop policy if exists "Authenticated users can delete customers" on public.customers;
drop policy if exists "Authenticated users can read billing entries" on public.billing_entries;
drop policy if exists "Authenticated users can insert billing entries" on public.billing_entries;
drop policy if exists "Authenticated users can update billing entries" on public.billing_entries;
drop policy if exists "Authenticated users can delete billing entries" on public.billing_entries;
drop policy if exists "Authenticated users can read billing uploads" on public.billing_uploads;
drop policy if exists "Authenticated users can insert billing uploads" on public.billing_uploads;
drop policy if exists "Authenticated users can update billing uploads" on public.billing_uploads;
drop policy if exists "Authenticated users can read shipping carriers" on public.shipping_carriers;
drop policy if exists "Authenticated users can insert shipping carriers" on public.shipping_carriers;
drop policy if exists "Authenticated users can update shipping carriers" on public.shipping_carriers;
drop policy if exists "Authenticated users can delete shipping carriers" on public.shipping_carriers;
drop policy if exists "Authenticated users can read shipping carrier uploads" on public.shipping_carrier_uploads;
drop policy if exists "Authenticated users can insert shipping carrier uploads" on public.shipping_carrier_uploads;
drop policy if exists "Authenticated users can update shipping carrier uploads" on public.shipping_carrier_uploads;
drop policy if exists "Authenticated users can read Rotax parts" on public.rotax_parts;
drop policy if exists "Authenticated users can insert Rotax parts" on public.rotax_parts;
drop policy if exists "Authenticated users can update Rotax parts" on public.rotax_parts;
drop policy if exists "Authenticated users can delete Rotax parts" on public.rotax_parts;
drop policy if exists "Authenticated users can read Rotax parts catalog" on public.rotax_parts_catalog;
drop policy if exists "Authenticated users can insert Rotax parts catalog" on public.rotax_parts_catalog;
drop policy if exists "Authenticated users can update Rotax parts catalog" on public.rotax_parts_catalog;
drop policy if exists "Authenticated users can read stock items" on public.stock_items;
drop policy if exists "Authenticated users can insert stock items" on public.stock_items;
drop policy if exists "Authenticated users can update stock items" on public.stock_items;
drop policy if exists "Authenticated users can delete stock items" on public.stock_items;
drop policy if exists "Authenticated users can read stock descriptions" on public.stock_product_descriptions;
drop policy if exists "Authenticated users can insert stock descriptions" on public.stock_product_descriptions;
drop policy if exists "Authenticated users can update stock descriptions" on public.stock_product_descriptions;
drop policy if exists "Authenticated users can read stock addresses" on public.stock_product_addresses;
drop policy if exists "Authenticated users can insert stock addresses" on public.stock_product_addresses;
drop policy if exists "Authenticated users can update stock addresses" on public.stock_product_addresses;
drop policy if exists "Authenticated users can delete stock addresses" on public.stock_product_addresses;
drop policy if exists "Authenticated users can read stock catalog" on public.stock_catalog;
drop policy if exists "Authenticated users can insert stock catalog" on public.stock_catalog;
drop policy if exists "Authenticated users can update stock catalog" on public.stock_catalog;
drop policy if exists "Authenticated users can read stock transfer lists" on public.stock_transfer_lists;
drop policy if exists "Authenticated users can insert stock transfer lists" on public.stock_transfer_lists;
drop policy if exists "Authenticated users can update stock transfer lists" on public.stock_transfer_lists;
drop policy if exists "Authenticated users can delete stock transfer lists" on public.stock_transfer_lists;
drop policy if exists "Authenticated users can read stock transfer candidates" on public.stock_transfer_candidates;
drop policy if exists "Authenticated users can insert stock transfer candidates" on public.stock_transfer_candidates;
drop policy if exists "Authenticated users can update stock transfer candidates" on public.stock_transfer_candidates;
drop policy if exists "Authenticated users can delete stock transfer candidates" on public.stock_transfer_candidates;
drop policy if exists "Authenticated users can read dashboard settings" on public.dashboard_settings;
drop policy if exists "Master user can insert dashboard settings" on public.dashboard_settings;
drop policy if exists "Master user can update dashboard settings" on public.dashboard_settings;
drop policy if exists "Authenticated users can read dashboard snapshots" on public.dashboard_monthly_snapshots;
drop policy if exists "Authenticated users can insert dashboard snapshots" on public.dashboard_monthly_snapshots;
drop policy if exists "Authenticated users can update dashboard snapshots" on public.dashboard_monthly_snapshots;
drop policy if exists "Authenticated users can read return entries" on public.return_entries;
drop policy if exists "Authenticated users can insert return entries" on public.return_entries;
drop policy if exists "Authenticated users can update return entries" on public.return_entries;
drop policy if exists "Authenticated users can delete return entries" on public.return_entries;
drop policy if exists "Authenticated users can read warranty entries" on public.warranty_entries;
drop policy if exists "Authenticated users can insert warranty entries" on public.warranty_entries;
drop policy if exists "Authenticated users can update warranty entries" on public.warranty_entries;
drop policy if exists "Authenticated users can delete warranty entries" on public.warranty_entries;
drop policy if exists "Authenticated users can read contract templates" on public.contract_templates;
drop policy if exists "Authenticated users can insert contract templates" on public.contract_templates;
drop policy if exists "Authenticated users can update contract templates" on public.contract_templates;
drop policy if exists "Authenticated users can delete contract templates" on public.contract_templates;
drop policy if exists "Master user can read rotax revenue entries" on public.rotax_revenue_entries;
drop policy if exists "Master user can insert rotax revenue entries" on public.rotax_revenue_entries;
drop policy if exists "Master user can update rotax revenue entries" on public.rotax_revenue_entries;
drop policy if exists "Master user can delete rotax revenue entries" on public.rotax_revenue_entries;
drop policy if exists "Authenticated users can read rotax revenue entries" on public.rotax_revenue_entries;
drop policy if exists "Authenticated users can insert rotax revenue entries" on public.rotax_revenue_entries;
drop policy if exists "Authenticated users can update rotax revenue entries" on public.rotax_revenue_entries;
drop policy if exists "Authenticated users can delete rotax revenue entries" on public.rotax_revenue_entries;
drop policy if exists "Users can read own profile and master can read all" on public.user_profiles;
drop policy if exists "Users can create own profile" on public.user_profiles;
drop policy if exists "Users can update own profile" on public.user_profiles;
drop policy if exists "Master user can read activity logs" on public.activity_logs;
drop policy if exists "Master user can delete old activity logs" on public.activity_logs;
drop policy if exists "Authenticated users can read reminders" on public.reminders;
drop policy if exists "Authenticated users can insert reminders" on public.reminders;
drop policy if exists "Authenticated users can update reminders" on public.reminders;
drop policy if exists "Authenticated users can delete reminders" on public.reminders;
drop policy if exists "Authenticated users can read regularization entries" on public.regularization_entries;
drop policy if exists "Authenticated users can insert regularization entries" on public.regularization_entries;
drop policy if exists "Authenticated users can update regularization entries" on public.regularization_entries;
drop policy if exists "Authenticated users can delete regularization entries" on public.regularization_entries;
drop policy if exists "Authenticated users can track FollowUper presence" on realtime.messages;
drop policy if exists "Master user can read FollowUper presence" on realtime.messages;
drop policy if exists "Authenticated users can read FollowUper presence" on realtime.messages;

create policy "Authenticated users can read quotes"
  on public.quotes
  for select
  to authenticated
  using (true);

create policy "Authenticated users can insert quotes"
  on public.quotes
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update quotes"
  on public.quotes
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete quotes"
  on public.quotes
  for delete
  to authenticated
  using (true);

create policy "Authenticated users can read online quotes"
  on public.online_quotes
  for select
  to authenticated
  using (true);

create policy "Authenticated users can update online quotes"
  on public.online_quotes
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete online quotes"
  on public.online_quotes
  for delete
  to authenticated
  using (true);

create policy "Authenticated users can read tracking entries"
  on public.tracking_entries
  for select
  to authenticated
  using (true);

create policy "Authenticated users can insert tracking entries"
  on public.tracking_entries
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update tracking entries"
  on public.tracking_entries
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete tracking entries"
  on public.tracking_entries
  for delete
  to authenticated
  using (true);

create policy "Authenticated users can read info blocks"
  on public.info_blocks
  for select
  to authenticated
  using (true);

create policy "Authenticated users can insert info blocks"
  on public.info_blocks
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update info blocks"
  on public.info_blocks
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete info blocks"
  on public.info_blocks
  for delete
  to authenticated
  using (true);

create policy "Authenticated users can read rotax training blocks"
  on public.rotax_training_blocks
  for select
  to authenticated
  using (true);

create policy "Authenticated users can insert rotax training blocks"
  on public.rotax_training_blocks
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update rotax training blocks"
  on public.rotax_training_blocks
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete rotax training blocks"
  on public.rotax_training_blocks
  for delete
  to authenticated
  using (true);

create policy "Authenticated users can read rotax training sessions"
  on public.rotax_training_sessions
  for select
  to authenticated
  using (true);

create policy "Authenticated users can insert rotax training sessions"
  on public.rotax_training_sessions
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update rotax training sessions"
  on public.rotax_training_sessions
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete rotax training sessions"
  on public.rotax_training_sessions
  for delete
  to authenticated
  using (true);

create policy "Authenticated users can read rotax training students"
  on public.rotax_training_students
  for select
  to authenticated
  using (true);

create policy "Authenticated users can insert rotax training students"
  on public.rotax_training_students
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update rotax training students"
  on public.rotax_training_students
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete rotax training students"
  on public.rotax_training_students
  for delete
  to authenticated
  using (true);

create policy "Authenticated users can read rotax training contacts"
  on public.rotax_training_contacts
  for select
  to authenticated
  using (true);

create policy "Authenticated users can insert rotax training contacts"
  on public.rotax_training_contacts
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update rotax training contacts"
  on public.rotax_training_contacts
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete rotax training contacts"
  on public.rotax_training_contacts
  for delete
  to authenticated
  using (true);

create policy "Authenticated users can read upload audits"
  on public.upload_audits
  for select
  to authenticated
  using (true);

create policy "Authenticated users can insert upload audits"
  on public.upload_audits
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can read customers"
  on public.customers
  for select
  to authenticated
  using (true);

create policy "Authenticated users can insert customers"
  on public.customers
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update customers"
  on public.customers
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete customers"
  on public.customers
  for delete
  to authenticated
  using (true);

create policy "Authenticated users can read billing entries"
  on public.billing_entries
  for select
  to authenticated
  using (true);

create policy "Authenticated users can insert billing entries"
  on public.billing_entries
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update billing entries"
  on public.billing_entries
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete billing entries"
  on public.billing_entries
  for delete
  to authenticated
  using (true);

create policy "Authenticated users can read billing uploads"
  on public.billing_uploads
  for select
  to authenticated
  using (true);

create policy "Authenticated users can insert billing uploads"
  on public.billing_uploads
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update billing uploads"
  on public.billing_uploads
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can read shipping carriers"
  on public.shipping_carriers
  for select
  to authenticated
  using (true);

create policy "Authenticated users can insert shipping carriers"
  on public.shipping_carriers
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update shipping carriers"
  on public.shipping_carriers
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete shipping carriers"
  on public.shipping_carriers
  for delete
  to authenticated
  using (true);

create policy "Authenticated users can read shipping carrier uploads"
  on public.shipping_carrier_uploads
  for select
  to authenticated
  using (true);

create policy "Authenticated users can insert shipping carrier uploads"
  on public.shipping_carrier_uploads
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update shipping carrier uploads"
  on public.shipping_carrier_uploads
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can read Rotax parts"
  on public.rotax_parts
  for select
  to authenticated
  using (true);

create policy "Authenticated users can insert Rotax parts"
  on public.rotax_parts
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update Rotax parts"
  on public.rotax_parts
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete Rotax parts"
  on public.rotax_parts
  for delete
  to authenticated
  using (true);

create policy "Authenticated users can read Rotax parts catalog"
  on public.rotax_parts_catalog
  for select
  to authenticated
  using (true);

create policy "Authenticated users can insert Rotax parts catalog"
  on public.rotax_parts_catalog
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update Rotax parts catalog"
  on public.rotax_parts_catalog
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can read stock items"
  on public.stock_items
  for select
  to authenticated
  using (true);

create policy "Authenticated users can insert stock items"
  on public.stock_items
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update stock items"
  on public.stock_items
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete stock items"
  on public.stock_items
  for delete
  to authenticated
  using (true);

create policy "Authenticated users can read stock descriptions"
  on public.stock_product_descriptions
  for select
  to authenticated
  using (true);

create policy "Authenticated users can insert stock descriptions"
  on public.stock_product_descriptions
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update stock descriptions"
  on public.stock_product_descriptions
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can read stock addresses"
  on public.stock_product_addresses
  for select
  to authenticated
  using (true);

create policy "Authenticated users can insert stock addresses"
  on public.stock_product_addresses
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update stock addresses"
  on public.stock_product_addresses
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete stock addresses"
  on public.stock_product_addresses
  for delete
  to authenticated
  using (true);

create policy "Authenticated users can read stock catalog"
  on public.stock_catalog
  for select
  to authenticated
  using (true);

create policy "Authenticated users can insert stock catalog"
  on public.stock_catalog
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update stock catalog"
  on public.stock_catalog
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can read stock transfer lists"
  on public.stock_transfer_lists
  for select
  to authenticated
  using (true);

create policy "Authenticated users can insert stock transfer lists"
  on public.stock_transfer_lists
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update stock transfer lists"
  on public.stock_transfer_lists
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete stock transfer lists"
  on public.stock_transfer_lists
  for delete
  to authenticated
  using (true);

create policy "Authenticated users can read stock transfer candidates"
  on public.stock_transfer_candidates
  for select
  to authenticated
  using (true);

create policy "Authenticated users can insert stock transfer candidates"
  on public.stock_transfer_candidates
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update stock transfer candidates"
  on public.stock_transfer_candidates
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete stock transfer candidates"
  on public.stock_transfer_candidates
  for delete
  to authenticated
  using (true);

create policy "Authenticated users can read dashboard settings"
  on public.dashboard_settings
  for select
  to authenticated
  using (true);

create policy "Master user can insert dashboard settings"
  on public.dashboard_settings
  for insert
  to authenticated
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'bruno.scotton@cdsav.com.br');

create policy "Master user can update dashboard settings"
  on public.dashboard_settings
  for update
  to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'bruno.scotton@cdsav.com.br')
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'bruno.scotton@cdsav.com.br');

create policy "Authenticated users can read dashboard snapshots"
  on public.dashboard_monthly_snapshots
  for select
  to authenticated
  using (true);

create policy "Authenticated users can insert dashboard snapshots"
  on public.dashboard_monthly_snapshots
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update dashboard snapshots"
  on public.dashboard_monthly_snapshots
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can read return entries"
  on public.return_entries
  for select
  to authenticated
  using (true);

create policy "Authenticated users can insert return entries"
  on public.return_entries
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update return entries"
  on public.return_entries
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete return entries"
  on public.return_entries
  for delete
  to authenticated
  using (true);

create policy "Authenticated users can read warranty entries"
  on public.warranty_entries
  for select
  to authenticated
  using (true);

create policy "Authenticated users can insert warranty entries"
  on public.warranty_entries
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update warranty entries"
  on public.warranty_entries
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete warranty entries"
  on public.warranty_entries
  for delete
  to authenticated
  using (true);

create policy "Authenticated users can read contract templates"
  on public.contract_templates
  for select
  to authenticated
  using (true);

create policy "Authenticated users can insert contract templates"
  on public.contract_templates
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update contract templates"
  on public.contract_templates
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete contract templates"
  on public.contract_templates
  for delete
  to authenticated
  using (true);

create policy "Authenticated users can read rotax revenue entries"
  on public.rotax_revenue_entries
  for select
  to authenticated
  using (true);

create policy "Authenticated users can insert rotax revenue entries"
  on public.rotax_revenue_entries
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update rotax revenue entries"
  on public.rotax_revenue_entries
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete rotax revenue entries"
  on public.rotax_revenue_entries
  for delete
  to authenticated
  using (true);

create policy "Users can read own profile and master can read all"
  on public.user_profiles
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or lower(coalesce(auth.jwt() ->> 'email', '')) = 'bruno.scotton@cdsav.com.br'
  );

create policy "Users can create own profile"
  on public.user_profiles
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy "Users can update own profile"
  on public.user_profiles
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy "Master user can read activity logs"
  on public.activity_logs
  for select
  to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'bruno.scotton@cdsav.com.br');

create policy "Master user can delete old activity logs"
  on public.activity_logs
  for delete
  to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'bruno.scotton@cdsav.com.br');

create policy "Authenticated users can read reminders"
  on public.reminders
  for select
  to authenticated
  using (true);

create policy "Authenticated users can insert reminders"
  on public.reminders
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update reminders"
  on public.reminders
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete reminders"
  on public.reminders
  for delete
  to authenticated
  using (true);

create policy "Authenticated users can read regularization entries"
  on public.regularization_entries
  for select
  to authenticated
  using (true);

create policy "Authenticated users can insert regularization entries"
  on public.regularization_entries
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update regularization entries"
  on public.regularization_entries
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete regularization entries"
  on public.regularization_entries
  for delete
  to authenticated
  using (true);

create policy "Authenticated users can track FollowUper presence"
  on realtime.messages
  for insert
  to authenticated
  with check (
    realtime.topic() = 'followuper:online-users'
    and realtime.messages.extension = 'presence'
  );

create policy "Authenticated users can read FollowUper presence"
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.topic() = 'followuper:online-users'
    and realtime.messages.extension = 'presence'
  );

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'quotes'
  ) then
    alter publication supabase_realtime add table public.quotes;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'online_quotes'
  ) then
    alter publication supabase_realtime add table public.online_quotes;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tracking_entries'
  ) then
    alter publication supabase_realtime add table public.tracking_entries;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'info_blocks'
  ) then
    alter publication supabase_realtime add table public.info_blocks;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'rotax_training_blocks'
  ) then
    alter publication supabase_realtime add table public.rotax_training_blocks;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'rotax_training_sessions'
  ) then
    alter publication supabase_realtime add table public.rotax_training_sessions;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'rotax_training_students'
  ) then
    alter publication supabase_realtime add table public.rotax_training_students;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'rotax_training_contacts'
  ) then
    alter publication supabase_realtime add table public.rotax_training_contacts;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'upload_audits'
  ) then
    alter publication supabase_realtime add table public.upload_audits;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'customers'
  ) then
    alter publication supabase_realtime add table public.customers;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'billing_entries'
  ) then
    alter publication supabase_realtime add table public.billing_entries;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'billing_uploads'
  ) then
    alter publication supabase_realtime add table public.billing_uploads;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'shipping_carriers'
  ) then
    alter publication supabase_realtime add table public.shipping_carriers;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'shipping_carrier_uploads'
  ) then
    alter publication supabase_realtime add table public.shipping_carrier_uploads;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'rotax_parts_catalog'
  ) then
    alter publication supabase_realtime add table public.rotax_parts_catalog;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'stock_catalog'
  ) then
    alter publication supabase_realtime add table public.stock_catalog;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'stock_transfer_lists'
  ) then
    alter publication supabase_realtime add table public.stock_transfer_lists;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'stock_transfer_candidates'
  ) then
    alter publication supabase_realtime add table public.stock_transfer_candidates;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'dashboard_settings'
  ) then
    alter publication supabase_realtime add table public.dashboard_settings;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'return_entries'
  ) then
    alter publication supabase_realtime add table public.return_entries;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'warranty_entries'
  ) then
    alter publication supabase_realtime add table public.warranty_entries;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'contract_templates'
  ) then
    alter publication supabase_realtime add table public.contract_templates;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'rotax_revenue_entries'
  ) then
    alter publication supabase_realtime add table public.rotax_revenue_entries;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_profiles'
  ) then
    alter publication supabase_realtime add table public.user_profiles;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'activity_logs'
  ) then
    alter publication supabase_realtime add table public.activity_logs;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'reminders'
  ) then
    alter publication supabase_realtime add table public.reminders;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'regularization_entries'
  ) then
    alter publication supabase_realtime add table public.regularization_entries;
  end if;
end $$;
