# Ideas & Funcionalidades Futuras — Noz

Lista centralizada de ideias. Não comprometidas com nenhuma sprint — só um lugar para não perder nada.

---

## Ajustes Pendentes

### Configurar domínio de email próprio (Resend)
Resend free tier com `onboarding@resend.dev` só envia para o email da conta Resend. Para enviar reset de senha e confirmações para qualquer usuário, precisamos:
- Configurar domínio próprio no Resend (ex: `noz@seudominio.com`)
- Atualizar "Sender email address" no Supabase → Authentication → SMTP Settings
- Testar fluxo completo de reset de senha e confirmação de email

---

## Features

### Internacionalização (i18n)
Suporte a múltiplos idiomas com detecção automática pelo locale do dispositivo:
- PT-BR (padrão)
- PT-PT
- EN-US
- FR
- Mais idiomas a definir

---


### Modo "Cozinhando Agora"
Tela cheia passo a passo enquanto o usuário cozinha. Inclui:
- Navegação entre passos com swipe ou botões grandes (fácil com as mãos sujas)
- Timer integrado por etapa
- Tela que não apaga (wake lock) enquanto o modo estiver ativo
- Indicador de progresso visual

### Conta Oficial "Noz"
- Conta oficial do app para popular o feed no início, antes de ter usuários reais
- Publica receitas curadas/selecionadas para novos usuários não verem o feed vazio
- Funciona como "seed content" — dá vida ao app desde o primeiro dia
- Pode evoluir para um perfil editorial com receitas da estação, tendências, etc.

### Feed Social de Receitas
- Feed estilo scroll infinito onde usuários descobrem receitas de outros usuários
- Botão para adicionar a receita ao próprio acervo pessoal
- Botão para adicionar direto ao cardápio da semana
- Sistema de ranking para criadores: contagem de quantas vezes a receita foi adicionada por outros usuários
- Ranking de criadores mais populares

### Engajamento Social
- **Likes** nas receitas de outros usuários
- **Comentários** nas receitas — dicas, variações, avaliações
- Contagem de likes e comentários visível no feed e na receita
- Notificações quando alguém curtir ou comentar sua receita

---

## Stack & Arquitetura

- Expo + NativeWind (Tailwind para React Native)
- App nativo iOS e Android, com versão web embutida pelo Expo
- Camada de dados em hooks isolados (hoje: AsyncStorage + Supabase → sem tocar nos componentes ao evoluir)

---

## Identidade Visual

- Vibe: aconchegante e artesanal
- Tons terrosos: areia, terracota, verde musgo
- Tipografia serif para títulos
- Foco em mobile-first

---

## Nome do App

**Noz** — pequeno, forte, sofisticado

---

## Visão Comercial

- Público-alvo inicial: famílias e cozinheiros caseiros
- Potencial de monetização: planos premium, receitas exclusivas, cardápios personalizados
- Distribuição: App Store + Google Play
