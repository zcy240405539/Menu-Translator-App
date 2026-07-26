create table if not exists public.supported_languages (
  code text primary key,
  english_name text not null,
  native_name text not null,
  family text not null,
  google_code text not null,
  ocr_code text,
  enabled_source boolean not null default true,
  enabled_target boolean not null default true,
  display_order integer not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.supported_languages
  (code, english_name, native_name, family, google_code, ocr_code, display_order)
values
  ('en', 'English', 'English', 'latin', 'en', 'en', 10),
  ('zh', 'Simplified Chinese', '简体中文', 'cjk', 'zh-CN', 'ch', 20),
  ('zh-Hant', 'Traditional Chinese', '繁體中文', 'cjk', 'zh-TW', 'ch', 30),
  ('es', 'Spanish', 'Español', 'latin', 'es', 'en', 40),
  ('fr', 'French', 'Français', 'latin', 'fr', 'fr', 50),
  ('ja', 'Japanese', '日本語', 'cjk', 'ja', 'japan', 60),
  ('ko', 'Korean', '한국어', 'hangul', 'ko', 'korean', 70),
  ('ru', 'Russian', 'Русский', 'cyrillic', 'ru', 'cyrillic', 80),
  ('pt', 'Portuguese', 'Português', 'latin', 'pt', 'latin', 90),
  ('de', 'German', 'Deutsch', 'latin', 'de', 'german', 100),
  ('it', 'Italian', 'Italiano', 'latin', 'it', 'latin', 110),
  ('ar', 'Arabic', 'العربية', 'arabic', 'ar', 'arabic', 120)
on conflict (code) do update set
  english_name = excluded.english_name,
  native_name = excluded.native_name,
  family = excluded.family,
  google_code = excluded.google_code,
  ocr_code = excluded.ocr_code,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.noise_keywords (source_language, keyword)
values
  ('fr', 'horaires'), ('fr', 'adresse'), ('fr', 'téléphone'), ('fr', 'réservations'),
  ('fr', 'service compris'), ('fr', 'allergènes'),
  ('ja', '営業時間'), ('ja', '住所'), ('ja', '電話'), ('ja', '予約'), ('ja', '税込'), ('ja', 'アレルギー'),
  ('ko', '영업시간'), ('ko', '주소'), ('ko', '전화'), ('ko', '예약'), ('ko', '부가세'), ('ko', '알레르기'),
  ('ru', 'часы работы'), ('ru', 'адрес'), ('ru', 'телефон'), ('ru', 'бронирование'),
  ('ru', 'сервисный сбор'), ('ru', 'аллергены'),
  ('pt', 'horário'), ('pt', 'endereço'), ('pt', 'telefone'), ('pt', 'reservas'),
  ('pt', 'taxa de serviço'), ('pt', 'alergénios'), ('pt', 'alérgenos'),
  ('de', 'öffnungszeiten'), ('de', 'adresse'), ('de', 'telefon'), ('de', 'reservierung'),
  ('de', 'servicegebühr'), ('de', 'allergene'),
  ('it', 'orari'), ('it', 'indirizzo'), ('it', 'telefono'), ('it', 'prenotazioni'),
  ('it', 'coperto'), ('it', 'allergeni'),
  ('ar', 'ساعات العمل'), ('ar', 'العنوان'), ('ar', 'الهاتف'), ('ar', 'الحجز'),
  ('ar', 'رسوم الخدمة'), ('ar', 'مسببات الحساسية')
on conflict do nothing;

insert into public.unit_translations (source_language, source_unit, target_lang, translated_unit)
values
  ('fr', 'verre', 'en', 'glass'), ('fr', 'bouteille', 'en', 'bottle'),
  ('fr', 'portion', 'en', 'portion'), ('fr', 'pièce', 'en', 'piece'),
  ('en', 'glass', 'fr', 'verre'), ('en', 'bottle', 'fr', 'bouteille'),
  ('en', 'portion', 'fr', 'portion'), ('en', 'piece', 'fr', 'pièce'),

  ('ja', '人前', 'en', 'serving'), ('ja', '個', 'en', 'piece'),
  ('ja', '本', 'en', 'bottle'), ('ja', '杯', 'en', 'cup'),
  ('en', 'serving', 'ja', '人前'), ('en', 'piece', 'ja', '個'),
  ('en', 'bottle', 'ja', '本'), ('en', 'cup', 'ja', '杯'),

  ('ko', '인분', 'en', 'serving'), ('ko', '개', 'en', 'piece'),
  ('ko', '잔', 'en', 'glass'), ('ko', '병', 'en', 'bottle'),
  ('en', 'serving', 'ko', '인분'), ('en', 'piece', 'ko', '개'),
  ('en', 'glass', 'ko', '잔'), ('en', 'bottle', 'ko', '병'),

  ('ru', 'порция', 'en', 'portion'), ('ru', 'шт', 'en', 'piece'),
  ('ru', 'стакан', 'en', 'glass'), ('ru', 'бутылка', 'en', 'bottle'),
  ('en', 'portion', 'ru', 'порция'), ('en', 'piece', 'ru', 'шт'),
  ('en', 'glass', 'ru', 'стакан'), ('en', 'bottle', 'ru', 'бутылка'),

  ('pt', 'dose', 'en', 'serving'), ('pt', 'porção', 'en', 'portion'),
  ('pt', 'copo', 'en', 'glass'), ('pt', 'garrafa', 'en', 'bottle'),
  ('en', 'serving', 'pt', 'dose'), ('en', 'portion', 'pt', 'porção'),
  ('en', 'glass', 'pt', 'copo'), ('en', 'bottle', 'pt', 'garrafa'),

  ('de', 'portion', 'en', 'portion'), ('de', 'glas', 'en', 'glass'),
  ('de', 'flasche', 'en', 'bottle'), ('de', 'stück', 'en', 'piece'),
  ('en', 'portion', 'de', 'Portion'), ('en', 'glass', 'de', 'Glas'),
  ('en', 'bottle', 'de', 'Flasche'), ('en', 'piece', 'de', 'Stück'),

  ('it', 'porzione', 'en', 'portion'), ('it', 'bicchiere', 'en', 'glass'),
  ('it', 'bottiglia', 'en', 'bottle'), ('it', 'pezzo', 'en', 'piece'),
  ('en', 'portion', 'it', 'porzione'), ('en', 'glass', 'it', 'bicchiere'),
  ('en', 'bottle', 'it', 'bottiglia'), ('en', 'piece', 'it', 'pezzo'),

  ('ar', 'حصة', 'en', 'portion'), ('ar', 'قطعة', 'en', 'piece'),
  ('ar', 'كوب', 'en', 'cup'), ('ar', 'زجاجة', 'en', 'bottle'),
  ('en', 'portion', 'ar', 'حصة'), ('en', 'piece', 'ar', 'قطعة'),
  ('en', 'cup', 'ar', 'كوب'), ('en', 'bottle', 'ar', 'زجاجة')
on conflict do nothing;
