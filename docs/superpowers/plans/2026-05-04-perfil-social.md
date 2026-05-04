# Perfil Social + Badges — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reformular tela de perfil (próprio e público) com stats sociais, sistema de badges gamificado, tabs Criadas/Salvas. Renomear "Compartilhada por" → "Salva de" em toda UI.

**Architecture:** `lib/badges.ts` pura função sem deps de DB. `useProfile` extendido com queries de corações e comentários recebidos. `app/(tabs)/perfil.tsx` novo layout. `app/perfil/[id].tsx` novo layout público. `ReceitaCard` renomeação.

**Tech Stack:** Supabase, React Native, NativeWind, expo-router.

**Dependências:** `recipe_hearts` e `comments` tabelas devem existir (planos corações e comentários).

---

## Arquivos

| Ação | Arquivo |
|------|---------|
| Create | `lib/badges.ts` |
| Create | `__tests__/lib/badges.test.ts` |
| Modify | `hooks/useProfile.ts` — adicionar stats agregados |
| Modify | `app/(tabs)/perfil.tsx` — novo layout |
| Modify | `app/perfil/[id].tsx` — layout público |
| Modify | `components/ReceitaCard.tsx` — "Salva de" |

---

## Task 1: `lib/badges.ts` (TDD)

**Files:**
- Create: `__tests__/lib/badges.test.ts`
- Create: `lib/badges.ts`

### Tipos usados

```ts
// Do types/index.ts (já existente)
// Receita: { id, categorias: string[], imagem?, ingredientes[], instrucoes[], fonte_receita_id? }

export type ProfileStats = {
  totalReceitas: number;
  totalSalvas: number;        // total_importacoes coluna DB
  totalCorações: number;      // corações recebidos
  totalComentarios: number;   // comentários recebidos
};

export type Badge = {
  id: string;
  label: string;
  emoji: string;
  grupo: 'solo' | 'categoria' | 'influencia';
  unlocked: boolean;
  descricao: string;
};
```

- [ ] **Step 1: Escrever testes**

```ts
// __tests__/lib/badges.test.ts
import { computarBadges, ProfileStats } from '../../lib/badges';
import { Receita } from '../../types';

const statsZero: ProfileStats = {
  totalReceitas: 0, totalSalvas: 0, totalCorações: 0, totalComentarios: 0,
};

function makeReceita(overrides: Partial<Receita> = {}): Receita {
  return {
    id: 'r1', user_id: 'u1', nome: 'Teste', categorias: ['Carnes'],
    tempoPreparo: 30, porcoes: 2, dificuldade: 'Fácil',
    ingredientes: [], instrucoes: [], criadaEm: '2026-01-01',
    ...overrides,
  };
}

describe('computarBadges — solo', () => {
  it('nenhum badge com 0 receitas', () => {
    const badges = computarBadges([], statsZero);
    expect(badges.find(b => b.id === 'primeira-receita')?.unlocked).toBe(false);
  });

  it('primeira-receita desbloqueado com 1 receita', () => {
    const badges = computarBadges([makeReceita()], statsZero);
    expect(badges.find(b => b.id === 'primeira-receita')?.unlocked).toBe(true);
  });

  it('receita-completa desbloqueado com foto+ingredientes+instrucoes', () => {
    const completa = makeReceita({
      imagem: 'url.jpg',
      ingredientes: [{ nome: 'sal', quantidade: '1', unidade: 'colher' }],
      instrucoes: [{ texto: 'misturar' }],
    });
    const badges = computarBadges([completa], statsZero);
    expect(badges.find(b => b.id === 'receita-completa')?.unlocked).toBe(true);
  });

  it('receita-completa bloqueado sem imagem', () => {
    const incompleta = makeReceita({
      ingredientes: [{ nome: 'sal', quantidade: '1', unidade: 'colher' }],
      instrucoes: [{ texto: 'misturar' }],
    });
    const badges = computarBadges([incompleta], statsZero);
    expect(badges.find(b => b.id === 'receita-completa')?.unlocked).toBe(false);
  });

  it('5-receitas desbloqueado com >= 5 receitas', () => {
    const receitas = Array.from({ length: 5 }, (_, i) => makeReceita({ id: `r${i}` }));
    const badges = computarBadges(receitas, statsZero);
    expect(badges.find(b => b.id === '5-receitas')?.unlocked).toBe(true);
  });

  it('10-receitas bloqueado com apenas 5', () => {
    const receitas = Array.from({ length: 5 }, (_, i) => makeReceita({ id: `r${i}` }));
    const badges = computarBadges(receitas, statsZero);
    expect(badges.find(b => b.id === '10-receitas')?.unlocked).toBe(false);
  });

  it('chef-diversificado desbloqueado com >= 3 categorias distintas', () => {
    const receitas = [
      makeReceita({ id: 'r1', categorias: ['Carnes'] }),
      makeReceita({ id: 'r2', categorias: ['Massas'] }),
      makeReceita({ id: 'r3', categorias: ['Sobremesas'] }),
    ];
    const badges = computarBadges(receitas, statsZero);
    expect(badges.find(b => b.id === 'chef-diversificado')?.unlocked).toBe(true);
  });

  it('chef-diversificado bloqueado com < 3 categorias', () => {
    const receitas = [
      makeReceita({ id: 'r1', categorias: ['Carnes'] }),
      makeReceita({ id: 'r2', categorias: ['Carnes'] }),
    ];
    const badges = computarBadges(receitas, statsZero);
    expect(badges.find(b => b.id === 'chef-diversificado')?.unlocked).toBe(false);
  });
});

describe('computarBadges — categoria', () => {
  it('5-Carnes desbloqueado com 5 receitas de Carnes', () => {
    const receitas = Array.from({ length: 5 }, (_, i) =>
      makeReceita({ id: `r${i}`, categorias: ['Carnes'] })
    );
    const badges = computarBadges(receitas, statsZero);
    expect(badges.find(b => b.id === '5-Carnes')?.unlocked).toBe(true);
  });

  it('25-Carnes bloqueado com apenas 5 receitas', () => {
    const receitas = Array.from({ length: 5 }, (_, i) =>
      makeReceita({ id: `r${i}`, categorias: ['Carnes'] })
    );
    const badges = computarBadges(receitas, statsZero);
    expect(badges.find(b => b.id === '25-Carnes')?.unlocked).toBe(false);
  });

  it('sem badges de Massas quando usuário não tem receitas nessa categoria', () => {
    const receitas = [makeReceita({ categorias: ['Carnes'] })];
    const badges = computarBadges(receitas, statsZero);
    const massBadges = badges.filter(b => b.id.endsWith('-Massas'));
    expect(massBadges).toHaveLength(0);
  });
});

describe('computarBadges — influencia', () => {
  it('primeira-salva desbloqueado com >= 1 salva', () => {
    const stats: ProfileStats = { ...statsZero, totalSalvas: 1 };
    const badges = computarBadges([], stats);
    expect(badges.find(b => b.id === 'primeira-salva')?.unlocked).toBe(true);
  });

  it('primeiro-coracao desbloqueado com >= 1 coração recebido', () => {
    const stats: ProfileStats = { ...statsZero, totalCorações: 1 };
    const badges = computarBadges([], stats);
    expect(badges.find(b => b.id === 'primeiro-coracao')?.unlocked).toBe(true);
  });

  it('primeiro-comentario desbloqueado com >= 1 comentário recebido', () => {
    const stats: ProfileStats = { ...statsZero, totalComentarios: 1 };
    const badges = computarBadges([], stats);
    expect(badges.find(b => b.id === 'primeiro-comentario')?.unlocked).toBe(true);
  });

  it('badges de influência têm grupo influencia', () => {
    const badges = computarBadges([], statsZero);
    const influencia = badges.filter(b => b.grupo === 'influencia');
    expect(influencia.length).toBeGreaterThanOrEqual(6);
  });
});
```

- [ ] **Step 2: Rodar para verificar falha**

```bash
npx jest __tests__/lib/badges.test.ts --no-coverage
```

Expected: FAIL — `computarBadges` not found.

- [ ] **Step 3: Implementar `lib/badges.ts`**

```ts
import { Receita } from '../types';
import { CATEGORIAS } from '../constants/categorias';

export type ProfileStats = {
  totalReceitas: number;
  totalSalvas: number;
  totalCorações: number;
  totalComentarios: number;
};

export type Badge = {
  id: string;
  label: string;
  emoji: string;
  grupo: 'solo' | 'categoria' | 'influencia';
  unlocked: boolean;
  descricao: string;
};

export function computarBadges(receitas: Receita[], stats: ProfileStats): Badge[] {
  const badges: Badge[] = [];
  const n = receitas.length;

  // ── Solo ──
  badges.push({
    id: 'primeira-receita', emoji: '🍳', label: 'Primeira receita', grupo: 'solo',
    descricao: 'Criar 1 receita', unlocked: n >= 1,
  });

  const completa = receitas.some(r =>
    !!r.imagem && r.ingredientes.length > 0 && r.instrucoes.length > 0
  );
  badges.push({
    id: 'receita-completa', emoji: '📸', label: 'Receita completa', grupo: 'solo',
    descricao: '1 receita com foto, ingredientes e instruções', unlocked: completa,
  });

  badges.push({
    id: '5-receitas', emoji: '🌿', label: '5 receitas', grupo: 'solo',
    descricao: 'Criar 5 receitas', unlocked: n >= 5,
  });
  badges.push({
    id: '10-receitas', emoji: '🌳', label: '10 receitas', grupo: 'solo',
    descricao: 'Criar 10 receitas', unlocked: n >= 10,
  });

  const categoriaSet = new Set(receitas.flatMap(r => r.categorias));
  badges.push({
    id: 'chef-diversificado', emoji: '🎨', label: 'Chef diversificado', grupo: 'solo',
    descricao: 'Receitas em ≥ 3 categorias distintas', unlocked: categoriaSet.size >= 3,
  });

  badges.push({
    id: '50-receitas', emoji: '🏅', label: '50 receitas', grupo: 'solo',
    descricao: 'Criar 50 receitas', unlocked: n >= 50,
  });

  // ── Por Categoria ──
  const categoriasSemTodas = CATEGORIAS.filter(c => c !== 'Todas');
  const contPorCategoria = new Map<string, number>();
  for (const r of receitas) {
    for (const cat of r.categorias) {
      contPorCategoria.set(cat, (contPorCategoria.get(cat) ?? 0) + 1);
    }
  }

  for (const cat of categoriasSemTodas) {
    const count = contPorCategoria.get(cat) ?? 0;
    if (count === 0) continue; // não poluir com badges de categorias sem receitas

    badges.push({
      id: `5-${cat}`, emoji: '🥇', label: `5 ${cat}`, grupo: 'categoria',
      descricao: `Criar 5 receitas de ${cat}`, unlocked: count >= 5,
    });
    badges.push({
      id: `25-${cat}`, emoji: '🥈', label: `25 ${cat}`, grupo: 'categoria',
      descricao: `Criar 25 receitas de ${cat}`, unlocked: count >= 25,
    });
    badges.push({
      id: `50-${cat}`, emoji: '🥉', label: `50 ${cat}`, grupo: 'categoria',
      descricao: `Criar 50 receitas de ${cat}`, unlocked: count >= 50,
    });
  }

  // ── Influência ──
  badges.push({
    id: 'primeira-salva', emoji: '⭐', label: '1ª receita salva', grupo: 'influencia',
    descricao: '1 pessoa salvou sua receita', unlocked: stats.totalSalvas >= 1,
  });
  badges.push({
    id: '10-salvas', emoji: '🔥', label: '10 salvas', grupo: 'influencia',
    descricao: '10 pessoas salvaram suas receitas', unlocked: stats.totalSalvas >= 10,
  });
  badges.push({
    id: '50-salvas', emoji: '🏆', label: '50 salvas', grupo: 'influencia',
    descricao: '50 pessoas salvaram suas receitas', unlocked: stats.totalSalvas >= 50,
  });
  badges.push({
    id: 'primeiro-coracao', emoji: '💛', label: '1º coração', grupo: 'influencia',
    descricao: 'Receber 1 coração em suas receitas', unlocked: stats.totalCorações >= 1,
  });
  badges.push({
    id: '10-coracoes', emoji: '✨', label: '10 corações', grupo: 'influencia',
    descricao: 'Receber 10 corações em suas receitas', unlocked: stats.totalCorações >= 10,
  });
  badges.push({
    id: 'primeiro-comentario', emoji: '💬', label: '1º comentário', grupo: 'influencia',
    descricao: 'Receber 1 comentário em suas receitas', unlocked: stats.totalComentarios >= 1,
  });

  return badges;
}
```

- [ ] **Step 4: Rodar testes**

```bash
npx jest __tests__/lib/badges.test.ts --no-coverage
```

Expected: todos passando.

- [ ] **Step 5: Commit**

```bash
git add lib/badges.ts __tests__/lib/badges.test.ts
git commit -m "feat: lib/badges.ts com computarBadges — solo, categoria e influência"
```

---

## Task 2: `useProfile` — stats agregados

**Files:**
- Modify: `hooks/useProfile.ts`

Adicionar `stats: ProfileStats` ao que o hook retorna. Queries para corações e comentários recebidos.

- [ ] **Step 1: Modificar `hooks/useProfile.ts`**

Adicionar import:
```ts
import { ProfileStats } from '../lib/badges';
```

Adicionar estado:
```ts
const [stats, setStats] = useState<ProfileStats>({
  totalReceitas: 0, totalSalvas: 0, totalCorações: 0, totalComentarios: 0,
});
```

Adicionar função `carregarStats(userId: string)` e chamar após carregar perfil:

```ts
async function carregarStats(userId: string) {
  // totalReceitas e totalSalvas vêm das receitas do useReceitas — passados por quem chama
  // corações recebidos
  const { count: coracoes } = await supabase
    .from('recipe_hearts')
    .select('id', { count: 'exact', head: true })
    .in(
      'recipe_id',
      supabase.from('receitas').select('id').eq('user_id', userId)
    );

  // comentários recebidos
  const { count: comentarios } = await supabase
    .from('comments')
    .select('id', { count: 'exact', head: true })
    .in(
      'recipe_id',
      supabase.from('receitas').select('id').eq('user_id', userId)
    );

  setStats(prev => ({
    ...prev,
    totalCorações: coracoes ?? 0,
    totalComentarios: comentarios ?? 0,
  }));
}
```

Chamar `carregarStats` no mesmo effect que carrega profile:
```ts
// Dentro do useEffect onde profile é carregado:
if (data?.id) await carregarStats(data.id);
```

Expor `stats` no return:
```ts
return { profile, loading, stats, updateProfile, refreshProfile };
```

**Nota sobre totalReceitas e totalSalvas:** Esses valores vêm do `useReceitas` (array de receitas) que já existe na tela de perfil. O `perfil.tsx` calculará esses campos antes de exibir. `stats.totalSalvas` usa `profile.total_importacoes` (coluna DB existente).

- [ ] **Step 2: Rodar testes gerais**

```bash
npx jest --no-coverage
```

Expected: sem regressões.

- [ ] **Step 3: Commit**

```bash
git add hooks/useProfile.ts
git commit -m "feat: useProfile expõe stats de corações e comentários recebidos"
```

---

## Task 3: `app/(tabs)/perfil.tsx` — novo layout

**Files:**
- Modify: `app/(tabs)/perfil.tsx`

Layout novo: avatar+edit, 4 stats, conquistas (3 grupos de badges), tabs Criadas/Salvas, grid 3 colunas.

- [ ] **Step 1: Ler arquivo atual**

```bash
# Leia app/(tabs)/perfil.tsx antes de editar
```

- [ ] **Step 2: Reescrever layout**

```tsx
import { View, ScrollView, Pressable, FlatList, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { router } from 'expo-router';
import { Pencil, MessageCircle } from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { useReceitas } from '../../hooks/useReceitas';
import { computarBadges, ProfileStats, Badge } from '../../lib/badges';
import { ComentariosSheet } from '../../components/ComentariosSheet';
import { AppText } from '../../components/ui/AppText';

// ── Stat box ──
function StatBox({ valor, label }: { valor: number; label: string }) {
  return (
    <View className="flex-1 items-center py-3 border-r border-[#F0EBE5] last:border-r-0">
      <AppText className="text-[18px] font-sans-bold text-primary">{valor}</AppText>
      <AppText className="text-[10px] text-[#8C7B6B]">{label}</AppText>
    </View>
  );
}

// ── Badge chip ──
function BadgeChip({ badge }: { badge: Badge }) {
  const bgColor = badge.unlocked
    ? badge.grupo === 'influencia' ? '#EDE9FE' : '#FEF3C7'
    : '#F3F4F6';
  const textColor = badge.unlocked
    ? badge.grupo === 'influencia' ? '#5B21B6' : '#92400E'
    : '#6B7280';

  return (
    <View
      style={{ backgroundColor: bgColor, opacity: badge.unlocked ? 1 : 0.45 }}
      className="flex-row items-center gap-1 rounded-full px-3 py-1 mr-2 mb-2"
    >
      <AppText className="text-[11px]">{badge.unlocked ? badge.emoji : '🔒'}</AppText>
      <AppText style={{ color: textColor }} className="text-[11px]">{badge.label}</AppText>
    </View>
  );
}

// ── Seção de badges ──
function SecaoBadges({ titulo, badges }: { titulo: string; badges: Badge[] }) {
  if (badges.length === 0) return null;
  return (
    <View className="mb-3">
      <AppText className="text-[10px] text-[#8C7B6B] uppercase tracking-wider mb-2">{titulo}</AppText>
      <View className="flex-row flex-wrap">
        {badges.map(b => <BadgeChip key={b.id} badge={b} />)}
      </View>
    </View>
  );
}

export default function PerfilScreen() {
  const { session } = useAuth();
  const { profile, stats } = useProfile();
  const { receitas } = useReceitas();
  const [tabAtiva, setTabAtiva] = useState<'criadas' | 'salvas'>('criadas');
  const [receitaComentariosId, setReceitaComentariosId] = useState<string | null>(null);

  const criadas = receitas.filter(r => !r.fonte_receita_id);
  const salvas = receitas.filter(r => !!r.fonte_receita_id);
  const receitasTab = tabAtiva === 'criadas' ? criadas : salvas;

  const profileStats: ProfileStats = {
    totalReceitas: criadas.length,
    totalSalvas: profile?.total_importacoes ?? 0,
    totalCorações: stats.totalCorações,
    totalComentarios: stats.totalComentarios,
  };

  const badges = computarBadges(criadas, profileStats);
  const badgesSolo = badges.filter(b => b.grupo === 'solo');
  const badgesCategoria = badges.filter(b => b.grupo === 'categoria');
  const badgesInfluencia = badges.filter(b => b.grupo === 'influencia');

  const inicial = profile?.nome?.[0]?.toUpperCase() ?? '?';
  const desde = profile?.criado_em
    ? new Date(profile.criado_em).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
    : '';

  return (
    <SafeAreaView className="flex-1 bg-[#FAF6F1]" edges={['top', 'left', 'right']}>
      <ScrollView>
        {/* Header */}
        <View className="bg-white px-4 pb-4 pt-5 items-center border-b border-[#F0EBE5]">
          <Pressable
            onPress={() => router.push('/perfil/editar')}
            className="relative mb-3"
          >
            <View className="w-20 h-20 rounded-full bg-primary items-center justify-center">
              <AppText className="text-white text-[28px] font-sans-bold">{inicial}</AppText>
            </View>
            <View className="absolute bottom-0 right-0 w-6 h-6 bg-primary rounded-full border-2 border-white items-center justify-center">
              <Pencil size={11} color="white" />
            </View>
          </Pressable>
          <AppText className="text-[18px] font-sans-bold text-[#2C1810]">{profile?.nome}</AppText>
          {desde ? (
            <AppText className="text-[12px] text-[#8C7B6B] mt-1">Chef desde {desde}</AppText>
          ) : null}

          {/* 4 stats */}
          <View className="flex-row mt-4 border border-[#F0EBE5] rounded-xl overflow-hidden w-full">
            <StatBox valor={profileStats.totalReceitas} label="receitas" />
            <StatBox valor={profileStats.totalSalvas} label="salvas" />
            <StatBox valor={profileStats.totalCorações} label="corações" />
            <StatBox valor={profileStats.totalComentarios} label="comentários" />
          </View>
        </View>

        {/* Conquistas */}
        <View className="bg-white mx-3 mt-3 rounded-2xl p-4">
          <AppText className="text-[11px] font-sans-bold text-[#2C1810] uppercase tracking-wider mb-3">
            Conquistas
          </AppText>
          <SecaoBadges titulo="Suas ações" badges={badgesSolo} />
          <SecaoBadges titulo="Por categoria" badges={badgesCategoria} />
          <SecaoBadges titulo="Influência" badges={badgesInfluencia} />
        </View>

        {/* Tabs */}
        <View className="bg-white mx-3 mt-3 rounded-2xl p-4">
          <View className="flex-row bg-[#F5F0EB] rounded-xl p-1 mb-4">
            <Pressable
              onPress={() => setTabAtiva('criadas')}
              className={`flex-1 items-center py-2 rounded-lg ${tabAtiva === 'criadas' ? 'bg-white shadow-sm' : ''}`}
            >
              <AppText className={`text-[12px] ${tabAtiva === 'criadas' ? 'font-sans-bold text-[#2C1810]' : 'text-[#8C7B6B]'}`}>
                Criadas ({criadas.length})
              </AppText>
            </Pressable>
            <Pressable
              onPress={() => setTabAtiva('salvas')}
              className={`flex-1 items-center py-2 rounded-lg ${tabAtiva === 'salvas' ? 'bg-white shadow-sm' : ''}`}
            >
              <AppText className={`text-[12px] ${tabAtiva === 'salvas' ? 'font-sans-bold text-[#2C1810]' : 'text-[#8C7B6B]'}`}>
                Salvas ({salvas.length})
              </AppText>
            </Pressable>
          </View>

          {/* Grid 3 colunas */}
          <View className="flex-row flex-wrap gap-2">
            {receitasTab.map(receita => (
              <Pressable
                key={receita.id}
                onPress={() => setReceitaComentariosId(receita.id)}
                style={{ width: '31%', aspectRatio: 1 }}
                className="bg-[#E8DDD4] rounded-lg overflow-hidden items-center justify-center"
              >
                <AppText className="text-[22px]">
                  {receita.imagem ? '🍽' : '🍽'}
                </AppText>
                {/* Comentários badge */}
                <View className="absolute bottom-1 right-1 bg-white/85 rounded-xl px-1.5 py-0.5 flex-row items-center gap-1">
                  <MessageCircle size={9} color="#8B4513" />
                </View>
              </Pressable>
            ))}
          </View>

          {tabAtiva === 'criadas' && (
            <AppText className="text-[11px] text-[#8C7B6B] mt-3">
              Toque na receita para ver comentários recebidos
            </AppText>
          )}
        </View>
        <View className="h-8" />
      </ScrollView>

      {/* Modal de comentários */}
      <Modal
        visible={!!receitaComentariosId}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setReceitaComentariosId(null)}
      >
        {receitaComentariosId && (
          <ComentariosSheet
            receitaId={receitaComentariosId}
            receitaUserId={session?.user?.id ?? ''}
            onClose={() => setReceitaComentariosId(null)}
          />
        )}
      </Modal>
    </SafeAreaView>
  );
}
```

- [ ] **Step 3: Rodar testes**

```bash
npx jest --no-coverage
```

Expected: sem regressões.

- [ ] **Step 4: Commit**

```bash
git add app/(tabs)/perfil.tsx
git commit -m "feat: novo layout perfil com stats, badges e tabs Criadas/Salvas"
```

---

## Task 4: `app/perfil/[id].tsx` — layout público

**Files:**
- Modify: `app/perfil/[id].tsx`

Mesmo layout que o próprio, sem botão editar, sem tab Salvas, sem modal de comentários (somente leitura).

- [ ] **Step 1: Ler arquivo atual**

```bash
# Leia app/perfil/[id].tsx antes de editar
```

- [ ] **Step 2: Adaptar para perfil público**

Usar `useLocalSearchParams<{ id: string }>` para obter `userId`.

Buscar dados do usuário público:
```ts
const { id: userId } = useLocalSearchParams<{ id: string }>();

// Buscar profile público
const [profile, setProfile] = useState<Profile | null>(null);
const [receitas, setReceitas] = useState<Receita[]>([]);
const [statsPublico, setStatsPublico] = useState<ProfileStats>({
  totalReceitas: 0, totalSalvas: 0, totalCorações: 0, totalComentarios: 0,
});

useEffect(() => {
  async function carregar() {
    // profile
    const { data: prof } = await supabase
      .from('profiles')
      .select('id, nome, foto_url, criado_em, total_importacoes')
      .eq('id', userId)
      .single();
    setProfile(prof);

    // receitas públicas
    const { data: recs } = await supabase
      .from('receitas')
      .select('id, nome, categorias, imagem, tempoPreparo, porcoes, dificuldade, instrucoes, ingredientes, criadaEm:criada_em, fonte_receita_id')
      .eq('user_id', userId)
      .eq('publica', true);
    const receitasMapped = (recs ?? []).map(mapReceitaSupabase);
    setReceitas(receitasMapped);

    // corações recebidos
    const { count: coracoes } = await supabase
      .from('recipe_hearts')
      .select('id', { count: 'exact', head: true })
      .in('recipe_id', (recs ?? []).map((r: any) => r.id));

    // comentários recebidos
    const { count: comentarios } = await supabase
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .in('recipe_id', (recs ?? []).map((r: any) => r.id));

    setStatsPublico({
      totalReceitas: (recs ?? []).length,
      totalSalvas: prof?.total_importacoes ?? 0,
      totalCorações: coracoes ?? 0,
      totalComentarios: comentarios ?? 0,
    });
  }
  carregar();
}, [userId]);

const badges = computarBadges(receitas, statsPublico);
```

Layout idêntico ao `perfil.tsx`, com diferenças:
- Sem botão `<Pencil>` no avatar
- Sem tabs Criadas/Salvas — só mostra receitas públicas direto
- Sem Modal de comentários (tap no card vai para receita: `router.push(\`/receita/${receita.id}\`)`)

- [ ] **Step 3: Rodar testes**

```bash
npx jest --no-coverage
```

Expected: sem regressões.

- [ ] **Step 4: Commit**

```bash
git add app/perfil/[id].tsx
git commit -m "feat: layout perfil público com stats e badges"
```

---

## Task 5: Renomear "Compartilhada por" → "Salva de"

**Files:**
- Modify: `components/ReceitaCard.tsx`

- [ ] **Step 1: Trocar texto**

No `components/ReceitaCard.tsx`, encontrar onde aparece `"Compartilhada por"` (ou `"Compartilhado por"`) e trocar por `"Salva de"`.

Também atualizar qualquer label de `"importações"` visível no perfil para `"salvas"` — já tratado no Task 3 (label do stat box usa "salvas" diretamente).

- [ ] **Step 2: Rodar testes**

```bash
npx jest --no-coverage
```

Expected: todos passando.

- [ ] **Step 3: Commit**

```bash
git add components/ReceitaCard.tsx
git commit -m "feat: renomear Compartilhada por → Salva de no ReceitaCard"
```

---

## Verificação Final

```bash
npx jest --no-coverage
# Expected: todos passando
```

Manual:
1. Aba Perfil → header com 4 stats preenchidos
2. Seção Conquistas → chips solo amarelo, categoria amarelo (só categorias com receitas), influência roxo
3. Badges bloqueados aparecem semi-transparentes com 🔒
4. Tabs Criadas/Salvas → filtram corretamente
5. Tap em receita criada → modal de comentários abre
6. Perfil público (`/perfil/{id}`) → mesmo layout, sem editar, sem Salvas
7. ReceitaCard → mostra "Salva de {nome}" para receitas com fonte_receita_id
