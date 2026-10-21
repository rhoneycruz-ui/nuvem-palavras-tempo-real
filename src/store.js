// Camada de dados. Duas implementações com a mesma interface:
//   - Supabase (produção): banco Postgres + Realtime + função de reinício.
//   - Demonstração (sem configuração): localStorage, sincroniza entre abas do mesmo navegador.
//
// Interface:
//   isDemo, listResponses(), isOpen(), insert({id, answer, event_id}),
//   subscribe(onChange, onStatus), reset(code)
// Erros de insert() trazem `error.kind`: 'inappropriate' | 'closed' | 'invalid' | 'network'.
(() => {
  'use strict';
  const app = window.APP;
  const isDemo = !app.url || !app.key;

  function fail(kind, message) {
    const error = new Error(message || kind);
    error.kind = kind;
    return error;
  }

  // ---------- Demonstração ----------
  function demoStore() {
    const KEY = `nuvem-demo:${app.event}`;
    const SAMPLE = [
      ['colaboração', 4], ['coragem', 3], ['respeito', 3], ['inovação', 2], ['foco', 2],
      ['confiança', 2], ['energia', 1], ['união', 1], ['resultado', 1], ['criatividade', 1],
      ['humildade', 1], ['propósito', 1]
    ];
    const read = () => {
      try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
    };
    const write = rows => {
      try { localStorage.setItem(KEY, JSON.stringify(rows)); } catch { /* armazenamento indisponível */ }
    };
    let memory = read();
    if (!memory) {
      memory = [];
      let n = 0;
      for (const [answer, times] of SAMPLE)
        for (let i = 0; i < times; i++)
          memory.push({ id: `demo-${n++}`, answer, created_at: new Date(1e12 + n).toISOString() });
      write(memory);
    }
    return {
      isDemo: true,
      async listResponses() { return (read() || memory).slice(); },
      async isOpen() { return true; },
      async insert({ id, answer }) {
        const rows = read() || memory;
        if (!rows.some(r => r.id === id)) rows.push({ id, answer, created_at: new Date().toISOString() });
        memory = rows;
        write(rows);
      },
      subscribe(onChange, onStatus) {
        window.addEventListener('storage', event => { if (event.key === KEY) onChange(); });
        onStatus('online');
      },
      async reset() { memory = []; write([]); return 'ok'; }
    };
  }

  // ---------- Supabase ----------
  function supabaseStore() {
    if (!window.supabase) return null;
    const db = window.supabase.createClient(app.url, app.key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    return {
      isDemo: false,
      async listResponses() {
        const received = [];
        for (let from = 0; ; from += 1000) {
          const { data, error } = await db
            .from('responses')
            .select('id,answer,created_at')
            .eq('event_id', app.event)
            .order('created_at')
            .order('id')
            .range(from, from + 999);
          if (error) throw error;
          received.push(...data);
          if (data.length < 1000) break;
        }
        return received;
      },
      async isOpen() {
        const { data, error } = await db.from('events').select('is_open').eq('id', app.event).single();
        if (error) throw error;
        return data.is_open;
      },
      async insert(payload) {
        const { error } = await db.from('responses').insert(payload);
        // Mesmo UUID em novas tentativas: um envio já gravado nunca conta duas vezes (23505).
        if (!error || error.code === '23505') return;
        if (error.message?.includes('INAPPROPRIATE_LANGUAGE')) throw fail('inappropriate');
        if (error.code === '42501') throw fail('closed');
        if (error.code === '23514') throw fail('invalid');
        throw fail('network', error.message);
      },
      subscribe(onChange, onStatus) {
        db.channel('nuvem-screen')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'responses' }, onChange)
          .subscribe(status => {
            if (status === 'SUBSCRIBED') onStatus('online');
            else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) onStatus('offline');
          });
      },
      async reset(code) {
        const response = await fetch(`${app.url}/functions/v1/reset-cloud`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${app.key}` },
          body: JSON.stringify({ event_id: app.event, code })
        });
        if (response.status === 401) return 'unauthorized';
        if (!response.ok) throw fail('network', 'reset_failed');
        return 'ok';
      }
    };
  }

  window.NuvemStore = isDemo ? demoStore() : supabaseStore();
})();
