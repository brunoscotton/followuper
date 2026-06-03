create table if not exists public.quotes (
  id uuid primary key,
  quote_number text not null,
  client_name text not null,
  payment_terms text,
  quote_date date not null,
  seller text not null check (seller in ('Elton', 'Bruno', 'Stephanie')),
  follow_up_days integer not null default 1 check (follow_up_days >= 1),
  status text not null default 'sem-resposta' check (status in ('sem-resposta', 'negociacao', 'fechada')),
  status_updated_at timestamptz not null,
  close_details jsonb,
  created_at timestamptz not null default now()
);

alter table public.quotes enable row level security;

drop policy if exists "Authenticated users can read quotes" on public.quotes;
drop policy if exists "Authenticated users can insert quotes" on public.quotes;
drop policy if exists "Authenticated users can update quotes" on public.quotes;
drop policy if exists "Authenticated users can delete quotes" on public.quotes;

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
