-- Filtro de linguagem imprópria (português e inglês), aplicado no banco por trigger.
-- A lista `blocked_words` é editável. O filtro reduz casos comuns, mas não substitui moderação.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.filter_response()
returns trigger language plpgsql security invoker set search_path = ''
as $$
declare normalized text; compact text; token text; blocked text;
blocked_words constant text[] := array[
 'porra','caralho','carai','puta','puto','putaria','putinha','putinho','foda','foder','fude','fuder','fudido','fudida','fodido','fodida','fodase','fudase','merda','bosta','cacete','buceta','boceta','bucetao','cuzinho','cuzao','cu','pica','piroca','rola','xoxota','xereca','punheta','pqp','fdp','vsf','vtnc','tnc','arrombado','arrombada','escroto','escrota','otario','otaria','babaca','vagabunda','vagabundo','vadia','viado','viadinho','bicha','safado','safada','fuck','fucking','shit','bitch','asshole','motherfucker'
];
strong_words constant text[] := array['caralho','buceta','boceta','piroca','xoxota','xereca','punheta','arrombado','arrombada','putaria','fodase','fudase','filhodaputa','filhadaputa','vaitomarnocu','tomarnocu','vaisefoder','fuck','fucking','motherfucker','asshole'];
begin
 normalized := pg_catalog.translate(pg_catalog.lower(new.answer),'áàâãäéèêëíìîïóòôõöúùûüçñ013457@$!','aaaaaeeeeiiiiooooouuuucnoieastasi');
 normalized := pg_catalog.regexp_replace(normalized, '[^a-z]+', ' ', 'g');
 normalized := pg_catalog.btrim(pg_catalog.regexp_replace(normalized, '(.)\1+', '\1', 'g'));
 compact := pg_catalog.replace(normalized, ' ', '');
 foreach blocked in array blocked_words loop
   token := pg_catalog.regexp_replace(blocked, '(.)\1+', '\1', 'g');
   if (' ' || normalized || ' ') like ('% ' || token || ' %') or compact = token then raise exception using errcode='P0001', message='INAPPROPRIATE_LANGUAGE'; end if;
 end loop;
 foreach blocked in array strong_words loop
   token := pg_catalog.regexp_replace(blocked, '(.)\1+', '\1', 'g');
   if pg_catalog.strpos(compact,token)>0 then raise exception using errcode='P0001', message='INAPPROPRIATE_LANGUAGE'; end if;
 end loop;
 return new;
end;
$$;
revoke all on function private.filter_response() from public,anon,authenticated;
create trigger filter_response before insert or update of answer on public.responses for each row execute function private.filter_response();
