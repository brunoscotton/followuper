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
      'etiqueta'
    )
  ),
  expected_delivery_date date,
  notes text,
  status text not null default 'Em andamento' check (status in ('Em andamento', 'Finalizado')),
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
alter table public.customers add column if not exists seller text;
alter table public.rotax_revenue_entries add column if not exists matriz_value numeric not null default 0;
alter table public.rotax_revenue_entries add column if not exists campinas_value numeric not null default 0;
alter table public.rotax_revenue_entries add column if not exists goiania_value numeric not null default 0;

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
alter table public.rotax_revenue_entries replica identity full;

alter table public.quotes enable row level security;
alter table public.tracking_entries enable row level security;
alter table public.info_blocks enable row level security;
alter table public.rotax_training_blocks enable row level security;
alter table public.rotax_training_sessions enable row level security;
alter table public.rotax_training_students enable row level security;
alter table public.rotax_training_contacts enable row level security;
alter table public.upload_audits enable row level security;
alter table public.customers enable row level security;
alter table public.rotax_revenue_entries enable row level security;

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
drop policy if exists "Master user can read rotax revenue entries" on public.rotax_revenue_entries;
drop policy if exists "Master user can insert rotax revenue entries" on public.rotax_revenue_entries;
drop policy if exists "Master user can update rotax revenue entries" on public.rotax_revenue_entries;
drop policy if exists "Master user can delete rotax revenue entries" on public.rotax_revenue_entries;

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

create policy "Master user can read rotax revenue entries"
  on public.rotax_revenue_entries
  for select
  to authenticated
  using (lower(auth.jwt() ->> 'email') = 'bruno.scotton@cdsav.com.br');

create policy "Master user can insert rotax revenue entries"
  on public.rotax_revenue_entries
  for insert
  to authenticated
  with check (lower(auth.jwt() ->> 'email') = 'bruno.scotton@cdsav.com.br');

create policy "Master user can update rotax revenue entries"
  on public.rotax_revenue_entries
  for update
  to authenticated
  using (lower(auth.jwt() ->> 'email') = 'bruno.scotton@cdsav.com.br')
  with check (lower(auth.jwt() ->> 'email') = 'bruno.scotton@cdsav.com.br');

create policy "Master user can delete rotax revenue entries"
  on public.rotax_revenue_entries
  for delete
  to authenticated
  using (lower(auth.jwt() ->> 'email') = 'bruno.scotton@cdsav.com.br');

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
      and tablename = 'rotax_revenue_entries'
  ) then
    alter publication supabase_realtime add table public.rotax_revenue_entries;
  end if;
end $$;
