create table public.reports (
  id uuid primary key default gen_random_uuid(),
  retrieval_code_hash text not null unique,
  retrieval_code_hint text not null,
  incident_category text not null,
  incident_date text not null,
  location_mode text not null,
  location_label text,
  latitude double precision,
  longitude double precision,
  description text not null,
  supporting_details text,
  status text not null default 'received',
  ai_analysis jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  retention_until timestamptz not null default (now() + interval '90 days'),
  updated_at timestamptz not null default now()
);

grant all on public.reports to service_role;

alter table public.reports enable row level security;

create policy "No direct client access to anonymous reports"
on public.reports
for all
to anon, authenticated
using (false)
with check (false);

create index reports_retrieval_code_hash_idx on public.reports (retrieval_code_hash);
create index reports_submitted_at_idx on public.reports (submitted_at desc);

create or replace function public.update_reports_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger reports_updated_at
before update on public.reports
for each row execute function public.update_reports_updated_at();