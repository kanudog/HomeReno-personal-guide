-- HomeReno core schema: projects, designs, tracking, variance, storage.
-- Single-user via RLS (user_id = auth.uid()) on every table.

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  status text not null default 'planning',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.designs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  module_id text not null default 'framing',
  name text not null,
  input jsonb not null,
  output_cache jsonb,
  engine_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  design_id uuid references public.designs(id) on delete cascade,
  seq int not null default 0,
  title text not null,
  detail text,
  member_ids text[] not null default '{}',
  assembly_step int,
  done boolean not null default false,
  done_at timestamptz,
  source text not null default 'generated',
  created_at timestamptz not null default now()
);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  body text not null,
  entry_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  journal_entry_id uuid references public.journal_entries(id) on delete set null,
  storage_path text not null,
  caption text,
  created_at timestamptz not null default now()
);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  vendor text,
  total_cents int not null default 0,
  purchased_at date default current_date,
  storage_path text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.material_estimates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  design_id uuid not null references public.designs(id) on delete cascade,
  line_id text not null,
  description text not null,
  qty_estimated numeric not null,
  unit text not null default 'ea',
  unit_cost_cents int not null default 0,
  created_at timestamptz not null default now(),
  unique (design_id, line_id)
);

create table public.material_actuals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  estimate_id uuid not null references public.material_estimates(id) on delete cascade,
  qty_purchased numeric not null default 0,
  qty_used numeric not null default 0,
  qty_leftover numeric not null default 0,
  actual_unit_cost_cents int,
  logged_at timestamptz not null default now()
);

-- Estimated-vs-actual variance, the calibration feature
create view public.material_variance
  with (security_invoker = true) as
select
  e.id as estimate_id,
  e.design_id,
  e.user_id,
  e.description,
  e.unit,
  e.qty_estimated,
  a.qty_purchased,
  a.qty_used,
  a.qty_leftover,
  case
    when e.qty_estimated > 0 and a.qty_used is not null
      then round(((a.qty_used - e.qty_estimated) / e.qty_estimated) * 100, 1)
  end as variance_pct
from public.material_estimates e
left join public.material_actuals a on a.estimate_id = e.id;

-- RLS: own rows only, on every table
alter table public.projects enable row level security;
alter table public.designs enable row level security;
alter table public.tasks enable row level security;
alter table public.journal_entries enable row level security;
alter table public.photos enable row level security;
alter table public.receipts enable row level security;
alter table public.material_estimates enable row level security;
alter table public.material_actuals enable row level security;

create policy "own projects" on public.projects for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own designs" on public.designs for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own tasks" on public.tasks for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own journal" on public.journal_entries for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own photos" on public.photos for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own receipts" on public.receipts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own estimates" on public.material_estimates for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own actuals" on public.material_actuals for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- updated_at maintenance
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger touch_projects before update on public.projects
  for each row execute function public.touch_updated_at();
create trigger touch_designs before update on public.designs
  for each row execute function public.touch_updated_at();

-- Private storage buckets; paths are {user_id}/{project_id}/{uuid}.jpg
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false), ('receipts', 'receipts', false);

create policy "own objects select" on storage.objects for select
  using (bucket_id in ('photos', 'receipts')
    and auth.uid()::text = (storage.foldername(name))[1]);
create policy "own objects insert" on storage.objects for insert
  with check (bucket_id in ('photos', 'receipts')
    and auth.uid()::text = (storage.foldername(name))[1]);
create policy "own objects delete" on storage.objects for delete
  using (bucket_id in ('photos', 'receipts')
    and auth.uid()::text = (storage.foldername(name))[1]);
