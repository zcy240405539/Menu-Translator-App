create table if not exists public.translation_glossary_terms (
  id serial primary key,
  source_text text not null,
  source_language text,
  target_language text not null,
  translated_text text not null,
  context text,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint translation_glossary_terms_source_target_uc
    unique (source_text, source_language, target_language)
);

create index if not exists translation_glossary_terms_lookup_idx
  on public.translation_glossary_terms (target_language, source_language, source_text)
  where is_active = true;
