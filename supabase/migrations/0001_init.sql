-- CV Engine schema: one row per project, one row per document.
-- Row Level Security limits every row to the signed-in owner.

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name text not null default 'Untitled project',
  target_role text not null default '',
  company text not null default '',
  region text not null default 'international',
  job_description text not null default '',
  notes text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'applied', 'interview', 'offer', 'rejected', 'archived')),
  color text not null default '#2563eb',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  kind text not null check (kind in ('cv', 'cover', 'motivation', 'sop', 'linkedin')),
  title text not null default 'Untitled',
  data jsonb not null default '{}'::jsonb,
  versions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_owner_idx on public.projects (owner_id, updated_at desc);
create index if not exists documents_project_idx on public.documents (project_id, updated_at desc);
create index if not exists documents_owner_idx on public.documents (owner_id);

alter table public.projects enable row level security;
alter table public.documents enable row level security;

drop policy if exists "projects: owner full access" on public.projects;
create policy "projects: owner full access" on public.projects
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "documents: owner full access" on public.documents;
create policy "documents: owner full access" on public.documents
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check (
    (select auth.uid()) = owner_id
    and exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid()))
  );
