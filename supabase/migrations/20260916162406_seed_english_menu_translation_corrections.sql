-- Corrections verified against the English menu fixture set.
-- Dish terms remain data-driven and can be revised without changing app code.
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
  ('BACONATOR', 'en', 'zh', '培根王煎蛋卷', 'English menu dish name', true, current_timestamp),
  ('CHICKEN FRIED STEAK', 'en', 'zh', '美式乡村炸牛排', 'English menu dish name', true, current_timestamp),
  ('CHICKEN FRIED CHICKEN', 'en', 'zh', '美式乡村炸鸡排', 'English menu dish name', true, current_timestamp),
  ('SHORT BUTTERMILK PANCAKES', 'en', 'zh', '小份酪乳煎饼', 'English menu dish name', true, current_timestamp),
  ('SUPERPOWER SCRAMBLER', 'en', 'zh', '超能蛋白炒蛋', 'English menu dish name', true, current_timestamp),
  ('SAUSAGE BISCUITS N GRAVY', 'en', 'zh', '香肠美式松饼配肉汁', 'English menu dish name', true, current_timestamp),
  ('ACCIUGHE (GF, DF)', 'en', 'zh', '油浸鳀鱼（无麸质、无乳制品）', 'English menu dish name', true, current_timestamp),
  ('FORMAGGI (V, GF)', 'en', 'zh', '意式奶酪拼盘（素食、无麸质）', 'English menu dish name', true, current_timestamp),
  ('CARNE E FORMAGGI THE BIG BOARD', 'en', 'zh', '意式冷切与奶酪大拼盘', 'English menu dish name', true, current_timestamp),
  ('CARPACCIO DI MANZO (GF, CAN BE DF)', 'en', 'zh', '意式生牛肉薄片（无麸质、可做无乳制品）', 'English menu dish name', true, current_timestamp),
  ('LAMB MEATBALLS / POLPETTE DI AGNELLO', 'en', 'zh', '意式羊肉丸', 'English menu dish name', true, current_timestamp),
  ('MOZZARELLA CON POMODORO (V, GF)', 'en', 'zh', '番茄鲜马苏里拉奶酪（素食、无麸质）', 'English menu dish name', true, current_timestamp),
  ('INSALATA PRIMAVERA (GF, CAN BE DF)', 'en', 'zh', '春日沙拉（无麸质、可做无乳制品）', 'English menu dish name', true, current_timestamp),
  ('INSALATA FANTASIA (GF, CAN BE DF)', 'en', 'zh', '缤纷沙拉（无麸质、可做无乳制品）', 'English menu dish name', true, current_timestamp),
  ('CONCHIGLIE A MODO MIO (CAN BE GF)', 'en', 'zh', '莫莫风味贝壳面（可做无麸质）', 'English menu dish name', true, current_timestamp),
  ('RAVIOLI DI CARNE', 'en', 'zh', '意式肉馅方饺', 'English menu dish name', true, current_timestamp),
  ('TORTILLA ESPAÑOLA', 'en', 'zh', '西班牙土豆蛋饼', 'English menu dish name', true, current_timestamp),
  ('MATRIMONIO', 'en', 'zh', '鳀鱼双拼', 'Spanish anchovy and boquerón dish', true, current_timestamp),
  ('BIKINI', 'en', 'zh', '西班牙香肠奶酪烤三明治', 'Spanish chorizo and Manchego sandwich', true, current_timestamp),
  ('TXULETON A LA PARILLA', 'en', 'zh', '巴斯克炭烤带骨牛排', 'English menu dish name', true, current_timestamp),
  ('BITTER SPRITZ', 'en', 'zh', '苦味气泡鸡尾酒', 'English menu drink name', true, current_timestamp),
  ('PHONY NEGRONI', 'en', 'zh', '无酒精内格罗尼', 'English menu drink name', true, current_timestamp),
  ('Plat Américain*', 'en', 'zh', '美式早餐拼盘*', 'English menu dish name', true, current_timestamp),
  ('Pain Perdu', 'en', 'zh', '法式吐司', 'English menu dish name', true, current_timestamp),
  ('Artichaut Croquant', 'en', 'zh', '酥脆洋蓟', 'English menu dish name', true, current_timestamp),
  ('Toutes Les Bouchées', 'en', 'zh', '全部小食拼盘', 'English menu dish name', true, current_timestamp),
  ('Snickerdoodle', 'en', 'zh', '肉桂糖曲奇', 'English menu dish name', true, current_timestamp),
  ('Avoine De Nuit', 'en', 'zh', '隔夜燕麦', 'English menu dish name', true, current_timestamp),
  ('Chicken Fried Steak or Chicken', 'en', 'zh', '美式乡村炸牛排或炸鸡排', 'English menu dish name', true, current_timestamp),
  ('Blackened Catfish & Gulf Shrimp*', 'en', 'zh', '香料炙烤鲶鱼配墨西哥湾虾*', 'English menu dish name', true, current_timestamp),
  ('Venison Chili', 'en', 'zh', '鹿肉辣味炖豆', 'English menu dish name', true, current_timestamp),
  ('TATER TOTS.', 'en', 'zh', '炸薯球', 'English menu dish name', true, current_timestamp),
  ('SMOKED BRISKET MELT,', 'en', 'zh', '烟熏牛胸肉芝士三明治', 'English menu dish name', true, current_timestamp),
  ('Frutti Di Mari', 'en', 'zh', '海鲜意面', 'English menu dish name', true, current_timestamp),
  ('PALETA IBÉRICA DE BELLOTA 5J', 'en', 'zh', '5J橡果饲养伊比利亚火腿', 'English menu dish name', true, current_timestamp),
  ('POTATO TORTILLA', 'en', 'zh', '西班牙土豆蛋饼', 'English menu dish name', true, current_timestamp),
  ('Caldo de pescado y camaron..', 'en', 'zh', '鱼虾汤', 'English menu dish name', true, current_timestamp),
  ('Caldo de pescado.', 'en', 'zh', '鱼汤', 'English menu dish name', true, current_timestamp)
on conflict (source_text, source_language, target_language)
do update set
  translated_text = excluded.translated_text,
  context = excluded.context,
  is_active = excluded.is_active,
  updated_at = current_timestamp;

update public.menu_categories
set translated_label = case normalized_key
  when 'appetizers' then '开胃菜'
  when 'salads' then '沙拉'
  when 'soups' then '汤类'
  when 'breakfast' then '早餐'
  when 'entrees' then '主菜'
end,
updated_at = current_timestamp
where target_language = 'zh'
  and normalized_key in ('appetizers', 'salads', 'soups', 'breakfast', 'entrees');
