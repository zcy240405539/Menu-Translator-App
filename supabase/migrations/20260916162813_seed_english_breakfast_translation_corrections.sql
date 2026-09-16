-- Follow-up corrections found during the end-to-end EddiesDiner.png review.
insert into public.translation_glossary_terms (
  source_text,
  source_language,
  target_language,
  translated_text,
  context,
  is_active,
  updated_at
)
values
  ('CHICKEN FRIED STEAK SKILLET', 'en', 'zh', '美式乡村炸牛排铁锅早餐', 'English breakfast menu dish name', true, current_timestamp),
  ('chicken fried steak-green pepper-onion-cheddar-cream gravy', 'en', 'zh', '美式乡村炸牛排配青椒、洋葱、切达奶酪和奶油肉汁', 'English breakfast menu description', true, current_timestamp),
  ('STACK BUTTERMILK PANCAKES', 'en', 'zh', '大份酪乳煎饼', 'English breakfast menu dish name', true, current_timestamp),
  ('SHORT SWEDISH PANCAKE', 'en', 'zh', '小份瑞典薄饼', 'English breakfast menu dish name', true, current_timestamp),
  ('(3) STRAWBERRY NUTELLA SWEDES', 'en', 'zh', '（3片）草莓榛果可可酱瑞典薄饼', 'English breakfast menu dish name', true, current_timestamp),
  ('GF SAMPLER (2) gluten free pancakes', 'en', 'zh', '无麸质拼盘（2片）无麸质煎饼', 'English breakfast menu dish name', true, current_timestamp),
  ('PORKY PIG SKILLET', 'en', 'zh', '猪肉三拼铁锅早餐', 'English breakfast menu dish name', true, current_timestamp),
  ('CHICKEN N WAFFLE', 'en', 'zh', '炸鸡配华夫饼', 'English breakfast menu dish name', true, current_timestamp),
  ('BREAKFAST MONTE CRISTO', 'en', 'zh', '早餐蒙特克里斯托三明治', 'English breakfast menu dish name', true, current_timestamp),
  ('MIGAS', 'en', 'zh', '墨式玉米片炒蛋', 'English breakfast menu dish name', true, current_timestamp),
  ('CLASSIC BENNIE', 'en', 'zh', '经典班尼迪克蛋', 'English breakfast menu dish name', true, current_timestamp),
  ('SOUTHERN BENNIE', 'en', 'zh', '南方风味班尼迪克蛋', 'English breakfast menu dish name', true, current_timestamp),
  ('B.A.T. BENNIE', 'en', 'zh', '培根牛油果番茄班尼迪克蛋', 'English breakfast menu dish name', true, current_timestamp),
  ('FLORENTINE BENNIE', 'en', 'zh', '菠菜佛罗伦萨班尼迪克蛋', 'English breakfast menu dish name', true, current_timestamp),
  ('OOH LA LA BENNIE', 'en', 'zh', '火腿奶酪可颂班尼迪克蛋', 'English breakfast menu dish name', true, current_timestamp),
  ('THE "SMOKING" BENNIE', 'en', 'zh', '烟熏三文鱼班尼迪克蛋', 'English breakfast menu dish name', true, current_timestamp)
on conflict (source_text, source_language, target_language)
do update set
  translated_text = excluded.translated_text,
  context = excluded.context,
  is_active = excluded.is_active,
  updated_at = current_timestamp;
