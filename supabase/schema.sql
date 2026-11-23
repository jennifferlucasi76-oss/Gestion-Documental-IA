-- ============================================================================
-- SGDI-IA: Sistema de Gestión Documental Inteligente (Prototipo de Tesis)
-- Script SQL inicial para Supabase (PostgreSQL + pgvector + Storage + RLS)
-- ============================================================================

-- 1. Habilitar extensión vectorial (pgvector)
create extension if not exists vector;

-- 2. Tabla de perfiles y roles (vinculada a auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'consulta'
    check (role in ('admin', 'secretaria', 'docente', 'consulta')),
  department text not null default 'General',
  created_at timestamptz not null default now()
);

-- Trigger para crear automáticamente el perfil cuando se registra un usuario
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, department)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    'consulta',
    'General'
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

-- Categorías iniciales de ejemplo (ajustar según levantamiento en la unidad educativa)
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
    check (action in ('UPLOAD', 'SEARCH', 'VIEW', 'DOWNLOAD', 'VERIFY_HASH', 'LOGIN')),
  document_id uuid references public.documents(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 8. Seguridad: Función auxiliar de niveles de acceso + Row Level Security (RLS)
-- ============================================================================

create or replace function public.can_access_level(doc_level text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role in ('admin', 'secretaria')
        or (p.role = 'docente' and doc_level in ('publico', 'interno'))
        or (p.role = 'consulta' and doc_level = 'publico')
      )
  );
$$;

alter table public.profiles enable row level security;
alter table public.document_types enable row level security;
alter table public.documents enable row level security;
alter table public.document_metadata enable row level security;
alter table public.document_vectors enable row level security;
alter table public.audit_logs enable row level security;

-- Políticas para profiles
create policy "Usuarios ven su propio perfil o admin ve todos"
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Solo admin actualiza roles de perfiles"
  on public.profiles for update
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Políticas para document_types
create policy "Usuarios autenticados leen tipos documentales"
  on public.document_types for select
  to authenticated
  using (true);

create policy "Solo admin gestiona tipos documentales"
  on public.document_types for all
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Políticas para documents
create policy "Lectura de documentos según nivel de acceso del rol"
  on public.documents for select
  to authenticated
  using (public.can_access_level(access_level));

create policy "Admin y secretaria pueden subir documentos"
  on public.documents for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'secretaria')
    )
  );

-- Políticas para document_metadata
create policy "Lectura de metadatos ligada al acceso del documento"
  on public.document_metadata for select
  to authenticated
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id and public.can_access_level(d.access_level)
    )
  );

create policy "Admin y secretaria insertan metadatos"
  on public.document_metadata for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'secretaria')
    )
  );

-- Políticas para document_vectors
create policy "Lectura de vectores ligada al acceso del documento"
  on public.document_vectors for select
  to authenticated
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id and public.can_access_level(d.access_level)
    )
  );

create policy "Admin y secretaria insertan vectores"
  on public.document_vectors for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'secretaria')
    )
  );

-- Políticas para audit_logs
create policy "Admin ve toda la bitácora; usuario ve sus propios registros"
  on public.audit_logs for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Usuarios autenticados registran eventos propios en bitácora"
  on public.audit_logs for insert
  to authenticated
  with check (user_id = auth.uid());

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

create policy "Admin y secretaria suben archivos al bucket privado"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'documentos'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'secretaria')
    )
  );

