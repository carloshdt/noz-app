# Recipe App — Design Spec
**Data:** 2026-04-28  
**Status:** Aprovado

---

## Visão Geral

App de catálogo de receitas para famílias e cozinheiros caseiros. Foco em visual artesanal de alta qualidade com experiência nativa em iOS e Android. Versão web disponível via Expo. Dados locais inicialmente, arquitetura preparada para migração a backend comercial.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Base | Expo SDK 51+ (managed workflow) |
| Estilo | NativeWind v4 (Tailwind para React Native) |
| Navegação | Expo Router v3 (file-based, similar ao Next.js) |
| Animações | React Native Reanimated |
| Persistência | AsyncStorage |
| Ícones | Lucide React Native |

---

## Arquitetura

### Estrutura de Pastas

```
app/
  (tabs)/
    index.tsx          → lista de receitas
    cardapio.tsx       → cardápio semanal
    compras.tsx        → lista de compras
  receita/
    [id].tsx           → detalhes da receita
    nova.tsx           → criar receita
    [id]/editar.tsx    → editar receita
hooks/
  useReceitas.ts       → lógica de dados de receitas
  useCardapio.ts       → lógica de cardápio e lista de compras
components/
  ui/                  → componentes base (Button, Card, Badge, Input)
  ReceitaCard.tsx
  ReceitaForm.tsx
  IngredienteItem.tsx
  InstrucaoItem.tsx
```

### Princípio de Dados

Os `hooks/` são a única camada que toca em dados. Componentes não sabem se os dados vêm de AsyncStorage ou de uma API. Quando migrar para backend (Supabase, REST, etc.), apenas a implementação interna dos hooks muda — os contratos públicos permanecem iguais.

---

## Identidade Visual

### Paleta de Cores

| Token | Hex | Uso |
|---|---|---|
| Background | `#FAF6F1` | Fundo de telas |
| Surface | `#F0E8DC` | Cards, inputs, áreas elevadas |
| Primary | `#8B4513` | Botões principais, tab ativo |
| Accent | `#6B7C5C` | Tags, badges, destaques |
| Text | `#2C1810` | Texto principal |
| Text Muted | `#8C7B6B` | Subtítulos, labels |
| Border | `#D4C4B0` | Divisores, bordas de card |

### Tipografia

| Uso | Fonte | Tamanho |
|---|---|---|
| Título de página | Playfair Display (serif) | 28px |
| Título de card | Playfair Display (serif) | 20px |
| Corpo de texto | Inter (sans-serif) | 16px |
| Label / caption | Inter (sans-serif) | 13px |

### Estilo de Componentes

- Cards: cantos arredondados (radius 12px), sombra sutil, sem bordas duras
- Botões primários: terracota sólido, texto branco, sem gradiente
- Inputs: fundo surface, borda bege
- Ícones: linha fina (Lucide), nunca preenchidos
- Fotos de receita: aspect ratio 4:3 com overlay gradiente no bottom para o título

**Tom geral:** caderno de receitas bem cuidado, não app de delivery. Telas com espaço para respirar.

---

## Navegação

Bottom tab bar com 3 abas. Fundo creme, tab ativo em terracota.

```
🍽  Receitas    📅  Cardápio    🛒  Compras
```

---

## Telas

### Lista de Receitas
- Header com saudação contextual + campo de busca
- Filtros por categoria em chips horizontais com scroll
- Grid 2 colunas: card com foto 4:3, título, tempo de preparo, dificuldade
- FAB no canto inferior direito para adicionar receita

### Detalhes da Receita
- Foto em tela cheia no topo com gradiente e título sobreposto
- Scroll revela: badges de tempo/porções/dificuldade, lista de ingredientes, instruções numeradas
- Botão fixo no bottom: "Adicionar ao Cardápio"

### Criar / Editar Receita
- Formulário em seções colapsáveis: Informações Gerais → Ingredientes → Modo de Preparo
- Ingredientes adicionados individualmente: quantidade + unidade + nome
- Instruções como lista ordenada editável

### Cardápio Semanal
- 7 cards empilhados, um por dia da semana
- Cada card exibe receita atribuída ou slot vazio com "+"
- Tap abre bottom sheet para escolher receita

### Lista de Compras
- Gerada automaticamente pelo cardápio da semana
- Ingredientes agrupados por categoria
- Checkbox por item — riscado quando marcado
- Botão para limpar lista

---

## Modelo de Dados

```typescript
type Receita = {
  id: string
  nome: string
  categoria: string
  imagem?: string           // URI local ou URL futura
  tempoPreparo: number      // minutos
  porcoes: number
  dificuldade: 'Fácil' | 'Médio' | 'Difícil'
  ingredientes: {
    nome: string
    quantidade: number
    unidade: string
  }[]
  instrucoes: string[]
  criadaEm: string          // ISO date string
}

type CardapioDia = {
  diaSemana: 0 | 1 | 2 | 3 | 4 | 5 | 6
  receitaId: string | null
}
```

### Persistência (AsyncStorage)

| Chave | Conteúdo |
|---|---|
| `@receitas` | `Receita[]` |
| `@cardapio` | `CardapioDia[]` |
| `@compras_checked` | `string[]` (ids de itens marcados) |

### Hooks Públicos

**`useReceitas()`**
- `receitas: Receita[]`
- `buscar(termo: string): Receita[]`
- `adicionar(receita: Omit<Receita, 'id' | 'criadaEm'>): void`
- `editar(id: string, dados: Partial<Receita>): void`
- `remover(id: string): void`

**`useCardapio()`**
- `cardapio: CardapioDia[]`
- `atribuir(diaSemana: number, receitaId: string | null): void`
- `limpar(): void`
- `gerarListaCompras(): ItemCompra[]`

---

## Considerações Futuras

- Substituir AsyncStorage por chamadas de API (Supabase ou REST) sem alterar componentes
- Autenticação de usuário para receitas pessoais sincronizadas
- Distribuição via App Store e Google Play
- Modo "Cozinhando Agora": passo a passo em tela cheia com timer e wake lock
