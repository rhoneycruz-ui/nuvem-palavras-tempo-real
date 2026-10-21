const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeAnswer, isValidAnswer, canonical, countWords, MAX_LENGTH } = require('../src/lib.js');

test('normalizeAnswer remove espaços extras e normaliza Unicode', () => {
  assert.equal(normalizeAnswer('  muito   bom  '), 'muito bom');
  assert.equal(normalizeAnswer('cafe\u0301'), 'café'); // e + acento combinante -> é
});

test('isValidAnswer aceita respostas dentro das regras', () => {
  assert.ok(isValidAnswer('foco'));
  assert.ok(isValidAnswer('trabalho em equipe'));
  assert.ok(isValidAnswer('ação!'));
  assert.ok(isValidAnswer('x'.repeat(MAX_LENGTH)));
});

test('isValidAnswer rejeita respostas fora das regras', () => {
  assert.equal(isValidAnswer('a'), false); // curta demais
  assert.equal(isValidAnswer('x'.repeat(MAX_LENGTH + 1)), false); // longa demais
  assert.equal(isValidAnswer('1234'), false); // sem letras
  assert.equal(isValidAnswer('<b>oi</b>'), false); // marcação HTML
  assert.equal(isValidAnswer('oi\u0007'), false); // caractere de controle
});

test('canonical ignora acento, caixa e espaços repetidos', () => {
  assert.equal(canonical('  Inovação '), 'inovacao');
  assert.equal(canonical('TRABALHO   em Equipe'), 'trabalho em equipe');
});

test('countWords agrupa variações e ordena por frequência', () => {
  const rows = [
    { answer: 'Inovação' }, { answer: 'inovacao' }, { answer: 'INOVAÇÃO' },
    { answer: 'foco' }, { answer: 'Foco ' },
    { answer: 'união' }
  ];
  const result = countWords(rows);
  assert.deepEqual(result.map(w => [w.key, w.count]), [['inovacao', 3], ['foco', 2], ['uniao', 1]]);
  assert.equal(result[0].text, 'inovação'); // exibe a primeira grafia, em minúsculas
});

test('countWords desempata por ordem alfabética', () => {
  const result = countWords([{ answer: 'zelo' }, { answer: 'ânimo' }, { answer: 'bravura' }]);
  assert.deepEqual(result.map(w => w.key), ['animo', 'bravura', 'zelo']);
});

test('countWords com lista vazia retorna vazio', () => {
  assert.deepEqual(countWords([]), []);
});
