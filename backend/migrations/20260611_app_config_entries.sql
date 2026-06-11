create table if not exists public.app_config_entries (
  id bigserial primary key,
  namespace text not null,
  key text not null,
  value jsonb not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint app_config_entries_namespace_key_uc unique (namespace, key),
  constraint app_config_entries_namespace_not_blank check (btrim(namespace) <> ''),
  constraint app_config_entries_key_not_blank check (btrim(key) <> '')
);

alter table public.app_config_entries enable row level security;

create index if not exists app_config_entries_namespace_active_idx
  on public.app_config_entries (namespace, is_active);

alter table public.menu_categories
  drop constraint if exists menu_categories_normalized_key_key cascade;

alter table public.menu_categories
  drop constraint if exists menu_categories_normalized_key_target_language_uc cascade;

alter table public.menu_categories
  drop constraint if exists menu_categories_normalized_key_original_label_target_lang_uc cascade;

alter table public.menu_categories
  add constraint menu_categories_normalized_key_original_label_target_lang_uc
  unique (normalized_key, original_label, target_language);

insert into public.app_config_entries (namespace, key, value, description)
values
  ('negative_image_terms', 'chef', '"chef"', 'Reject non-dish image results'),
  ('negative_image_terms', 'cook', '"cook"', 'Reject non-dish image results'),
  ('negative_image_terms', 'cooking', '"cooking"', 'Reject non-dish image results'),
  ('negative_image_terms', 'kitchen', '"kitchen"', 'Reject non-dish image results'),
  ('negative_image_terms', 'restaurant_interior', '"restaurant interior"', 'Reject non-dish image results'),
  ('negative_image_terms', 'menu', '"menu"', 'Reject menu/sign image results'),
  ('negative_image_terms', 'sign', '"sign"', 'Reject menu/sign image results'),
  ('negative_image_terms', 'logo', '"logo"', 'Reject logo image results'),
  ('negative_image_terms', 'people', '"people"', 'Reject people image results'),
  ('negative_image_terms', 'person', '"person"', 'Reject people image results'),
  ('negative_image_terms', 'waiter', '"waiter"', 'Reject people image results'),
  ('negative_image_terms', 'waitress', '"waitress"', 'Reject people image results'),
  ('negative_image_terms', 'market', '"market"', 'Reject market/ingredient image results'),
  ('negative_image_terms', 'ingredient', '"ingredient"', 'Reject ingredient-only image results'),
  ('negative_image_terms', 'raw', '"raw"', 'Reject raw ingredient image results'),
  ('image_source_score_bonus', 'wikimedia_found', '18', 'Image search source scoring weight'),
  ('image_source_score_bonus', 'openverse_found', '17', 'Image search source scoring weight'),
  ('image_source_score_bonus', 'pexels_found', '13', 'Image search source scoring weight'),
  ('image_source_score_bonus', 'unsplash_found', '10', 'Image search source scoring weight'),
  ('dish_search_aliases', 'zhajiang noodles', '["zhajiangmian", "zha jiang mian", "noodles with soybean paste"]', 'Dish image search aliases'),
  ('dish_search_aliases', 'old beijing zhajiang noodles', '["zhajiangmian", "zha jiang mian", "beijing noodles soybean paste"]', 'Dish image search aliases'),
  ('dish_search_aliases', 'dan dan noodles', '["dandan noodles", "dan dan mian"]', 'Dish image search aliases'),
  ('dish_search_aliases', 'beef noodle soup', '["niu rou mian", "taiwanese beef noodle soup"]', 'Dish image search aliases'),
  ('dish_search_aliases', 'mapo tofu', '["ma po tofu", "mapo doufu"]', 'Dish image search aliases'),
  ('dish_search_aliases', 'kung pao chicken', '["gong bao chicken"]', 'Dish image search aliases'),
  ('dish_search_aliases', 'twice cooked pork', '["hui guo rou"]', 'Dish image search aliases'),
  ('dish_search_aliases', 'soup dumplings', '["xiaolongbao", "xiao long bao"]', 'Dish image search aliases'),
  ('dish_search_aliases', 'pork wontons', '["wontons", "huntun"]', 'Dish image search aliases'),
  ('dish_search_aliases', 'scallion pancake', '["cong you bing", "green onion pancake"]', 'Dish image search aliases'),
  ('dish_search_aliases', 'potstickers', '["guotie", "pan fried dumplings"]', 'Dish image search aliases'),
  ('dish_search_aliases', 'char siu', '["chashu pork", "bbq pork"]', 'Dish image search aliases'),
  ('dish_search_aliases', 'beef quesadilla', '["quesadilla beef"]', 'Dish image search aliases'),
  ('dish_search_aliases', 'cheese quesadilla', '["quesadilla cheese"]', 'Dish image search aliases'),
  ('dish_search_aliases', 'shrimp fajitas', '["fajitas shrimp"]', 'Dish image search aliases'),
  ('dish_search_aliases', 'chicken fajitas', '["fajitas chicken"]', 'Dish image search aliases'),
  ('dish_image_conflict_terms', 'margherita pizza', '["pepperoni", "sausage", "salami", "bacon"]', 'Dish-specific image result conflict terms'),
  ('cuisine_aliases', 'american', '"American"', 'Canonical cuisine alias'),
  ('cuisine_aliases', 'chinese', '"Chinese"', 'Canonical cuisine alias'),
  ('cuisine_aliases', 'french', '"French"', 'Canonical cuisine alias'),
  ('cuisine_aliases', 'indian', '"Indian"', 'Canonical cuisine alias'),
  ('cuisine_aliases', 'italian', '"Italian"', 'Canonical cuisine alias'),
  ('cuisine_aliases', 'japanese', '"Japanese"', 'Canonical cuisine alias'),
  ('cuisine_aliases', 'korean', '"Korean"', 'Canonical cuisine alias'),
  ('cuisine_aliases', 'mexican', '"Mexican"', 'Canonical cuisine alias'),
  ('cuisine_aliases', 'thai', '"Thai"', 'Canonical cuisine alias'),
  ('cuisine_aliases', 'vietnamese', '"Vietnamese"', 'Canonical cuisine alias'),
  ('cuisine_keywords', 'Mexican', '["\\btacos?\\b", "\\bfajitas?\\b", "\\bquesadillas?\\b", "\\bnachos?\\b", "\\btostadas?\\b", "\\bburritos?\\b", "\\benchiladas?\\b", "\\bcarnitas?\\b", "\\bcarne asada\\b", "\\bal pastor\\b", "\\bchile rellenos?\\b", "\\bchimichangas?\\b", "\\bsopapillas?\\b", "\\bguacamole\\b", "\\bpico de gallo\\b", "\\bjalape[nñ]os?\\b", "\\btortillas?\\b", "\\brefried beans?\\b", "\\bdiabla\\b", "\\bacapulco\\b", "\\bjuan''?s favorite\\b"]', 'Cuisine inference regex patterns'),
  ('cuisine_keywords', 'Italian', '["\\bpizzas?\\b", "\\bpastas?\\b", "\\bravioli\\b", "\\blasagn[ae]\\b", "\\brisotto\\b", "\\bgnocchi\\b", "\\bmozzarella\\b", "\\bbruschetta\\b", "\\bparmigiana\\b", "\\bmarinara\\b"]', 'Cuisine inference regex patterns'),
  ('cuisine_keywords', 'Chinese', '["\\bdumplings?\\b", "\\bwontons?\\b", "\\bchow mein\\b", "\\bfried rice\\b", "\\bkung pao\\b", "\\bszechuan\\b", "\\bsichuan\\b", "\\bzhajiang\\b"]', 'Cuisine inference regex patterns'),
  ('cuisine_keywords', 'Japanese', '["\\bsushi\\b", "\\bsashimi\\b", "\\bramen\\b", "\\budon\\b", "\\btempura\\b", "\\bteriyaki\\b"]', 'Cuisine inference regex patterns'),
  ('cuisine_keywords', 'Korean', '["\\bbulgogi\\b", "\\bbibimbap\\b", "\\bkimchi\\b", "\\btteokbokki\\b", "\\bkorean\\b"]', 'Cuisine inference regex patterns'),
  ('cuisine_keywords', 'Thai', '["\\bpad thai\\b", "\\btom yum\\b", "\\btom kha\\b", "\\bthai\\b", "\\bgreen curry\\b", "\\bred curry\\b"]', 'Cuisine inference regex patterns'),
  ('cuisine_keywords', 'Indian', '["\\bcurry\\b", "\\btikka\\b", "\\bmasala\\b", "\\bbiryani\\b", "\\bnaan\\b", "\\bsamosas?\\b", "\\btandoori\\b"]', 'Cuisine inference regex patterns'),
  ('cuisine_keywords', 'Vietnamese', '["\\bpho\\b", "\\bbanh mi\\b", "\\bbún\\b", "\\bvermicelli\\b", "\\bspring rolls?\\b"]', 'Cuisine inference regex patterns'),
  ('cuisine_keywords', 'American', '["\\bburgers?\\b", "\\bcheeseburgers?\\b", "\\bbaconator\\b", "\\bnuggets?\\b", "\\bwaffles?\\b", "\\bomelets?\\b", "\\bfrench toast\\b", "\\bhot dogs?\\b"]', 'Cuisine inference regex patterns'),
  ('non_cacheable_normalized_names', 'empty_string', '""', 'Invalid normalized dish cache key'),
  ('non_cacheable_normalized_names', 'empty', '"empty"', 'Invalid normalized dish cache key'),
  ('non_cacheable_normalized_names', 'null', '"null"', 'Invalid normalized dish cache key'),
  ('non_cacheable_normalized_names', 'none', '"none"', 'Invalid normalized dish cache key'),
  ('non_cacheable_normalized_names', 'unknown', '"unknown"', 'Invalid normalized dish cache key'),
  ('non_cacheable_normalized_names', 'undefined', '"undefined"', 'Invalid normalized dish cache key'),
  ('non_cacheable_normalized_names', 'n_a_slash', '"n/a"', 'Invalid normalized dish cache key'),
  ('non_cacheable_normalized_names', 'na', '"na"', 'Invalid normalized dish cache key'),
  ('non_cacheable_normalized_names', 'dish', '"dish"', 'Invalid normalized dish cache key'),
  ('non_cacheable_normalized_names', 'item', '"item"', 'Invalid normalized dish cache key'),
  ('non_cacheable_normalized_names', 'menu_item', '"menu item"', 'Invalid normalized dish cache key')
on conflict (namespace, key) do update
set value = excluded.value,
    description = excluded.description,
    is_active = true,
    updated_at = now();

insert into public.menu_categories (normalized_key, original_label, source_language, target_language, translated_label)
values
  ('appetizers', 'Appetizers', 'en', 'zh', '开胃菜'),
  ('appetizers', 'Appetizers', 'en', 'en', 'Appetizers'),
  ('appetizers', 'Appetizers', 'en', 'zh-Hant', '開胃菜'),
  ('appetizers', 'Appetizers', 'en', 'es', 'Entradas'),
  ('soups_salads', 'Soups & Salads', 'en', 'zh', '汤和沙拉'),
  ('soups_salads', 'Soups & Salads', 'en', 'en', 'Soups & Salads'),
  ('soups_salads', 'Soups & Salads', 'en', 'zh-Hant', '湯和沙拉'),
  ('soups_salads', 'Soups & Salads', 'en', 'es', 'Sopas y Ensaladas'),
  ('pasta', 'Pasta', 'en', 'zh', '意面'),
  ('pasta', 'Pasta', 'en', 'en', 'Pasta'),
  ('pasta', 'Pasta', 'en', 'zh-Hant', '義麵'),
  ('pasta', 'Pasta', 'en', 'es', 'Pasta'),
  ('chef_special', 'Chef Special', 'en', 'zh', '厨师特选'),
  ('chef_special', 'Chef Special', 'en', 'en', 'Chef Special'),
  ('chef_special', 'Chef Special', 'en', 'zh-Hant', '主廚特選'),
  ('chef_special', 'Chef Special', 'en', 'es', 'Especial del Chef'),
  ('soups_salads', 'SOUPS&SALADS', 'en', 'zh', '汤和沙拉'),
  ('soups_salads', 'SOUPS&SALADS', 'en', 'en', 'Soups & Salads'),
  ('soups_salads', 'SOUPS&SALADS', 'en', 'zh-Hant', '湯和沙拉'),
  ('soups_salads', 'SOUPS&SALADS', 'en', 'es', 'Sopas y Ensaladas'),
  ('chef_special', 'CHEF''S SPECIAL', 'en', 'zh', '厨师特选'),
  ('chef_special', 'CHEF''S SPECIAL', 'en', 'en', 'Chef Special'),
  ('chef_special', 'CHEF''S SPECIAL', 'en', 'zh-Hant', '主廚特選'),
  ('chef_special', 'CHEF''S SPECIAL', 'en', 'es', 'Especial del Chef')
on conflict (normalized_key, original_label, target_language) do update
set source_language = excluded.source_language,
    translated_label = excluded.translated_label,
    updated_at = now();

insert into public.noise_keywords (keyword)
values
  ('HEDGCOXE'),
  ('PLANO'),
  ('TEXAS'),
  ('GMAIL'),
  ('ROMA'),
  ('ITALIAN KITCHEN'),
  ('AM-'),
  ('PM'),
  ('DRESSING'),
  ('ADD CHICKEN'),
  ('ADD SHRIMP'),
  ('ADD SALMON'),
  ('SUB SHRIMP'),
  ('SPLIT'),
  ('GRATUITY'),
  ('EXTRA CHARGE'),
  ('SUBSTITUTIONS')
on conflict (keyword) do nothing;
