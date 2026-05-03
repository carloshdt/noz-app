# Ajustes - Noz

Lista de ajustes e melhorias menores que podem entrar no produto sem necessariamente virar uma grande feature ou spec separada.

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

Criar um acervo de imagens prontas para o usuário usar em receitas, pastas, coleções e cardápios quando não tiver foto própria.

Ideias:

- Imagens organizadas por categoria, como massas, carnes, saladas, sobremesas, cafés e marmitas
- Capas prontas para pastas e coleções pessoais
- Imagens editoriais para coleções do Chef
- Fallbacks bonitos para receitas sem foto
- Opção de escolher entre foto própria e imagem do acervo
- Estilo visual consistente com a identidade do Noz
