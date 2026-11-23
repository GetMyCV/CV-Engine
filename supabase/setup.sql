-- CV Engine: complete database setup.
-- Paste this whole file into Supabase -> SQL Editor -> New query -> Run.
-- Safe to run more than once. (Same as supabase/migrations/0001 + 0002.)

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


-- Admin-only access + client template requests.
--
-- 1. Only emails listed in public.admins can read or write projects, documents
--    and requests — even if someone manages to create an auth account.
--    (Also turn OFF "Allow new users to sign up" in Supabase → Authentication
--    after creating the admin account.)
-- 2. Clients never sign in. The /choose page inserts their template choice
--    into template_selections with the public anon key; only admins can read it.

create table if not exists public.admins (
  email text primary key
);
insert into public.admins (email) values ('inbox.ashen@gmail.com') on conflict do nothing;
alter table public.admins enable row level security;
-- No policies: the table is only readable through the security-definer function below.

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where email = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

-- Projects and documents: owner AND admin.
drop policy if exists "projects: owner full access" on public.projects;
drop policy if exists "projects: admin owner full access" on public.projects;
create policy "projects: admin owner full access" on public.projects
  for all to authenticated
  using ((select auth.uid()) = owner_id and (select public.is_admin()))
  with check ((select auth.uid()) = owner_id and (select public.is_admin()));

drop policy if exists "documents: owner full access" on public.documents;
drop policy if exists "documents: admin owner full access" on public.documents;
create policy "documents: admin owner full access" on public.documents
  for all to authenticated
  using ((select auth.uid()) = owner_id and (select public.is_admin()))
  with check (
    (select auth.uid()) = owner_id
    and (select public.is_admin())
    and exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid()))
  );

-- Requests the admin sends to clients.
create table if not exists public.template_requests (
  id uuid primary key,
  owner_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists template_requests_owner_idx on public.template_requests (owner_id, updated_at desc);
alter table public.template_requests enable row level security;
drop policy if exists "template_requests: admin" on public.template_requests;
create policy "template_requests: admin" on public.template_requests
  for all to authenticated
  using ((select auth.uid()) = owner_id and (select public.is_admin()))
  with check ((select auth.uid()) = owner_id and (select public.is_admin()));

-- Choices submitted by clients from the /choose page.
create table if not exists public.template_selections (
  id uuid primary key default gen_random_uuid(),
  request_id text not null check (char_length(request_id) between 1 and 64),
  design_id text not null check (char_length(design_id) between 1 and 64),
  client_name text not null default '' check (char_length(client_name) <= 120),
  client_email text not null default '' check (char_length(client_email) <= 200),
  client_phone text not null default '' check (char_length(client_phone) <= 60),
  notes text not null default '' check (char_length(notes) <= 2000),
  created_at timestamptz not null default now()
);
create index if not exists template_selections_created_idx on public.template_selections (created_at desc);
alter table public.template_selections enable row level security;

drop policy if exists "template_selections: anyone can submit" on public.template_selections;
create policy "template_selections: anyone can submit" on public.template_selections
  for insert to anon, authenticated
  with check (true);

drop policy if exists "template_selections: admin reads" on public.template_selections;
create policy "template_selections: admin reads" on public.template_selections
  for select to authenticated
  using ((select public.is_admin()));

drop policy if exists "template_selections: admin deletes" on public.template_selections;
create policy "template_selections: admin deletes" on public.template_selections
  for delete to authenticated
  using ((select public.is_admin()));
