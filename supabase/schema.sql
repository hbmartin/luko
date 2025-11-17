-- Enable helpers -------------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Domain enums ---------------------------------------------------------------
create type public.org_role as enum ('admin', 'modeler', 'viewer');
create type public.membership_status as enum ('invited', 'accepted', 'suspended');
create type public.notebook_permission as enum ('owner', 'editor', 'commenter', 'viewer');
create type public.simulation_status as enum ('queued', 'running', 'succeeded', 'failed');
create type public.change_kind as enum ('permission', 'simulation', 'branch');

-- Core identity --------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text unique,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  full_name text,
  handle text unique,
  avatar_url text,
  organization_id uuid references public.organizations on delete set null,
  title text,
  timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  role public.org_role not null default 'viewer',
  status public.membership_status not null default 'invited',
  invited_by uuid references public.profiles on delete set null,
  invited_email citext,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

-- Notebook & worksheet ------------------------------------------------------
create table public.notebooks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  organization_id uuid references public.organizations on delete set null,
  owner_id uuid not null references public.profiles on delete cascade,
  sharing_token uuid unique default gen_random_uuid(),
  is_dirty boolean not null default false,
  dirty_fields jsonb not null default '{}'::jsonb,
  last_simulation_id uuid,
  last_viewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, lower(name)) where (deleted_at is null)
);

create table public.notebook_categories (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references public.notebooks on delete cascade,
  name text not null,
  description text,
  order_index integer not null default 0,
  time_period text,
  total_formula_id uuid,
  created_by uuid references public.profiles on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notebook_metrics (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references public.notebooks on delete cascade,
  category_id uuid not null references public.notebook_categories on delete cascade,
  name text not null,
  unit text,
  distribution jsonb,
  value numeric,
  description text,
  tags text[] not null default '{}',
  is_locked boolean not null default false,
  order_index integer not null default 0,
  version integer not null default 1,
  create_user_id uuid references public.profiles on delete set null,
  last_updated_user_id uuid references public.profiles on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (notebook_id, lower(name))
);

create table public.notebook_formulas (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references public.notebooks on delete cascade,
  category_id uuid not null references public.notebook_categories on delete cascade,
  name text not null,
  expression text not null,
  ast jsonb,
  dependent_metrics uuid[] not null default '{}',
  dependent_formulas uuid[] not null default '{}',
  version integer not null default 1,
  create_user_id uuid references public.profiles on delete set null,
  last_updated_user_id uuid references public.profiles on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (notebook_id, lower(name))
);

-- Collaboration & sharing ---------------------------------------------------
create table public.notebook_collaborators (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references public.notebooks on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  permission public.notebook_permission not null default 'viewer',
  can_run_simulations boolean not null default true,
  created_at timestamptz not null default now(),
  unique (notebook_id, user_id)
);

create table public.notebook_invites (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references public.notebooks on delete cascade,
  email citext not null,
  permission public.notebook_permission not null default 'viewer',
  message text,
  invited_by uuid references public.profiles on delete set null,
  token uuid not null default gen_random_uuid(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (notebook_id, email) where (accepted_at is null)
);

create table public.notebook_branches (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references public.notebooks on delete cascade,
  parent_branch_id uuid references public.notebook_branches on delete cascade,
  created_by uuid references public.profiles on delete set null,
  name text not null,
  notes text,
  is_customer_branch boolean not null default false,
  share_back boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  merged_at timestamptz
);

create table public.branch_snapshots (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.notebook_branches on delete cascade,
  base_simulation_id uuid references public.simulations on delete set null,
  diff jsonb not null,
  created_at timestamptz not null default now()
);

-- Activity, change log, simulations -----------------------------------------
create table public.changes_log (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references public.notebooks on delete cascade,
  branch_id uuid references public.notebook_branches on delete cascade,
  actor_id uuid references public.profiles on delete set null,
  change_type public.change_kind not null,
  entity_id uuid,
  summary text,
  prev_state jsonb,
  next_state jsonb,
  created_at timestamptz not null default now()
);

create table public.simulations (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references public.notebooks on delete cascade,
  branch_id uuid references public.notebook_branches on delete cascade,
  started_by uuid references public.profiles on delete set null,
  status public.simulation_status not null default 'queued',
  started_ts timestamptz not null default now(),
  finished_ts timestamptz,
  iterations integer not null default 100000,
  engine_version text not null default '1.0',
  input_hash text not null,
  input_snapshot jsonb not null,
  results jsonb,
  summary jsonb,
  error text
);

alter table public.notebooks
  add constraint notebooks_last_simulation_fk
  foreign key (last_simulation_id) references public.simulations on delete set null;

-- Indexes -------------------------------------------------------------------
create index on public.organization_members (user_id);
create index on public.template_categories (template_id, order_index);
create index on public.template_metrics (template_id, order_index);
create index on public.templates (family_id, version desc);
create index on public.notebooks (owner_id, updated_at desc);
create index on public.notebook_categories (notebook_id, order_index);
create index on public.notebook_metrics (notebook_id, category_id, order_index);
create index on public.notebook_formulas (notebook_id, category_id);
create index on public.notebook_collaborators (user_id);
create index on public.notebook_invites (email);
create index on public.notebook_branches (notebook_id);
create index on public.changes_log (notebook_id, created_at desc);
create index on public.simulations (notebook_id, started_ts desc);

-- Triggers ------------------------------------------------------------------
create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

create trigger templates_set_updated_at
  before update on public.templates
  for each row execute function public.set_updated_at();

create trigger notebooks_set_updated_at
  before update on public.notebooks
  for each row execute function public.set_updated_at();

create trigger notebook_categories_set_updated_at
  before update on public.notebook_categories
  for each row execute function public.set_updated_at();

create trigger notebook_metrics_set_updated_at
  before update on public.notebook_metrics
  for each row execute function public.set_updated_at();

create trigger notebook_formulas_set_updated_at
  before update on public.notebook_formulas
  for each row execute function public.set_updated_at();

create trigger notebook_branches_set_updated_at
  before update on public.notebook_branches
  for each row execute function public.set_updated_at();

-- RLS policies --------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.templates enable row level security;
alter table public.template_categories enable row level security;
alter table public.template_metrics enable row level security;
alter table public.template_formulas enable row level security;
alter table public.notebooks enable row level security;
alter table public.notebook_categories enable row level security;
alter table public.notebook_metrics enable row level security;
alter table public.notebook_formulas enable row level security;
alter table public.notebook_collaborators enable row level security;
alter table public.notebook_invites enable row level security;
alter table public.notebook_branches enable row level security;
alter table public.branch_snapshots enable row level security;
alter table public.changes_log enable row level security;
alter table public.simulations enable row level security;

create policy profiles_self on public.profiles
  for select using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy org_member_profiles on public.profiles
  for select using (
    exists (
      select 1 from public.organization_members om
      where om.user_id = public.profiles.user_id
        and om.organization_id in (
          select organization_id from public.organization_members
          where user_id = auth.uid()
        )
    )
  );

create policy org_units_manage on public.organizations
  for select using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = public.organizations.id
        and om.user_id = auth.uid()
    )
  );

create policy notebook_access on public.notebooks
  for select using (
    owner_id = auth.uid()
    or exists (
      select 1
      from public.notebook_collaborators nc
      where nc.notebook_id = public.notebooks.id
        and nc.user_id = auth.uid()
    )
  )
  with check (
    owner_id = auth.uid()
    or exists (
      select 1 from public.notebook_collaborators nc
      where nc.notebook_id = public.notebooks.id
        and nc.user_id = auth.uid()
        and nc.permission in ('editor','owner')
    )
  );

create policy notebook_children_access on public.notebook_categories
  for select using (
    exists (
      select 1 from public.notebooks n
      where n.id = public.notebook_categories.notebook_id
        and (n.owner_id = auth.uid()
             or exists (
               select 1 from public.notebook_collaborators nc
               where nc.notebook_id = n.id
                 and nc.user_id = auth.uid()
             ))
    )
  );

create policy notebook_children_access on public.notebook_metrics
  for select using (
    exists (
      select 1 from public.notebooks n
      where n.id = public.notebook_metrics.notebook_id
        and (n.owner_id = auth.uid()
             or exists (
               select 1 from public.notebook_collaborators nc
               where nc.notebook_id = n.id
                 and nc.user_id = auth.uid()
             ))
    )
  );

create policy notebook_children_access on public.notebook_formulas
  for select using (
    exists (
      select 1 from public.notebooks n
      where n.id = public.notebook_formulas.notebook_id
        and (n.owner_id = auth.uid()
             or exists (
               select 1 from public.notebook_collaborators nc
               where nc.notebook_id = n.id
                 and nc.user_id = auth.uid()
             ))
    )
  );

create policy notebook_audit_access on public.changes_log
  for select using (
    exists (
      select 1 from public.notebooks n
      where n.id = public.changes_log.notebook_id
        and (n.owner_id = auth.uid()
             or exists (
               select 1 from public.notebook_collaborators nc
               where nc.notebook_id = n.id
                 and nc.user_id = auth.uid()
             ))
    )
  );

create policy simulations_access on public.simulations
  for select using (
    exists (
      select 1 from public.notebooks n
      where n.id = public.simulations.notebook_id
        and (n.owner_id = auth.uid()
             or exists (
               select 1 from public.notebook_collaborators nc
               where nc.notebook_id = n.id
                 and nc.user_id = auth.uid()
             ))
    )
  );