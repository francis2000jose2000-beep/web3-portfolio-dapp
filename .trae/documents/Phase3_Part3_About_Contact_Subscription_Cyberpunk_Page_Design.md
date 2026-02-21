# Page Design — About / Contact / Subscription + Tema Cyberpunk

## Global Styles (Desktop-first)
- Layout: base em **CSS Grid** para estrutura (header/main/footer) e **Flexbox** para alinhamentos internos.
- Breakpoints: desktop 1280+ (prioridade), tablet 768–1279, mobile <768 (Nav colapsa).
- Tokens (cyberpunk):
  - Background: #070A12 (quase preto azulado)
  - Surface: #0C1222 (cards)
  - Primary neon: #00E5FF (ciano)
  - Accent neon: #FF2BD6 (magenta)
  - Success/Error: #2DFF6A / #FF3B3B
  - Border: 1px solid rgba(0,229,255,0.25)
  - Glow: box-shadow 0 0 24px rgba(0,229,255,0.18)
- Tipografia: sans moderna (títulos com tracking leve), escala 14/16/20/28/40.
- Botões: primary (ciano) com hover glow; secondary (outline ciano); disabled com opacidade 0.5.
- Links: sublinhado só no hover; active com magenta.

## Componentes Globais
### Nav (tema cyberpunk)
- Estrutura: barra fixa no topo (sticky), Grid: logo | links | CTA.
- Elementos:
  - Logo (esquerda) com leve glow.
  - Links: Home (existente), About, Subscription, Contact.
  - Estado active: underline neon + cor magenta.
  - CTA (direita): botão primary para “Subscription”.
- Mobile: menu hambúrguer (drawer) com foco/teclado e overlay escuro.

### Footer (tema cyberpunk)
- Estrutura: 3 colunas (desktop) / empilhado (mobile).
- Conteúdo mínimo:
  - Coluna 1: Logo + frase curta.
  - Coluna 2: Links (About, Subscription, Contact).
  - Coluna 3: Info legal curta (ex.: “© Ano Projeto”).
- Estilo: linha superior neon (border) e ícones/links com hover glow.

---

## Página: /about
### Meta Information
- title: “Sobre | Projeto”
- description: “Conheça o propósito e visão do projeto.”
- og:title/og:description coerentes.

### Page Structure
- Layout: seções empilhadas, largura máx. 1100px, padding 64px.

### Seções & Componentes
1) Hero institucional
- Título grande + parágrafo curto; 2 CTAs: primary “Ver Subscription”, secondary “Falar no Contact”.
2) Blocos de conteúdo (cards)
- 3–5 cards com headings curtos e texto objetivo (scannable).
3) Faixa final CTA
- Card largo com destaque neon e botão primary para /subscription.

---

## Página: /contact
### Meta Information
- title: “Contato | Projeto”
- description: “Envie uma mensagem; responderemos o quanto antes.”

### Page Structure
- Layout: 2 colunas (desktop): texto/contatos à esquerda, formulário à direita; 1 coluna no mobile.

### Seções & Componentes
1) Cabeçalho
- Título + instrução curta (o que acontece após enviar).
2) Formulário (card)
- Campos: Nome*, E-mail*, Assunto (opcional), Mensagem*.
- Validação: obrigatórios, e-mail válido, limites de tamanho (UX).
- Botão: “Enviar mensagem” (primary).
- Estados:
  - Loading: botão com spinner e disabled.
  - Sucesso: alerta success + limpar formulário.
  - Erro: alerta error com texto curto e ação de tentar novamente.
- Integração: submit via POST /api/contact.

---

## Página: /subscription
### Meta Information
- title: “Subscription | Projeto”
- description: “Escolha/gerencie sua assinatura com clareza.”

### Page Structure
- Layout: hero + grade de planos (cards) + seção de confiança.

### Seções & Componentes
1) Hero
- Título + subtítulo orientado à decisão; CTA primary.
2) Cards de planos (melhoria UX/UI)
- Grid 3 colunas (desktop), 1–2 (tablet), 1 (mobile).
- Cada card: nome do plano, preço (se aplicável), bullets de benefícios, botão de ação.
- Plano recomendado: badge magenta + glow maior.
3) Status/feedback
- Área para mensagens de estado (ex.: “Processando…”, “Falha ao atualizar”).
4) Seção de confiança
- Microcopy curta (ex.: cancelamento/segurança) sem adicionar novas funcionalidades.
