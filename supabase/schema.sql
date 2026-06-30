create table if not exists public.quotes (
  id uuid primary key,
  quote_number text not null,
  client_name text not null,
  phone text,
  quote_value text,
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

create table if not exists public.tracking_entries (
  id uuid primary key,
  quote_id uuid references public.quotes(id) on delete cascade,
  quote_number text not null,
  client_name text not null,
  phone text,
  order_number text,
  invoice_number text,
  carrier text,
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
  seller text,
  document text,
  phone text,
  fiscal_address text,
  delivery_address text,
  state text,
  email text,
  zip_code text,
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
  uploaded_at timestamptz not null default now()
);

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
  quantity numeric not null default 0,
  group_code text,
  is_manual boolean not null default false,
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
    'return_entries',
    'warranty_entries',
    'contract_templates',
    'rotax_revenue_entries'
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
alter table public.quotes add column if not exists loss_reason jsonb;
alter table public.quotes add column if not exists history jsonb not null default '[]'::jsonb;
alter table public.tracking_entries add column if not exists invoice_number text;
alter table public.tracking_entries add column if not exists phone text;
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
alter table public.contract_templates add column if not exists mime_type text not null default 'application/pdf';
alter table public.rotax_revenue_entries add column if not exists matriz_value numeric not null default 0;
alter table public.rotax_revenue_entries add column if not exists campinas_value numeric not null default 0;
alter table public.rotax_revenue_entries add column if not exists goiania_value numeric not null default 0;
alter table public.warranty_entries add column if not exists motor_serial_number text;
alter table public.warranty_entries add column if not exists attachment_file_name text;
alter table public.warranty_entries add column if not exists attachment_file_data text;
alter table public.warranty_entries add column if not exists attachment_mime_type text;
alter table public.stock_items add column if not exists is_manual boolean not null default false;

alter table public.quotes drop constraint if exists quotes_follow_up_amount_check;
alter table public.quotes add constraint quotes_follow_up_amount_check check (follow_up_amount > 0);
alter table public.quotes drop constraint if exists quotes_follow_up_unit_check;
alter table public.quotes add constraint quotes_follow_up_unit_check check (follow_up_unit in ('days', 'hours', 'minutes'));

update public.quotes
set follow_up_amount = coalesce(follow_up_amount, follow_up_days, 1),
    follow_up_unit = coalesce(follow_up_unit, 'days'),
    follow_up_started_at = coalesce(follow_up_started_at, created_at)
where follow_up_started_at is null
   or follow_up_amount is null
   or follow_up_unit is null;

alter table public.quotes replica identity full;
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
alter table public.rotax_parts replica identity full;
alter table public.rotax_parts_catalog replica identity full;
alter table public.stock_items replica identity full;
alter table public.stock_catalog replica identity full;
alter table public.stock_transfer_lists replica identity full;
alter table public.stock_transfer_candidates replica identity full;
alter table public.return_entries replica identity full;
alter table public.warranty_entries replica identity full;
alter table public.contract_templates replica identity full;
alter table public.rotax_revenue_entries replica identity full;
alter table public.user_profiles replica identity full;
alter table public.activity_logs replica identity full;

alter table public.quotes enable row level security;
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
alter table public.rotax_parts enable row level security;
alter table public.rotax_parts_catalog enable row level security;
alter table public.stock_items enable row level security;
alter table public.stock_catalog enable row level security;
alter table public.stock_transfer_lists enable row level security;
alter table public.stock_transfer_candidates enable row level security;
alter table public.return_entries enable row level security;
alter table public.warranty_entries enable row level security;
alter table public.contract_templates enable row level security;
alter table public.rotax_revenue_entries enable row level security;
alter table public.user_profiles enable row level security;
alter table public.activity_logs enable row level security;

drop policy if exists "Authenticated users can read quotes" on public.quotes;
drop policy if exists "Authenticated users can insert quotes" on public.quotes;
drop policy if exists "Authenticated users can update quotes" on public.quotes;
drop policy if exists "Authenticated users can delete quotes" on public.quotes;
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
drop policy if exists "Authenticated users can track FollowUper presence" on realtime.messages;
drop policy if exists "Master user can read FollowUper presence" on realtime.messages;

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

create policy "Authenticated users can track FollowUper presence"
  on realtime.messages
  for insert
  to authenticated
  with check (
    realtime.topic() = 'followuper:online-users'
    and realtime.messages.extension = 'presence'
  );

create policy "Master user can read FollowUper presence"
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.topic() = 'followuper:online-users'
    and realtime.messages.extension = 'presence'
    and lower(coalesce(auth.jwt() ->> 'email', '')) = 'bruno.scotton@cdsav.com.br'
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
end $$;
