-- Paste into Supabase → SQL Editor and replace CHANGE-ME-LONG-RANDOM-SECRET THERE, then run once.
-- Never save the real secret in this file: the repo is public. The same string goes on the NFC tag.
-- Generate it with: openssl rand -hex 16

create table incidents (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now()
);
alter table incidents enable row level security;
create policy "public read" on incidents for select to anon using (true);
grant select on incidents to anon; -- explicit: don't rely on Supabase's default table grants
-- no insert/update/delete policy: history is append-only, writes only via reset_streak()

create table secrets (hash bytea not null);
alter table secrets enable row level security; -- no policies: invisible to the API
insert into secrets values (sha256(convert_to('CHANGE-ME-LONG-RANDOM-SECRET', 'utf8')));

create function reset_streak(secret text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from secrets where hash = sha256(convert_to(secret, 'utf8'))) then
    raise exception 'forbidden';
  end if;
  -- ignore a double tap within a minute
  if exists (select 1 from incidents where occurred_at > now() - interval '1 minute') then
    return;
  end if;
  insert into incidents default values;
end $$;
-- Public on purpose: the secret check above is the protection. Nobody signs in, so nobody else needs it.
revoke execute on function reset_streak(text) from public, authenticated;
grant execute on function reset_streak(text) to anon;

-- Starting point: set to the real date of the last incident, e.g. '2026-10-01'.
-- Keep it in the past: with now() the number is already 0 and the one-minute guard swallows a test reset.
insert into incidents (occurred_at) values (now() - interval '1 day');
