# Ideias & Funcionalidades Futuras - Noz

Lista centralizada de ideias para o app **Noz**.

Este arquivo não é uma sprint nem um compromisso de entrega. É o lugar para guardar boas possibilidades, pendências importantes e apostas de produto antes que virem especificação.

---

## Decisao Atual - Maio 2026

Antes de novas implementacoes, a prioridade e deixar o app rodando bonito: corrigir falhas percebidas em teste manual, padronizar telas, reduzir atrito e manter Jest/TypeScript verdes.

Pausado por enquanto:
- Infra de email/Resend e ajustes externos de Supabase
- Google/social login
- Conta oficial `@noz`/Chef
- Instagram
- Acervo de imagens
- Configuracoes, Ajuda e sidebar/drawer como fluxo visivel

Esses itens continuam registrados aqui para nao se perderem, mas nao devem virar tarefa de implementacao agora.

---

## Pendências de Infra

### Configurar domínio de email próprio (Resend)

Status: pendente/pausado. Depende de configuracao externa e nao faz parte do ciclo atual de polish.

Hoje, o free tier do Resend com `onboarding@resend.dev` só envia emails para o endereço da conta Resend. Para liberar reset de senha e confirmação de email para qualquer usuário, precisamos:

- Configurar um domínio próprio no Resend, por exemplo `noz@seudominio.com`
- Atualizar o **Sender email address** em Supabase > Authentication > SMTP Settings
- Testar o fluxo completo de reset de senha
- Testar o fluxo completo de confirmação de email

---

## Já Virou Spec

### Feed Social de Receitas

Status: especificado em `docs/superpowers/specs/2026-05-02-feed-social-design.md`.

Escopo da primeira versão:

- Feed com scroll vertical e descoberta de receitas públicas
- Botão para salvar receita no acervo pessoal
- Perfil público de criadores
- Conta oficial `@noz` para popular o feed inicial
- Rastreamento de origem quando uma receita é salva

Ideias relacionadas que ficaram para versões futuras:

- Likes
- Comentários
- Rankings de criadores
- Busca e filtros no feed
- Notificações
- Seguir criadores

---

## Produto

### Modo "Cozinhando Agora"

Tela cheia passo a passo para acompanhar a receita enquanto o usuário cozinha.

Ideias principais:

- Navegação entre passos com swipe ou botões grandes
- Timer integrado por etapa
- Tela que não apaga enquanto o modo estiver ativo
- Indicador visual de progresso
- Interface legível à distância, com poucos elementos por tela

### Internacionalização (i18n)

Suporte a múltiplos idiomas com detecção automática pelo locale do dispositivo.

Idiomas iniciais possíveis:

- PT-BR como padrão
- PT-PT
- EN-US
- FR

Notas:

- Separar textos da interface antes de expandir muito o app
- Pensar em unidades, pluralização e formatos de data/medida desde o início

### Conta Oficial "Noz"

Status: pausado. A ideia continua valida para popular o feed no futuro, mas agora a prioridade e deixar os fluxos atuais funcionais para o usuario real.

Conta oficial do app para dar vida ao feed antes de existir massa crítica de usuários.

Possíveis usos:

- Publicar receitas curadas
- Evitar feed vazio para novos usuários
- Criar coleções sazonais
- Destacar receitas simples, familiares e testadas
- Evoluir para um perfil editorial do app

### Engajamento Social

Camada social para depois da primeira versão do feed.

Possíveis funcionalidades:

- Likes em receitas públicas
- Comentários com dicas, variações e avaliações
- Contagem de likes e comentários no feed e na receita
- Notificações quando alguém curtir ou comentar uma receita do usuário
- Ranking de criadores por receitas salvas, curtidas ou comentadas

### Busca e Descoberta

Melhorar a exploração do acervo público e pessoal.

Ideias:

- Busca por nome da receita
- Filtros por tempo de preparo, dificuldade e porções
- Filtros por ingredientes disponíveis
- Tags como rápido, econômico, vegetariano, sobremesa, marmita
- Coleções editoriais da conta `@noz`

### Despensa e Receitas por Sobra

Permitir que o usuário informe quais ingredientes tem em casa e receba sugestões de receitas possíveis ou quase possíveis.

Isso junta duas ideias em uma só:

- **Modo Despensa:** usuário cadastra ingredientes disponíveis em casa
- **Receitas por sobra:** usuário informa algo como "tenho arroz, frango e cenoura; o que dá para fazer?"

Ideias:

- Sugerir receitas que o usuário já consegue preparar com o que tem
- Mostrar receitas em que falta apenas 1 ou 2 ingredientes
- Priorizar receitas do acervo pessoal antes de sugerir receitas públicas
- Ajudar a aproveitar sobras e reduzir desperdício
- Integrar com lista de compras para completar ingredientes faltantes

### Substituições Inteligentes

Sugerir trocas de ingredientes quando o usuário não tem algo em casa, tem restrição alimentar ou quer adaptar a receita.

Exemplos:

- Sem creme de leite? Sugerir iogurte natural ou creme vegetal, dependendo da receita
- Sem manjericão? Sugerir salsinha, orégano ou outra erva próxima
- Trocas por restrição: sem lactose, vegetariano, sem glúten
- Avisar quando a troca pode mudar textura, sabor ou tempo de preparo

Observação: pode virar recurso premium no futuro, principalmente se combinado com despensa, restrições e planejamento.

### Pastas e Coleções Pessoais

Permitir que o usuário crie pastas, coleções ou "containers" para organizar as receitas do jeito que fizer sentido para ele.

Ideias:

- Criar pastas personalizadas, como `Jantar da semana`, `Receitas da mãe`, `Sobremesas`, `Marmitas` ou `Quero testar`
- Adicionar a mesma receita em mais de uma pasta
- Reordenar receitas dentro de uma pasta
- Escolher capa, cor ou ícone para cada pasta
- Ter pastas privadas por padrão
- Transformar uma pasta em coleção compartilhável no futuro

### Coleções do Chef

Usar a conta principal do app, como `@noz` ou `Chef`, para publicar coleções prontas e cardápios temáticos com receitas selecionadas.

Ideias:

- Semana econômica
- Jantar leve
- Marmitas de domingo
- Receitas para receber amigos
- Sobremesas fáceis
- Receitas de estação

Notas:

- Essas coleções podem aparecer no perfil oficial do Chef
- Podem funcionar como inspiração para o usuário criar as próprias coleções
- Podem ajudar a dar vida editorial ao app sem depender só de posts soltos no feed

### Histórico do que Cozinhei

Registrar o que o usuário cozinhou ao longo do tempo para ajudar na rotina e evitar repetição.

Ideias:

- Calendário simples com receitas preparadas por dia ou semana
- Botão "Cozinhei" dentro da receita
- Notas rápidas depois de cozinhar, como "colocar menos sal" ou "assar 10 min a mais"
- Sugerir receitas que o usuário não faz há algum tempo
- Ajudar o planejamento semanal com base no histórico real da casa

### Planejamento Inteligente

Evoluir o cardápio semanal para ajudar mais na rotina.

Ideias:

- Sugerir cardápios a partir das receitas salvas
- Reaproveitar ingredientes entre receitas
- Gerar lista de compras consolidada
- Sugerir receitas para sobras
- Marcar preferências e restrições alimentares da família

---

## Stack & Arquitetura

- Expo + NativeWind
- App nativo iOS e Android, com versão web pelo Expo
- Camada de dados em hooks isolados
- Estado atual: AsyncStorage + Supabase
- Objetivo: evoluir dados e sincronização sem espalhar lógica pelos componentes

---

## Identidade Visual

Direção:

- Aconchegante
- Artesanal
- Familiar sem parecer infantil
- Sofisticado sem ficar frio

Paleta inicial:

- Areia
- Terracota
- Verde musgo
- Tons claros de cozinha e papel

Tipografia:

- Serif para títulos e momentos de marca
- Sans legível para interface, formulários e leitura longa

Princípios:

- Mobile-first
- Pouca fricção
- Interface calma
- Receitas e comida como protagonistas

---

## Nome do App

**Noz**

Pequeno, forte, memorável e com cara de cozinha afetiva.

Possíveis associações:

- Ingrediente simples e sofisticado
- Algo que cabe na mão
- Núcleo, semente, começo
- Sonoridade curta para app

---

## Visão Comercial

Público-alvo inicial:

- Famílias
- Cozinheiros caseiros
- Pessoas que repetem receitas e querem organizar a rotina
- Quem quer planejar a semana sem transformar comida em planilha chata

Potenciais caminhos de monetização:

- Plano premium
- Cardápios personalizados
- Receitas exclusivas
- Coleções sazonais
- Recursos avançados de planejamento e lista de compras

Distribuição:

- App Store
- Google Play
- Web via Expo enquanto fizer sentido para acesso e testes
