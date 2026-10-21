// Mescla a configuração do usuário com os padrões e aplica textos/tema na página.
(() => {
  'use strict';
  const defaults = {
    url: '',
    key: '',
    event: 'demo',
    title: 'Nuvem de palavras ao vivo',
    brand: ['NUVEM', 'AO VIVO'],
    question: 'O que torna nosso time incrível?',
    highlight: '',
    cloudLabel: 'NOSSO TIME, EM PALAVRAS',
    accent: '#2088f5',
    ink: '#092848',
    colors: ['#092848', '#1779d5', '#315b83', '#1262ad', '#52779b']
  };
  const app = (window.APP = Object.freeze({ ...defaults, ...(window.NUVEM || {}) }));

  const root = document.documentElement.style;
  root.setProperty('--blue', app.accent);
  root.setProperty('--ink', app.ink);

  const isRespond = document.body.classList.contains('respond-page');
  document.title = isRespond ? `Participe · ${app.title}` : app.title;
  const description = document.querySelector('meta[name="description"]');
  if (description) description.content = app.question;

  const brand = document.getElementById('brand');
  if (brand) {
    const strong = document.createElement('strong');
    strong.textContent = app.brand[1] || '';
    brand.replaceChildren(`${app.brand[0] || ''} `, strong);
  }

  const label = document.getElementById('cloud-label');
  if (label) label.textContent = app.cloudLabel;

  // Pergunta (com destaque opcional), montada via DOM — sem innerHTML.
  const question = document.getElementById('question');
  if (question) {
    const at = app.highlight ? app.question.lastIndexOf(app.highlight) : -1;
    if (at < 0) question.textContent = app.question;
    else {
      const em = document.createElement('em');
      em.textContent = app.highlight;
      question.replaceChildren(app.question.slice(0, at), em, app.question.slice(at + app.highlight.length));
    }
  }
})();
