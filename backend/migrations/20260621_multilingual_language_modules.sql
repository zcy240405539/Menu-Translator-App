-- Add source-language scoping for parser configuration tables.

alter table public.noise_keywords
  add column if not exists source_language text;

alter table public.unit_translations
  add column if not exists source_language text;

alter table public.noise_keywords
  drop constraint if exists noise_keywords_keyword_key cascade;

alter table public.noise_keywords
  drop constraint if exists noise_keywords_source_keyword_uc cascade;

alter table public.unit_translations
  drop constraint if exists unique_unit_lang cascade;

alter table public.unit_translations
  drop constraint if exists unique_unit_source_target_lang cascade;

create unique index if not exists noise_keywords_source_keyword_idx
  on public.noise_keywords (coalesce(source_language, ''), lower(keyword));

create unique index if not exists unit_translations_source_target_idx
  on public.unit_translations (coalesce(source_language, ''), lower(source_unit), target_lang);

insert into public.noise_keywords (source_language, keyword)
values
  (null, 'allergy'),
  (null, 'allergen'),
  (null, 'tax'),
  (null, 'gratuity'),
  ('en', 'substitutions'),
  ('en', 'extra charge'),
  ('en', 'order online'),
  ('zh', '营业时间'),
  ('zh', '地址'),
  ('zh', '电话'),
  ('zh', '微信'),
  ('zh', '温馨提示'),
  ('zh', '服务费'),
  ('es', 'iva'),
  ('es', 'propina'),
  ('es', 'servicio'),
  ('es', 'alérgenos'),
  ('es', 'alergenos'),
  ('es', 'reservas')
on conflict do nothing;

insert into public.unit_translations (source_language, source_unit, target_lang, translated_unit)
values
  ('en', 'oz', 'zh', '盎司'),
  ('en', 'lb', 'zh', '磅'),
  ('en', 'pcs', 'zh', '件'),
  ('zh', '份', 'en', 'serving'),
  ('zh', '位', 'en', 'person'),
  ('zh', '例', 'en', 'portion'),
  ('zh', '碗', 'en', 'bowl'),
  ('zh', '杯', 'en', 'cup'),
  ('es', 'copa', 'en', 'glass'),
  ('es', 'botella', 'en', 'bottle'),
  ('es', 'ración', 'en', 'portion'),
  ('es', 'media ración', 'en', 'half portion')
on conflict do nothing;
