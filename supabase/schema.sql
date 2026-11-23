-- ============================================================================
-- SGDI-IA: Sistema de Gestión Documental Inteligente (Unidad Educativa San José)
-- Script SQL para Supabase (PostgreSQL + pgvector + Storage + RLS)
-- ============================================================================

-- 1. Habilitar extensión vectorial (pgvector) y esquema privado para helpers RLS
create extension if not exists vector;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- 2. Tabla de perfiles y roles institucionales (vinculada a auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  identification text unique,
  full_name text not null default '',
  institutional_email text,
  role text not null default 'docente'
    check (role in ('rector', 'secretaria', 'docente', 'coordinador')),
  department text not null default 'General',
  must_change_password boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_identification
  on public.profiles (identification);

-- Helper no recursivo para consultar el rol del usuario autenticado en políticas RLS
create or replace function private.current_user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid();
$$;

revoke all on function private.current_user_role() from public;
grant execute on function private.current_user_role() to authenticated;

-- Trigger para crear automáticamente el perfil cuando se crea un usuario en auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, identification, full_name, role, department)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'identification', split_part(new.email, '@', 1))), ''),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    'docente',
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'department'), ''), 'General')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. Catálogo de tipos documentales predefinidos
create table if not exists public.document_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  default_access_level text not null default 'interno'
    check (default_access_level in ('publico', 'interno', 'confidencial')),
  created_at timestamptz not null default now()
);

insert into public.document_types (name, description, default_access_level) values
  ('Oficio', 'Comunicaciones oficiales externas o interinstitucionales', 'interno'),
  ('Memorando', 'Comunicaciones internas entre dependencias o autoridades', 'interno'),
  ('Circular', 'Disposiciones o avisos generales dirigidos a la comunidad educativa', 'publico'),
  ('Acta', 'Registros formales de reuniones, juntas o consejos', 'confidencial'),
  ('Certificado', 'Constancias académicas o laborales emitidas por la institución', 'confidencial'),
  ('Resolución', 'Decisiones normativas o administrativas de rectorado', 'interno'),
  ('Solicitud', 'Peticiones formales presentadas por docentes, personal o representantes', 'interno')
on conflict (name) do nothing;

-- 4. Tabla principal de documentos (incluye hash SHA-256 para integridad)
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  file_name text not null,
  file_type text not null check (file_type in ('pdf', 'docx')),
  file_size_bytes bigint not null,
  storage_path text not null unique,
  sha256_hash text not null,
  document_type_id uuid references public.document_types(id) on delete set null,
  confidence_score double precision,
  access_level text not null default 'interno'
    check (access_level in ('publico', 'interno', 'confidencial')),
  uploaded_by uuid references public.profiles(id) on delete set null,
  extracted_text text,
  created_at timestamptz not null default now()
);

-- 5. Metadatos extraídos automáticamente mediante PLN
create table if not exists public.document_metadata (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null unique references public.documents(id) on delete cascade,
  emission_date date,
  author text,
  origin_department text,
  topic text,
  keywords text[] not null default '{}',
  entities jsonb not null default '[]'::jsonb,
  summary text,
  created_at timestamptz not null default now()
);

-- 6. Vectores / Embeddings por fragmentos del documento (768 dimensiones para Gemini)
create table if not exists public.document_vectors (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  chunk_index integer not null,
  chunk_text text not null,
  embedding vector(768) not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_document_vectors_embedding
  on public.document_vectors
  using hnsw (embedding vector_cosine_ops);

create index if not exists idx_documents_type
  on public.documents (document_type_id);

create index if not exists idx_documents_access_level
  on public.documents (access_level);

-- 7. Bitácora de auditoría (trazabilidad e integridad - Itinerario Seguridad)
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  action text not null
    check (action in ('UPLOAD', 'SEARCH', 'VIEW', 'DOWNLOAD', 'VERIFY_HASH', 'LOGIN', 'CREATE_USER', 'BULK_IMPORT_USERS', 'DELETE_USER', 'CHANGE_PASSWORD', 'DELETE_DOCUMENT', 'UPDATE_TAXONOMY')),
  document_id uuid references public.documents(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 8. Seguridad: Niveles de acceso + Row Level Security (RLS)
-- ============================================================================

create or replace function public.can_access_level(doc_level text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select case private.current_user_role()
    when 'rector' then true
    when 'secretaria' then true
    when 'coordinador' then doc_level in ('publico', 'interno')
    when 'docente' then doc_level in ('publico', 'interno')
    else false
  end;
$$;

revoke all on function public.can_access_level(text) from public;
grant execute on function public.can_access_level(text) to authenticated;

alter table public.profiles enable row level security;
alter table public.document_types enable row level security;
alter table public.documents enable row level security;
alter table public.document_metadata enable row level security;
alter table public.document_vectors enable row level security;
alter table public.audit_logs enable row level security;

-- Políticas para profiles
drop policy if exists "Usuarios ven su propio perfil o admin ve todos" on public.profiles;
drop policy if exists "Usuarios ven su propio perfil o rector ve todos" on public.profiles;
create policy "Usuarios ven su propio perfil o rector ve todos"
  on public.profiles for select
  to authenticated
  using (
    id = (select auth.uid())
    or (select private.current_user_role()) = 'rector'
  );

drop policy if exists "Solo admin actualiza roles de perfiles" on public.profiles;
drop policy if exists "Solo rector actualiza roles de perfiles" on public.profiles;
create policy "Solo rector actualiza roles de perfiles"
  on public.profiles for update
  to authenticated
  using ((select private.current_user_role()) = 'rector')
  with check ((select private.current_user_role()) = 'rector');

-- Políticas para document_types
drop policy if exists "Usuarios autenticados leen tipos documentales" on public.document_types;
create policy "Usuarios autenticados leen tipos documentales"
  on public.document_types for select
  to authenticated
  using (true);

drop policy if exists "Solo admin gestiona tipos documentales" on public.document_types;
drop policy if exists "Solo rector gestiona tipos documentales" on public.document_types;
create policy "Solo rector gestiona tipos documentales"
  on public.document_types for all
  to authenticated
  using ((select private.current_user_role()) = 'rector')
  with check ((select private.current_user_role()) = 'rector');

-- Políticas para documents
drop policy if exists "Lectura de documentos según nivel de acceso del rol" on public.documents;
create policy "Lectura de documentos según nivel de acceso del rol"
  on public.documents for select
  to authenticated
  using (public.can_access_level(access_level));

drop policy if exists "Admin y secretaria pueden subir documentos" on public.documents;
drop policy if exists "Roles autorizados pueden subir documentos" on public.documents;
create policy "Roles autorizados pueden subir documentos"
  on public.documents for insert
  to authenticated
  with check (
    (select private.current_user_role()) in ('rector', 'secretaria', 'coordinador', 'docente')
  );

drop policy if exists "Rector y secretaria eliminan documentos" on public.documents;
create policy "Rector y secretaria eliminan documentos"
  on public.documents for delete
  to authenticated
  using ((select private.current_user_role()) in ('rector', 'secretaria'));

-- Políticas para document_metadata
drop policy if exists "Lectura de metadatos ligada al acceso del documento" on public.document_metadata;
create policy "Lectura de metadatos ligada al acceso del documento"
  on public.document_metadata for select
  to authenticated
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id and public.can_access_level(d.access_level)
    )
  );

drop policy if exists "Admin y secretaria insertan metadatos" on public.document_metadata;
drop policy if exists "Roles autorizados insertan metadatos" on public.document_metadata;
create policy "Roles autorizados insertan metadatos"
  on public.document_metadata for insert
  to authenticated
  with check (
    (select private.current_user_role()) in ('rector', 'secretaria', 'coordinador', 'docente')
  );

-- Políticas para document_vectors
drop policy if exists "Lectura de vectores ligada al acceso del documento" on public.document_vectors;
create policy "Lectura de vectores ligada al acceso del documento"
  on public.document_vectors for select
  to authenticated
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id and public.can_access_level(d.access_level)
    )
  );

drop policy if exists "Admin y secretaria insertan vectores" on public.document_vectors;
drop policy if exists "Roles autorizados insertan vectores" on public.document_vectors;
create policy "Roles autorizados insertan vectores"
  on public.document_vectors for insert
  to authenticated
  with check (
    (select private.current_user_role()) in ('rector', 'secretaria', 'coordinador', 'docente')
  );

-- Políticas para audit_logs
drop policy if exists "Admin ve toda la bitácora; usuario ve sus propios registros" on public.audit_logs;
drop policy if exists "Rector ve toda la bitácora; usuario ve sus propios registros" on public.audit_logs;
create policy "Rector ve toda la bitácora; usuario ve sus propios registros"
  on public.audit_logs for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.current_user_role()) = 'rector'
  );

drop policy if exists "Usuarios autenticados registran eventos propios en bitácora" on public.audit_logs;
create policy "Usuarios autenticados registran eventos propios en bitácora"
  on public.audit_logs for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- ============================================================================
-- 9. Función RPC de Búsqueda Semántica (respeta RLS por security invoker)
-- ============================================================================

create or replace function public.match_documents(
  query_embedding vector(768),
  match_threshold double precision default 0.35,
  match_count integer default 10,
  filter_type_id uuid default null
)
returns table (
  document_id uuid,
  title text,
  file_name text,
  file_type text,
  access_level text,
  document_type_name text,
  chunk_text text,
  similarity double precision,
  emission_date date,
  author text,
  origin_department text,
  keywords text[],
  sha256_hash text,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  with ranked_chunks as (
    select
      dv.document_id,
      dv.chunk_text,
      1 - (dv.embedding <=> query_embedding) as similarity,
      row_number() over (
        partition by dv.document_id
        order by dv.embedding <=> query_embedding asc
      ) as rn
    from public.document_vectors dv
    join public.documents d on d.id = dv.document_id
    where (filter_type_id is null or d.document_type_id = filter_type_id)
      and 1 - (dv.embedding <=> query_embedding) >= match_threshold
  )
  select
    d.id as document_id,
    d.title,
    d.file_name,
    d.file_type,
    d.access_level,
    dt.name as document_type_name,
    rc.chunk_text,
    rc.similarity,
    dm.emission_date,
    dm.author,
    dm.origin_department,
    dm.keywords,
    d.sha256_hash,
    d.created_at
  from ranked_chunks rc
  join public.documents d on d.id = rc.document_id
  left join public.document_types dt on dt.id = d.document_type_id
  left join public.document_metadata dm on dm.document_id = d.id
  where rc.rn = 1
  order by rc.similarity desc
  limit match_count;
$$;

-- ============================================================================
-- 10. Bucket privado en Supabase Storage
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

drop policy if exists "Lectura de archivos privados según nivel de acceso" on storage.objects;
create policy "Lectura de archivos privados según nivel de acceso"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'documentos'
    and exists (
      select 1 from public.documents d
      where d.storage_path = name and public.can_access_level(d.access_level)
    )
  );

drop policy if exists "Admin y secretaria suben archivos al bucket privado" on storage.objects;
drop policy if exists "Roles autorizados suben archivos al bucket privado" on storage.objects;
create policy "Roles autorizados suben archivos al bucket privado"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'documentos'
    and (select private.current_user_role()) in ('rector', 'secretaria', 'coordinador', 'docente')
  );

drop policy if exists "Rector y secretaria eliminan archivos del bucket privado" on storage.objects;
create policy "Rector y secretaria eliminan archivos del bucket privado"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'documentos'
    and (select private.current_user_role()) in ('rector', 'secretaria')
  );
