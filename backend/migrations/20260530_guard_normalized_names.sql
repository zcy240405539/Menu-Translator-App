-- Prevent empty normalized_name values from poisoning shared dish caches.
-- Apply this to Supabase after existing bad rows are repaired.

with candidates as (
  select
    id,
    lower(btrim(original_name)) as repaired_name
  from public.dish_images
  where normalized_name is null
     or btrim(normalized_name) = ''
     or lower(btrim(normalized_name)) in ('empty', 'unknown', 'none', 'null', 'undefined', 'n/a', 'na')
)
delete from public.dish_images image
using candidates candidate
where image.id = candidate.id
  and (
    candidate.repaired_name is null
    or candidate.repaired_name = ''
    or exists (
      select 1
      from public.dish_images existing
      where existing.id <> image.id
        and existing.normalized_name = candidate.repaired_name
    )
  );

with candidates as (
  select
    id,
    lower(btrim(original_name)) as repaired_name
  from public.dish_images
  where normalized_name is null
     or btrim(normalized_name) = ''
     or lower(btrim(normalized_name)) in ('empty', 'unknown', 'none', 'null', 'undefined', 'n/a', 'na')
)
update public.dish_images image
set normalized_name = candidate.repaired_name
from candidates candidate
where image.id = candidate.id;

with candidates as (
  select
    id,
    target_language,
    lower(btrim(coalesce(nullif(btrim(original_name), ''), nullif(btrim(translated_name), '')))) as repaired_name
  from public.dish_cache
  where normalized_name is null
     or btrim(normalized_name) = ''
     or lower(btrim(normalized_name)) in ('empty', 'unknown', 'none', 'null', 'undefined', 'n/a', 'na')
)
delete from public.dish_cache cache
using candidates candidate
where cache.id = candidate.id
  and (
    candidate.repaired_name is null
    or candidate.repaired_name = ''
    or exists (
      select 1
      from public.dish_cache existing
      where existing.id <> cache.id
        and existing.normalized_name = candidate.repaired_name
        and existing.target_language = candidate.target_language
    )
  );

with candidates as (
  select
    id,
    lower(btrim(coalesce(nullif(btrim(original_name), ''), nullif(btrim(translated_name), '')))) as repaired_name
  from public.dish_cache
  where normalized_name is null
     or btrim(normalized_name) = ''
     or lower(btrim(normalized_name)) in ('empty', 'unknown', 'none', 'null', 'undefined', 'n/a', 'na')
)
update public.dish_cache cache
set normalized_name = candidate.repaired_name
from candidates candidate
where cache.id = candidate.id;

create or replace function public.ensure_dish_images_normalized_name()
returns trigger
language plpgsql
as $$
begin
  if new.normalized_name is null
     or btrim(new.normalized_name) = ''
     or lower(btrim(new.normalized_name)) in ('empty', 'unknown', 'none', 'null', 'undefined', 'n/a', 'na') then
    new.normalized_name := lower(btrim(coalesce(nullif(btrim(new.original_name), ''), nullif(btrim(new.image_prompt), ''))));
  else
    new.normalized_name := lower(btrim(new.normalized_name));
  end if;

  if new.normalized_name is null
     or btrim(new.normalized_name) = ''
     or lower(btrim(new.normalized_name)) in ('empty', 'unknown', 'none', 'null', 'undefined', 'n/a', 'na') then
    raise exception 'dish_images.normalized_name cannot be empty or a placeholder';
  end if;

  return new;
end;
$$;

create or replace function public.ensure_dish_cache_normalized_name()
returns trigger
language plpgsql
as $$
begin
  if new.normalized_name is null
     or btrim(new.normalized_name) = ''
     or lower(btrim(new.normalized_name)) in ('empty', 'unknown', 'none', 'null', 'undefined', 'n/a', 'na') then
    new.normalized_name := lower(btrim(coalesce(nullif(btrim(new.original_name), ''), nullif(btrim(new.translated_name), ''))));
  else
    new.normalized_name := lower(btrim(new.normalized_name));
  end if;

  if new.normalized_name is null
     or btrim(new.normalized_name) = ''
     or lower(btrim(new.normalized_name)) in ('empty', 'unknown', 'none', 'null', 'undefined', 'n/a', 'na') then
    raise exception 'dish_cache.normalized_name cannot be empty or a placeholder';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_ensure_dish_images_normalized_name on public.dish_images;
create trigger trg_ensure_dish_images_normalized_name
before insert or update of normalized_name, original_name, image_prompt
on public.dish_images
for each row
execute function public.ensure_dish_images_normalized_name();

drop trigger if exists trg_ensure_dish_cache_normalized_name on public.dish_cache;
create trigger trg_ensure_dish_cache_normalized_name
before insert or update of normalized_name, original_name, translated_name
on public.dish_cache
for each row
execute function public.ensure_dish_cache_normalized_name();

alter table public.dish_images drop constraint if exists dish_images_normalized_name_not_blank;
alter table public.dish_images add constraint dish_images_normalized_name_not_blank
check (
    btrim(normalized_name) <> ''
    and lower(btrim(normalized_name)) not in ('empty', 'unknown', 'none', 'null', 'undefined', 'n/a', 'na')
);

alter table public.dish_cache drop constraint if exists dish_cache_normalized_name_not_blank;
alter table public.dish_cache add constraint dish_cache_normalized_name_not_blank
check (
    btrim(normalized_name) <> ''
    and lower(btrim(normalized_name)) not in ('empty', 'unknown', 'none', 'null', 'undefined', 'n/a', 'na')
);
