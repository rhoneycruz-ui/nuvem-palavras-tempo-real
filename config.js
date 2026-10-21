// Configuração do projeto. Todos os campos são opcionais.
// Com `url` e `key` vazios, o app roda em MODO DEMONSTRAÇÃO (sem Supabase).
//
// `key` deve ser a chave PUBLICÁVEL (anon) do Supabase. Ela é pública por
// design: quem protege os dados são as políticas RLS das migrações.
// NUNCA coloque aqui a service_role key.
window.NUVEM = {
  // --- Supabase (deixe vazio para o modo demonstração) ---
  url: '',
  key: '',
  event: 'demo', // id da linha na tabela `events`

  // --- Textos ---
  title: 'Nuvem de palavras ao vivo',
  brand: ['NUVEM', 'AO VIVO'],
  question: 'O que torna nosso time incrível?',
  highlight: 'incrível?', // trecho da pergunta destacado em cor (opcional)
  cloudLabel: 'NOSSO TIME, EM PALAVRAS',

  // --- Aparência ---
  accent: '#2088f5', // fundo das telas
  ink: '#092848', // textos escuros e botões
  colors: ['#092848', '#1779d5', '#315b83', '#1262ad', '#52779b'] // palavras
};
