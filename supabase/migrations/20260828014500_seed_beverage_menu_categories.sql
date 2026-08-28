insert into public.menu_categories (
  normalized_key,
  original_label,
  source_language,
  target_language,
  translated_label,
  updated_at
)
values
  ('red', 'RED', 'en', 'zh', '红葡萄酒', current_timestamp),
  ('white', 'WHITE', 'en', 'zh', '白葡萄酒', current_timestamp),
  ('ros_orange', 'ROSÉ / ORANGE', 'en', 'zh', '桃红葡萄酒 / 橙酒', current_timestamp),
  ('espumoso', 'ESPUMOSO', 'en', 'zh', '起泡酒', current_timestamp),
  ('wine_by_the_glass', 'Wine By The Glass', 'en', 'zh', '杯装葡萄酒', current_timestamp),
  ('on_draft', 'On Draft', 'en', 'zh', '现打酒饮', current_timestamp),
  ('n_a_beverages', 'N/A Beverages', 'en', 'zh', '无酒精饮品', current_timestamp),
  ('spritz', 'Spritz', 'en', 'zh', '斯普里茨鸡尾酒', current_timestamp),
  ('vermut', 'Vermut', 'en', 'zh', '味美思', current_timestamp),
  ('gin_tonic', 'Gin Tonic', 'en', 'zh', '金汤力', current_timestamp),
  ('cocktails', 'Cocktails', 'en', 'zh', '鸡尾酒', current_timestamp),
  ('sherry', 'Sherry', 'en', 'zh', '雪利酒', current_timestamp),
  ('red', 'RED', 'en', 'zh-Hant', '紅葡萄酒', current_timestamp),
  ('white', 'WHITE', 'en', 'zh-Hant', '白葡萄酒', current_timestamp),
  ('ros_orange', 'ROSÉ / ORANGE', 'en', 'zh-Hant', '桃紅葡萄酒 / 橙酒', current_timestamp),
  ('espumoso', 'ESPUMOSO', 'en', 'zh-Hant', '氣泡酒', current_timestamp),
  ('wine_by_the_glass', 'Wine By The Glass', 'en', 'zh-Hant', '杯裝葡萄酒', current_timestamp),
  ('on_draft', 'On Draft', 'en', 'zh-Hant', '現打酒飲', current_timestamp),
  ('n_a_beverages', 'N/A Beverages', 'en', 'zh-Hant', '無酒精飲品', current_timestamp),
  ('spritz', 'Spritz', 'en', 'zh-Hant', '斯普里茨雞尾酒', current_timestamp),
  ('vermut', 'Vermut', 'en', 'zh-Hant', '味美思', current_timestamp),
  ('gin_tonic', 'Gin Tonic', 'en', 'zh-Hant', '琴通寧', current_timestamp),
  ('cocktails', 'Cocktails', 'en', 'zh-Hant', '雞尾酒', current_timestamp),
  ('sherry', 'Sherry', 'en', 'zh-Hant', '雪莉酒', current_timestamp)
on conflict (normalized_key, original_label, target_language)
do update set
  source_language = excluded.source_language,
  translated_label = excluded.translated_label,
  updated_at = current_timestamp;
