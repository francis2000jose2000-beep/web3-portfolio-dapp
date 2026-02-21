# Design de Páginas (Desktop-first)

## Global Styles (aplica a todas as páginas)
- Layout: container central `max-width: 1200px`, padding lateral 24px, grid de 12 colunas (CSS Grid) + Flexbox para alinhamentos internos.
- Breakpoints: desktop (≥1024), tablet (768–1023), mobile (≤767). Desktop-first com colapso de colunas para 1 coluna no mobile.
- Tokens (exemplo):
  - Background: `#0B0F19` (base), superfícies: `#111827`, bordas: `#1F2937`.
  - Texto: primário `#E5E7EB`, secundário `#9CA3AF`.
  - Accent: `#7C3AED` (primary), sucesso `#10B981`, erro `#EF4444`, warning `#F59E0B`.
  - Tipografia: 14/16/20/28 (body, label, h3, h1). Fonte sans (ex.: Inter).
  - Botões: primário sólido + hover (clarear 8%), secundário outline; estados disabled e loading.
  - Links: underline no hover; foco visível (ring 2px).
- Componentes globais:
  - TopNav fixa (altura 64px): logo, links (“Eventos”), status da rede, botão Conectar Carteira.
  - Toasts: feedback de transação (pending/success/fail), com link para explorer.

---

## 1) Página inicial
### Layout
- Estrutura em seções empilhadas (stacked sections) com grid 2 colunas no desktop: esquerda (mensagem/CTA), direita (cartões de destaques).

### Meta Information
- Title: "Home | Leilões on-chain e eventos"
- Description: "Acompanhe leilões on-chain e organize eventos pessoais por carteira."
- Open Graph: título/descrição iguais + imagem padrão do produto.

### Page Structure
1. **Hero + Conexão** (grid 8/4)
2. **Destaques de Leilões** (cards)
3. **Atalhos / Ajuda rápida**

### Sections & Components
- Hero
  - Headline (H1) + subtítulo.
  - Card “Status da Carteira”: endereço abreviado, chainId, botão conectar/desconectar.
- Destaques de Leilões
  - Lista de 3–5 cards (grid 3 colunas no desktop, 2 no tablet, 1 no mobile).
  - Cada card: AuctionId, status badge, maior lance, tempo restante, CTA “Ver detalhes”.
- Ajuda rápida
  - Blocos curtos: “Como dar lance”, “O que o watcher faz”, “Onde ver eventos”.

Interações
- Conectar carteira via componente wagmi (modal/connector list).
- Cards carregam skeleton enquanto a API responde.

---

## 2) Página de Eventos (/events)
### Layout
- Layout híbrido: topo com filtros (Flex), conteúdo principal em grid com duas colunas no desktop:
  - Coluna esquerda (8/12): Feed de eventos.
  - Coluna direita (4/12): Eventos pessoais (form + lista) e Leilões (lista compacta).
- No mobile: colunas viram abas (Feed / Pessoais / Leilões).

### Meta Information
- Title: "Eventos | Feed on-chain e pessoais"
- Description: "Feed unificado de eventos do contrato e eventos pessoais por carteira."
- OG: conforme padrão.

### Page Structure
1. **Header + Filtros**
2. **Feed**
3. **Painel lateral** (Pessoais + Leilões)

### Sections & Components
- Header + Filtros
  - Título (H1) “Eventos”.
  - Filtros: tipo (All/Pessoal/On-chain), intervalo de datas, filtro por AuctionId, botão “Limpar”.
- Feed (timeline)
  - Lista vertical com itens em “timeline cards”.
  - Item do feed:
    - Ícone por tipo.
    - Título, timestamp, metadados (AuctionId/txHash).
    - Ação contextual: “Abrir leilão” quando aplicável.
- Painel: Eventos pessoais
  - Form compacto: título (obrigatório), descrição, start/end, visibilidade (private/public), CTA “Salvar”.
  - Lista dos próximos eventos pessoais: ordenar por start_at.
  - Ações: editar (abre drawer/modal) e remover (confirmação).
- Painel: Leilões
  - Lista compacta com busca por AuctionId.
  - Cada item: status, maior lance, CTA “Detalhe”.

Estados
- Empty state do feed (sem resultados) com sugestão de ajustar filtros.
- Loading: skeleton + spinner nos filtros.
- Erros: banner com retry.

---

## 3) Detalhe do Leilão (/auctions/:id)
### Layout
- Dashboard em 2 colunas no desktop:
  - Esquerda (7/12): resumo + histórico.
  - Direita (5/12): caixa de lance + ações do criador.
- No tablet/mobile: coluna única com acordeões.

### Meta Information
- Title: "Leilão {id} | Detalhe"
- Description: "Veja status, histórico e faça lances usando wagmi/viem."
- OG: incluir AuctionId e status.

### Page Structure
1. **Header do Leilão** (ID + badges)
2. **Resumo** (card)
3. **Histórico de lances/eventos**
4. **Painel de ação (lance/finalizar)**

### Sections & Components
- Header do Leilão
  - Breadcrumb: Home / Eventos / Leilão.
  - Título “Leilão #ID” + badge de status.
- Resumo
  - Grid de métricas: startPrice, minIncrement, highestBid, highestBidder, endTime, creator.
  - Link de txHash (quando existir) para explorer.
- Histórico
  - Tabela/lista: timestamp, bidder, valor, txHash.
  - Toggle “On-chain direto” vs “Indexado (watcher)” (somente leitura; ajuda a diagnosticar discrepâncias).
- Painel de Lance
  - Campo numérico (em ETH) + conversão para wei (helper) + validação (>= maior lance + incremento).
  - Botão primário “Dar lance” (loading enquanto transação pendente).
  - Bloco de status: hash, confirmações, erro revert (mensagem curta).
- Ações do criador
  - Se `walletAddress == creator`: botões “Finalizar” e/ou “Cancelar” conforme estado.
  - Confirmação modal para ações destrutivas.

Transições
- Atualização suave (fade) ao mudar status do leilão.
- Auto-refresh leve do estado (polling/subscribe) com limites para não sobrecarregar RPC.
