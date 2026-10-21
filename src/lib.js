// Lógica pura (sem DOM): funciona no navegador (window.NuvemLib) e no Node (testes).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NuvemLib = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MIN_LENGTH = 2;
  const MAX_LENGTH = 30; // mesmo limite do CHECK da tabela `responses`

  /** Remove espaços extras e normaliza Unicode (NFC). */
  function normalizeAnswer(text) {
    return String(text).normalize('NFC').trim().replace(/\s+/g, ' ');
  }

  /** Mesmas regras do CHECK do banco: tamanho, ao menos uma letra, sem < > nem controle. */
  function isValidAnswer(answer) {
    return (
      answer.length >= MIN_LENGTH &&
      answer.length <= MAX_LENGTH &&
      /\p{L}/u.test(answer) &&
      !/[<>\x00-\x1f]/.test(answer)
    );
  }

  /** Chave de agrupamento: ignora acentos, caixa e espaços repetidos. */
  function canonical(text) {
    return String(text)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR')
      .trim()
      .replace(/\s+/g, ' ');
  }

  /** Agrupa respostas equivalentes. Ordena por contagem (desc) e depois alfabeticamente. */
  function countWords(rows) {
    const groups = new Map();
    for (const row of rows) {
      const key = canonical(row.answer);
      if (groups.has(key)) groups.get(key).count++;
      else
        groups.set(key, {
          text: normalizeAnswer(row.answer).toLocaleLowerCase('pt-BR'),
          count: 1,
          key
        });
    }
    return [...groups.values()].sort(
      (a, b) => b.count - a.count || a.key.localeCompare(b.key, 'pt-BR')
    );
  }

  return { MIN_LENGTH, MAX_LENGTH, normalizeAnswer, isValidAnswer, canonical, countWords };
});
