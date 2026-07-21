insert into public.app_config_entries (namespace, key, value, description)
values
  ('negative_image_terms', 'swimwear', '"swimwear"', 'Reject non-dish image results'),
  ('negative_image_terms', 'swimsuit', '"swimsuit"', 'Reject non-dish image results'),
  ('negative_image_terms', 'beach', '"beach"', 'Reject non-dish image results'),
  ('negative_image_terms', 'fashion', '"fashion"', 'Reject non-dish image results'),
  ('negative_image_terms', 'wedding', '"wedding"', 'Reject non-dish image results'),
  ('negative_image_terms', 'bride', '"bride"', 'Reject non-dish image results'),
  ('negative_image_terms', 'groom', '"groom"', 'Reject non-dish image results'),
  ('negative_image_terms', 'airplane', '"airplane"', 'Reject non-dish image results'),
  ('negative_image_terms', 'aircraft', '"aircraft"', 'Reject non-dish image results'),
  ('negative_image_terms', 'origami', '"origami"', 'Reject non-dish image results'),
  ('negative_image_terms', 'paper_craft', '"paper craft"', 'Reject non-dish image results'),
  ('dish_search_aliases', 'bikini', '["bikini sandwich", "bikini toastie", "spanish ham cheese sandwich"]', 'Ambiguous dish image search aliases'),
  ('dish_image_conflict_terms', 'bikini', '["swimwear", "swimsuit", "beach", "fashion", "model", "woman"]', 'Dish-specific image result conflict terms'),
  ('dish_image_conflict_terms', 'matrimonio', '["wedding", "marriage", "bride", "groom"]', 'Dish-specific image result conflict terms'),
  ('dish_image_conflict_terms', 'paper plane', '["airplane", "aircraft", "origami", "paper craft"]', 'Dish-specific image result conflict terms')
on conflict (namespace, key) do update
set
  value = excluded.value,
  description = excluded.description,
  is_active = true,
  updated_at = now();
