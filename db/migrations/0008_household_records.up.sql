-- #240: the server reads a household's records, one collection at a time,
-- for the workflows: its settings record (time zone, meal times, days
-- off) and its people (the meals they eat). Functions only: the records
-- table is as 0005 made it. The phones write records; the server reads
-- them here, behind the Worker's secret (ADR 0032).

create function hh_records(p_secret text, p_household uuid, p_collection text)
returns jsonb language sql security definer set search_path = public as $$
  select msg_check(p_secret);
  select coalesce(jsonb_agg(r.record order by r.id), '[]'::jsonb)
  from records r
  where r.household = p_household and r.collection = p_collection
$$;
