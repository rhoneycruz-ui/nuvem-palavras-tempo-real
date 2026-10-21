-- Estrutura da nuvem de palavras: eventos, respostas, RLS e Realtime.
-- O id do evento ('demo') deve ser o mesmo de `event` em config.js.
-- Para criar outros eventos: insert into public.events(id) values ('meu-evento');

create table public.events (id text primary key, is_open boolean not null default true);
alter table public.events enable row level security;
revoke all on public.events from anon, authenticated;
grant select on public.events to anon, authenticated;
create policy "read_event_state" on public.events for select to anon, authenticated using (true);
insert into public.events(id) values ('demo');

create table public.responses (
  id uuid primary key,
  event_id text not null references public.events(id),
  answer text not null check (char_length(answer) between 2 and 30 and answer = btrim(answer) and answer ~ '[[:alpha:]]' and answer !~ '[[:cntrl:]<>]'),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index responses_event_created on public.responses(event_id, created_at, id);
alter table public.responses enable row level security;
revoke all on public.responses from anon, authenticated;
grant select on public.responses to anon, authenticated;
grant insert(id,event_id,answer) on public.responses to anon, authenticated;
create policy "read_visible_responses" on public.responses for select to anon, authenticated using (hidden = false);
create policy "submit_to_open_event" on public.responses for insert to anon, authenticated with check (
  hidden = false and exists (select 1 from public.events e where e.id = event_id and e.is_open)
);
alter publication supabase_realtime add table public.responses;
alter publication supabase_realtime add table public.events;
