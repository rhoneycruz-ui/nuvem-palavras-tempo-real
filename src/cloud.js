// Tela principal (TV/projetor): nuvem de palavras, QR code e controle do evento.
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const app = window.APP;
  const store = window.NuvemStore;
  const { countWords } = window.NuvemLib;

  // --- QR code que leva à página de resposta ---
  const link = new URL('responder.html', location.href);
  $('participate-link').href = link.href;
  try {
    const code = qrcode(0, 'M');
    code.addData(link.href);
    code.make();
    $('qr').innerHTML = code.createSvgTag({ cellSize: 5, margin: 16, scalable: true });
  } catch {
    $('qr').textContent = 'Use o link abaixo para participar.';
  }

  // --- Tela cheia ---
  $('fullscreen').onclick = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      $('fullscreen').textContent = 'Use F11 para ampliar';
    }
  };
  document.addEventListener('fullscreenchange', () => {
    $('fullscreen').textContent = document.fullscreenElement ? 'Sair da tela cheia ⛶' : 'Tela cheia ⛶';
  });

  if (!store || !window.d3?.layout?.cloud) {
    $('connection').textContent = 'Não foi possível carregar. Atualize a página.';
    return;
  }

  // --- Reiniciar rodada (protegido por código de administrador) ---
  const resetDialog = $('reset-dialog');
  const adminCode = $('admin-code');
  const resetFeedback = $('reset-feedback');
  const confirmReset = $('confirm-reset');
  if (store.isDemo) $('reset-note').textContent = 'Modo demonstração: qualquer código funciona.';
  $('reset-cloud').onclick = () => {
    resetFeedback.textContent = '';
    adminCode.value = '';
    resetDialog.showModal();
    setTimeout(() => adminCode.focus(), 50);
  };
  confirmReset.onclick = async event => {
    event.preventDefault();
    const code = adminCode.value.trim();
    if (!code) { resetFeedback.textContent = 'Digite o código de administrador.'; return; }
    confirmReset.disabled = true;
    confirmReset.textContent = 'Zerando…';
    resetFeedback.textContent = '';
    try {
      if ((await store.reset(code)) === 'unauthorized') { resetFeedback.textContent = 'Código incorreto.'; return; }
      resetDialog.close();
      await sync();
    } catch {
      resetFeedback.textContent = 'Não foi possível zerar agora. Verifique a conexão e tente novamente.';
    } finally {
      confirmReset.disabled = false;
      confirmReset.textContent = 'Zerar agora';
    }
  };

  // --- Renderização da nuvem ---
  let rows = [], signature = '', layout, timer, pending = false, loading = false, online = false, firstLoad = true;

  function render() {
    layout?.stop();
    const words = countWords(rows), visible = words.slice(0, 200);
    $('count').textContent = rows.length;
    $('count-label').textContent = rows.length === 1 ? 'resposta' : 'respostas';
    $('empty').hidden = rows.length > 0;
    $('cloud').replaceChildren();
    if (!visible.length) return;
    const stage = $('cloud-stage'), width = Math.floor(stage.clientWidth), height = Math.floor(stage.clientHeight);
    if (!width || !height) return;
    $('cloud').setAttribute('viewBox', `0 0 ${width} ${height}`);
    let seed = 817; // semente fixa: a mesma nuvem sempre gera o mesmo desenho
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const max = visible[0].count;
    const measure = document.createElement('canvas').getContext('2d');
    const base = Math.min(110, Math.sqrt((width * height) / Math.max(visible.length, 3)) * 0.48);
    const palette = app.colors;
    const place = (scale, attempt) => {
      seed = 817;
      const data = visible.map(w => {
        const size = Math.max(12, base * (0.42 + 0.58 * Math.sqrt(w.count / max)) * scale);
        measure.font = `700 ${size}px Arial`;
        return { ...w, size: Math.min(size, (size * (width - 48)) / Math.max(measure.measureText(w.text).width, 1)) };
      });
      layout = d3.layout.cloud().size([width, height]).words(data).font('Arial').fontWeight('700')
        .fontSize(w => w.size).padding(5).rotate(0).random(random).timeInterval(20)
        .on('end', placed => {
          // Se alguma palavra não coube, tenta de novo com fontes 20% menores (até 3 vezes).
          if (placed.length < visible.length && attempt < 3) { place(scale * 0.8, attempt + 1); return; }
          const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          group.setAttribute('transform', `translate(${width / 2},${height / 2})`);
          placed.forEach((w, i) => {
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.textContent = w.text;
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('transform', `translate(${w.x},${w.y})`);
            text.setAttribute('font-size', w.size);
            text.setAttribute('fill', palette[i % palette.length]);
            text.setAttribute('class', 'cloud-word');
            const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            title.textContent = `${w.text}: ${w.count}`;
            text.append(title);
            group.append(text);
          });
          $('cloud').replaceChildren(group);
          $('cloud').setAttribute('aria-label', words.map(w => `${w.text}: ${w.count}`).join('; '));
          $('cloud-note').textContent = placed.length < words.length
            ? `Em destaque: ${placed.length} de ${words.length} expressões.`
            : 'Construído por todos nós.';
        }).start();
    };
    place(1, 0);
  }

  // --- Sincronização ---
  const emptyHint = () => { $('empty').querySelector('p').innerHTML = 'Escaneie o QR code.<br>A primeira palavra pode ser sua.'; };
  async function sync() {
    if (loading) { pending = true; return; }
    loading = true;
    try {
      const received = await store.listResponses();
      const next = JSON.stringify(received);
      if (next !== signature) { rows = received; signature = next; render(); }
      $('connection').textContent = store.isDemo ? 'Modo demonstração' : online ? 'Ao vivo' : 'Conectado · sincronizando';
      if (firstLoad) { firstLoad = false; emptyHint(); }
    } catch {
      $('connection').textContent = 'Conexão interrompida · tentando novamente';
      if (firstLoad) $('empty').querySelector('p').textContent = 'Aguardando conexão para carregar as respostas.';
    } finally {
      loading = false;
      if (pending) { pending = false; schedule(); }
    }
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(sync, 250); }

  store.subscribe(schedule, status => {
    online = status === 'online';
    if (online) sync();
    else $('connection').textContent = 'Reconectando · atualização periódica ativa';
  });

  let resizeTimer;
  new ResizeObserver(() => { clearTimeout(resizeTimer); resizeTimer = setTimeout(render, 180); }).observe($('cloud-stage'));
  window.addEventListener('online', sync);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
  // A reconciliação periódica cobre eventos perdidos do websocket e respostas ocultadas.
  setInterval(sync, 10000);
  sync();
})();
