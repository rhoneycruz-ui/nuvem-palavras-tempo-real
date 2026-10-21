// Página de resposta (celular): valida, envia e trata erros.
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const app = window.APP;
  const store = window.NuvemStore;
  const { normalizeAnswer, isValidAnswer, MAX_LENGTH } = window.NuvemLib;
  const form = $('answer-form'), input = $('answer'), button = $('submit');

  const setFeedback = text => { $('feedback').textContent = text; };
  function setButton(label, disabled = false) { button.textContent = label; button.disabled = disabled; }

  if (!store) { setFeedback('Não foi possível carregar. Atualize a página.'); return; }

  let pending = null, busy = false;

  async function checkOpen() {
    try {
      const open = await store.isOpen();
      input.disabled = !open;
      setButton(open ? 'Enviar para a nuvem ↗' : 'Participação encerrada', !open);
      if (!open) setFeedback('Obrigado por fazer parte deste momento.');
    } catch {
      input.disabled = false;
      setButton('Tentar enviar ↗');
      setFeedback('Não foi possível verificar a conexão. Tente novamente.');
    }
  }

  input.addEventListener('input', () => {
    $('length').textContent = `${input.value.length}/${MAX_LENGTH}`;
    input.setCustomValidity('');
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    const answer = normalizeAnswer(input.value);
    if (!isValidAnswer(answer)) {
      input.setCustomValidity('Use de 2 a 30 caracteres e inclua pelo menos uma palavra.');
      input.reportValidity();
      return;
    }
    busy = true;
    input.disabled = true;
    setButton('Enviando…', true);
    setFeedback('');
    // Reaproveita o UUID enquanto a resposta for a mesma: reenvios não duplicam.
    if (!pending || pending.answer !== answer) pending = { id: crypto.randomUUID(), answer, event_id: app.event };
    try {
      await store.insert(pending);
      $('sent-answer').textContent = answer;
      form.hidden = true;
      $('success').hidden = false;
      pending = null;
    } catch (error) {
      if (error.kind === 'inappropriate') {
        setFeedback('Essa expressão não é permitida. Escolha outra palavra.');
        pending = null;
      } else if (error.kind === 'closed') setFeedback('A participação pode ter sido encerrada. Atualize a página para conferir.');
      else if (error.kind === 'invalid') setFeedback('Use uma palavra ou expressão de 2 a 30 caracteres.');
      else setFeedback('Não conseguimos confirmar o envio. Confira sua conexão e tente novamente.');
    } finally {
      busy = false;
      input.disabled = false;
      setButton('Enviar para a nuvem ↗');
    }
  });

  $('again').onclick = () => {
    input.value = '';
    $('length').textContent = `0/${MAX_LENGTH}`;
    $('success').hidden = true;
    form.hidden = false;
    setFeedback('');
    checkOpen();
    input.focus();
  };

  checkOpen();
})();
