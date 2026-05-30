-- Allow the same menu category key to have separate translations per target language.
-- Older live databases may still have a key-only unique constraint named
-- menu_categories_normalized_key_key, which conflicts when zh and zh-Hant both
-- translate the same source category.

alter table public.menu_categories
  drop constraint if exists menu_categories_normalized_key_key;

alter table public.menu_categories
  drop constraint if exists menu_categories_normalized_key_target_language_key;

alter table public.menu_categories
  add constraint menu_categories_normalized_key_target_language_key
  unique (normalized_key, target_language);
