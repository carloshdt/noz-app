# Ajustes - Noz

Lista de ajustes e melhorias menores que podem entrar no produto sem necessariamente virar uma grande feature ou spec separada.

---

## Estado Atual - Maio 2026

Foco agora: estabilizar a experiencia, deixar o app bonito de usar e manter testes verdes antes de abrir novas frentes grandes.

Nao puxar para implementacao agora:
- Infra de email/Supabase que depende de configuracao externa
- Login social do Google
- Conta oficial Noz/Chef
- Instagram
- Acervo de imagens
- Sidebar/drawer como navegacao principal

Observacao de produto: Configuracoes e Ajuda nao estao mais no fluxo visivel atual. O app esta operando principalmente pelas tabs, e qualquer retorno da sidebar/drawer deve ser reavaliado depois do polish.

---

## Tela de Receitas

### Filtros Avançados ✅ implementado

Ícone `SlidersHorizontal` ao lado do search box abre painel inline com filtros de Tempo e Dificuldade. Categoria já existe como chips horizontais na tela. O ícone fica colorido (primário) quando algum filtro está ativo.

Filtros implementados (Receitas + Feed):
- ✅ Filtrar por categoria (chips horizontais — Receitas já tinha, Feed ganhou no painel)
- ✅ Filtrar por tempo de preparo: até 15 min / até 30 min / até 1h
- ✅ Filtrar por dificuldade: Fácil / Médio / Difícil

Descartados:
- Filtrar por quantidade de porções — pouco valor prático
- Filtrar por ingredientes principais — complexo de implementar bem
- Filtrar por receitas públicas ou privadas — melhor como toggle na própria receita
- Filtrar por receitas salvas de outros usuários — relevante para Feed, não Receitas pessoais
- Filtrar por receitas sem foto — muito niche
- Filtrar por receitas que já foram cozinhadas / não testadas — requer novo campo no modelo

---

## Imagens

### Acervo de Imagens

Status: pausado. Ideia boa para depois, mas nao entra enquanto a prioridade for polimento, testes e correcoes do fluxo principal.

Criar um acervo de imagens prontas para o usuário usar em receitas, pastas, coleções e cardápios quando não tiver foto própria.

Ideias:

- Imagens organizadas por categoria, como massas, carnes, saladas, sobremesas, cafés e marmitas
- Capas prontas para pastas e coleções pessoais
- Imagens editoriais para coleções do Chef
- Fallbacks bonitos para receitas sem foto
- Opção de escolher entre foto própria e imagem do acervo
- Estilo visual consistente com a identidade do Noz
