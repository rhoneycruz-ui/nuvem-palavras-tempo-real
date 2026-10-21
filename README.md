# Nuvem de Palavras ao Vivo

[![Tests](https://github.com/rhoneycruz-ui/nuvem-palavras-tempo-real/actions/workflows/tests.yml/badge.svg)](https://github.com/rhoneycruz-ui/nuvem-palavras-tempo-real/actions/workflows/tests.yml)

Nuvem de palavras interativa em tempo real para eventos, workshops e reuniões. O público escaneia um QR code, responde a uma pergunta pelo celular e a resposta aparece na tela principal em segundos. Sem cadastro, sem coleta de nome ou e-mail e com custo zero nos planos gratuitos.

![Tela principal com a nuvem e o QR code](docs/assets/tela-principal.png)

> Captura do **modo demonstração**, que roda sem nenhum serviço externo.

## O que o projeto entrega

- tela principal para TV ou projetor, com a nuvem, o contador de respostas e o QR code;
- página de resposta otimizada para celular, com validação e contador de caracteres;
- atualização em tempo real, com reconciliação periódica caso a conexão oscile;
- agrupamento de respostas equivalentes (ignora acentos, maiúsculas e espaços repetidos);
- filtro de linguagem imprópria aplicado no banco de dados (português e inglês);
- reinício de rodada protegido por código de administrador, preservando o histórico;
- pergunta, textos e cores configuráveis em um único arquivo;
- **modo demonstração** sem backend, para testar e apresentar o projeto;
- testes automatizados da lógica em Node.js 20 e 22.

## Arquitetura

```
 Celular                  Supabase                      TV / projetor
 responder.html ──insert──> Postgres (RLS + filtro) ──Realtime──> index.html
   respond.js                 events · responses                    cloud.js
                                   ▲
                 reset-cloud (Edge Function) ◄── botão ↺ + código de administrador
```

A camada de dados é isolada em `src/store.js`, com duas implementações da mesma interface:

- `src/store.js` — Supabase (produção) ou `localStorage` (demonstração);
- `src/lib.js` — regras puras (validação, normalização, agrupamento), usadas no navegador e nos testes;
- `src/cloud.js` — layout da nuvem (d3-cloud), QR code e controle do evento;
- `src/respond.js` — formulário de resposta;
- `src/common.js` — aplica `config.js` (textos e tema) às páginas;
- `supabase/` — migrações (tabelas, RLS, filtro) e a função de reinício.

## Executar em modo demonstração

Requer apenas o Node.js (ou qualquer servidor HTTP estático).

```bash
npx serve .
```

Abra `http://localhost:3000` (tela principal) e `http://localhost:3000/responder.html` em outra aba. Com `url` e `key` vazios em `config.js`, os dados ficam no `localStorage` e sincronizam **entre abas do mesmo navegador**. Para usar com celulares de verdade, configure o Supabase abaixo.

> Abrir os arquivos com `file://` não funciona corretamente. Use sempre um servidor HTTP.

## Personalização

Edite `config.js`:

```js
window.NUVEM = {
  url: '', key: '', event: 'demo',                  // Supabase
  title: 'Nuvem de palavras ao vivo',
  brand: ['NUVEM', 'AO VIVO'],
  question: 'O que torna nosso time incrível?',
  highlight: 'incrível?',                           // trecho destacado (opcional)
  cloudLabel: 'NOSSO TIME, EM PALAVRAS',
  accent: '#2088f5', ink: '#092848',
  colors: ['#092848', '#1779d5', '#315b83', '#1262ad', '#52779b']
};
```

## Configurar o Supabase

1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. No **SQL Editor**, execute em ordem `supabase/migrations/001_create_word_cloud.sql` e `002_filter_language.sql`. O evento criado se chama `demo`; para outro nome, altere o `insert` da migração `001` e o campo `event` do `config.js`.
3. Em **Settings → API**, copie a *Project URL* e a chave **publicável** para `url` e `key` em `config.js`. Essa chave é pública por design: as permissões reais são aplicadas pelas políticas RLS. Nunca use a `service_role`.
4. Troque `SEU-PROJETO` por seu identificador no `_headers` (política de segurança de conteúdo).

### Função de reinício (opcional)

O botão **↺** da tela principal oculta as respostas atuais e começa uma nova rodada. Ele chama a função `supabase/functions/reset-cloud`, que exige um código de administrador. O repositório **não guarda o código**, apenas o hash fica como segredo no Supabase.

Gere o hash SHA-256 do código escolhido:

```powershell
# Windows (PowerShell)
$b=[Text.Encoding]::UTF8.GetBytes("seu-codigo-aqui")
-join ([Security.Cryptography.SHA256]::Create().ComputeHash($b) | % { $_.ToString("x2") })
```

```bash
# Linux / macOS
printf '%s' 'seu-codigo-aqui' | sha256sum
```

Publique com a [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase secrets set ALLOWED_ORIGIN=https://seu-site.netlify.app ADMIN_CODE_HASH=<hash>
supabase functions deploy reset-cloud --no-verify-jwt
```

A função valida a origem da requisição e o código; por isso é implantada sem a verificação de JWT, já que chaves publicáveis não são JWT. Use um código longo: não há limite de tentativas.

## Publicar

O site é 100% estático. No Netlify, arraste esta pasta (com `index.html` na raiz) para um novo site, ou conecte o repositório. Os arquivos `_headers` e `_redirects` já configuram cabeçalhos de segurança e a rota `/responder`. Depois de publicar, confira que `ALLOWED_ORIGIN` corresponde à URL final.

## Testes

```bash
npm test
```

Cobrem validação de respostas, normalização, agrupamento e ordenação (`tests/lib.test.js`). O GitHub Actions repete a validação em Node.js 20 e 22 a cada push e pull request.

## Segurança, privacidade e limitações

- Nenhum dado pessoal é coletado. A página de resposta pede para não incluir dados pessoais.
- O banco aceita apenas `insert` de `id`, `event_id` e `answer` por clientes anônimos, com `CHECK` de tamanho e caracteres e RLS ativa.
- O filtro de linguagem reduz casos comuns, mas **não substitui moderação humana**. A lista fica em `002_filter_language.sql` e pode ser ajustada.
- Não há limite de respostas por dispositivo.
- O projeto gratuito do Supabase pode ser pausado por inatividade. Confirme que está ativo e teste a rede do local antes do evento.
- No modo demonstração não há filtro de linguagem nem sincronização entre dispositivos.

## Tecnologias

JavaScript · HTML · CSS · Supabase (Postgres, RLS, Realtime, Edge Functions) · d3-cloud · qrcode-generator · Netlify · GitHub Actions

As bibliotecas de terceiros ficam em `vendor/`, com suas licenças.
