import { View, FlatList, ScrollView, ActivityIndicator, TextInput, Pressable, Image, Modal } from 'react-native';
import { useCallback, useState, useEffect, useLayoutEffect, useMemo } from 'react';
import { router } from 'expo-router';
import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Funnel, Search, X } from 'lucide-react-native';
import { useFeed } from '../../hooks/useFeed';
import { CATEGORIAS } from '../../constants/categorias';
import { useSalvarReceita } from '../../hooks/useSalvarReceita';
import { useCoracoes } from '../../hooks/useCoracoes';
import { useAuth } from '../../hooks/useAuth';
import { FeedCard } from '../../components/FeedCard';
import { AppText } from '../../components/ui/AppText';
import { supabase } from '../../lib/supabase';

type Filtro = 'todos' | 'receitas' | 'perfis';

type ResultadoReceita = { tipo: 'receita'; id: string; nome: string; imagem?: string; tempoPreparo: number; categorias: string[] };
type ResultadoPerfil = { tipo: 'perfil'; id: string; nome: string; foto_url?: string; total_importacoes: number };
type Resultado = ResultadoReceita | ResultadoPerfil;

type FilterOptionProps = {
  label: string;
  ativo: boolean;
  onPress: () => void;
};

function FilterOption({ label, ativo, onPress }: FilterOptionProps) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: '31%',
        height: 40,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: ativo ? '#8B4513' : '#E5E7EB',
        backgroundColor: ativo ? '#8B4513' : 'white',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
      }}
    >
      <AppText
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{ fontSize: 12, fontWeight: '500', color: ativo ? 'white' : '#2C1810' }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

export default function FeedScreen() {
  const { user } = useAuth();
  const { receitas, loading, temMais, recarregar, carregarMais } = useFeed();
  const receitaIds = useMemo(() => receitas.map((r) => r.id), [receitas]);
  const { coracoes, carregarCorações: carregarCoracoes, toggleCoracao } = useCoracoes(receitaIds);
  const { salvar, remover, salvando } = useSalvarReceita();
  const [itemHeight, setItemHeight] = useState(0);
  const [salvas, setSalvas] = useState<Set<string>>(new Set());

  const [buscaAberta, setBuscaAberta] = useState(false);
  const [termo, setTermo] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [buscando, setBuscando] = useState(false);

  const [filtrosFeedAbertos, setFiltrosFeedAbertos] = useState(false);
  const [feedCategorias, setFeedCategorias] = useState<Set<string>>(new Set());
  const [feedTempos, setFeedTempos] = useState<Set<number>>(new Set());
  const [feedDificuldades, setFeedDificuldades] = useState<Set<string>>(new Set());
  const [contagensComentarios, setContagensComentarios] = useState<Map<string, number>>(new Map());

  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const filtrosFeedAtivos = feedCategorias.size + feedTempos.size + feedDificuldades.size + (filtro !== 'todos' ? 1 : 0);

  function limparFiltrosFeed() {
    setFiltro('todos');
    setFeedCategorias(new Set());
    setFeedTempos(new Set());
    setFeedDificuldades(new Set());
  }

  function toggleFeedCategoria(cat: string) {
    setFeedCategorias((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }

  function toggleFeedTempo(tempo: number) {
    setFeedTempos((prev) => {
      const next = new Set(prev);
      next.has(tempo) ? next.delete(tempo) : next.add(tempo);
      return next;
    });
  }

  function toggleFeedDificuldade(dificuldade: string) {
    setFeedDificuldades((prev) => {
      const next = new Set(prev);
      next.has(dificuldade) ? next.delete(dificuldade) : next.add(dificuldade);
      return next;
    });
  }

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => setBuscaAberta(true)}
          style={{ paddingRight: 16, paddingLeft: 8 }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Search size={30} color="#2C1810" />
        </Pressable>
      ),
    });
  }, [navigation]);

  useFocusEffect(useCallback(() => {
    recarregar();
  }, [recarregar]));

  useEffect(() => {
    if (!user) return;
    supabase
      .from('recipe_overrides')
      .select('recipe_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setSalvas(new Set(data.map((o) => o.recipe_id)));
      });
  }, [user]);

  useEffect(() => {
    if (receitaIds.length > 0) carregarCoracoes(receitaIds);
  }, [receitaIds, carregarCoracoes]);

  useEffect(() => {
    if (receitaIds.length === 0) {
      setContagensComentarios(new Map());
      return;
    }

    supabase
      .from('comments')
      .select('recipe_id')
      .in('recipe_id', receitaIds)
      .then(({ data }) => {
        const map = new Map<string, number>();
        for (const row of data ?? []) {
          map.set(row.recipe_id, (map.get(row.recipe_id) ?? 0) + 1);
        }
        setContagensComentarios(map);
      });
  }, [receitaIds]);

  useEffect(() => {
    if (!isFocused) {
      setBuscaAberta(false);
      setTermo('');
      setFiltro('todos');
      setResultados([]);
      setBuscando(false);
      setFiltrosFeedAbertos(false);
      setFeedCategorias(new Set());
      setFeedTempos(new Set());
      setFeedDificuldades(new Set());
    }
  }, [isFocused]);

  useEffect(() => {
    if (!termo.trim()) { setResultados([]); return; }
    const timer = setTimeout(async () => {
      setBuscando(true);
      const buscas: any[] = [];

      if (filtro !== 'perfis') {
        buscas.push(
          supabase.from('receitas')
            .select('id, nome, imagem, tempo_preparo, categorias')
            .eq('publica', true)
            .ilike('nome', `%${termo}%`)
            .limit(15)
        );
      } else {
        buscas.push(Promise.resolve({ data: [] }));
      }

      if (filtro !== 'receitas') {
        buscas.push(
          supabase.from('profiles')
            .select('id, nome, foto_url, total_importacoes')
            .ilike('nome', `%${termo}%`)
            .limit(10)
        );
      } else {
        buscas.push(Promise.resolve({ data: [] }));
      }

      const [{ data: receitasData }, { data: perfisData }] = await Promise.all(buscas);

      const lista: Resultado[] = [
        ...((receitasData ?? []).map((r: any) => ({
          tipo: 'receita' as const,
          id: r.id, nome: r.nome, imagem: r.imagem, tempoPreparo: r.tempo_preparo,
          categorias: Array.isArray(r.categorias) ? r.categorias : [],
        }))),
        ...((perfisData ?? []).map((p: any) => ({
          tipo: 'perfil' as const,
          id: p.id, nome: p.nome, foto_url: p.foto_url, total_importacoes: p.total_importacoes ?? 0,
        }))),
      ];

      setResultados(lista);
      setBuscando(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [termo, filtro]);

  function fecharBusca() {
    setBuscaAberta(false);
    setFiltrosFeedAbertos(false);
    setTermo('');
    setResultados([]);
    setFiltro('todos');
  }

  async function handleSalvar(receitaId: string, criadorId: string) {
    if (salvando || salvas.has(receitaId)) return;
    const id = await salvar(receitaId, criadorId);
    if (id) setSalvas((prev) => new Set(prev).add(receitaId));
  }

  async function handleRemover(receitaId: string) {
    await remover(receitaId);
    setSalvas((prev) => { const next = new Set(prev); next.delete(receitaId); return next; });
  }

  const receitasFeedFiltradas = useMemo(() => {
    let base = receitas;
    if (feedCategorias.size > 0) base = base.filter((r) => r.categorias.some((c) => feedCategorias.has(c)));
    if (feedTempos.size > 0) base = base.filter((r) => [...feedTempos].some((tempo) => r.tempoPreparo <= tempo));
    if (feedDificuldades.size > 0) base = base.filter((r) => feedDificuldades.has(r.dificuldade));
    return base;
  }, [receitas, feedCategorias, feedTempos, feedDificuldades]);

  const chips: { label: string; value: Filtro }[] = [
    { label: 'Todos', value: 'todos' },
    { label: 'Receitas', value: 'receitas' },
    { label: 'Perfis', value: 'perfis' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#FAF6F1' }}>
      {/* Header busca */}
      {buscaAberta && (
        <SafeAreaView edges={[]} style={{ backgroundColor: '#FAF6F1' }}>
          <View style={{ paddingHorizontal: 16, paddingTop: 0, paddingBottom: 4 }}>
            {/* Search bar */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 12, height: 46 }}>
                <Search size={18} color="#8C7B6B" />
                <TextInput
                  autoFocus
                  value={termo}
                  onChangeText={setTermo}
                  placeholder="Buscar receitas ou perfis..."
                  placeholderTextColor="#9CA3AF"
                  style={{ flex: 1, marginLeft: 8, fontSize: 15, color: '#2C1810', height: 46, textAlignVertical: 'center' }}
                />
                <Pressable onPress={fecharBusca}>
                  <X size={18} color="#8C7B6B" />
                </Pressable>
              </View>
              <Pressable
                onPress={() => setFiltrosFeedAbertos(true)}
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: filtrosFeedAtivos > 0 ? '#8B4513' : '#E5E7EB',
                  backgroundColor: filtrosFeedAtivos > 0 ? '#8B4513' : 'white',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Funnel size={18} color={filtrosFeedAtivos > 0 ? 'white' : '#8C7B6B'} />
                {filtrosFeedAtivos > 0 && (
                  <View
                    style={{
                      position: 'absolute',
                      top: -5,
                      right: -5,
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: '#6B8E23',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AppText style={{ color: 'white', fontSize: 10, fontWeight: '700', lineHeight: 20, textAlign: 'center' }}>
                      {filtrosFeedAtivos}
                    </AppText>
                  </View>
                )}
              </Pressable>
            </View>

          </View>
        </SafeAreaView>
      )}

      {/* Painel de filtros do feed */}
      {false && !buscaAberta && filtrosFeedAbertos && (
        <View style={{ backgroundColor: '#FAF6F1', paddingHorizontal: 16, paddingBottom: 10, gap: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}>
            {CATEGORIAS.filter((c) => c !== 'Todas').map((cat) => (
              <Pressable
                key={cat}
                onPress={() => toggleFeedCategoria(cat)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginRight: 2,
                  backgroundColor: feedCategorias.has(cat) ? '#8B4513' : 'white',
                  borderWidth: 1, borderColor: feedCategorias.has(cat) ? '#8B4513' : '#E5E7EB',
                }}
              >
                <AppText style={{ fontSize: 12, color: feedCategorias.has(cat) ? 'white' : '#6B7280' }}>{cat}</AppText>
              </Pressable>
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {[{ label: 'até 15 min', valor: 15 }, { label: 'até 30 min', valor: 30 }, { label: 'até 1h', valor: 60 }].map((t) => (
              <Pressable
                key={t.valor}
                onPress={() => toggleFeedTempo(t.valor)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
                  backgroundColor: feedTempos.has(t.valor) ? '#8B4513' : 'white',
                  borderWidth: 1, borderColor: feedTempos.has(t.valor) ? '#8B4513' : '#E5E7EB',
                }}
              >
                <AppText style={{ fontSize: 12, color: feedTempos.has(t.valor) ? 'white' : '#6B7280' }}>{t.label}</AppText>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {(['Fácil', 'Médio', 'Difícil'] as const).map((d) => (
              <Pressable
                key={d}
                onPress={() => toggleFeedDificuldade(d)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
                  backgroundColor: feedDificuldades.has(d) ? '#8B4513' : 'white',
                  borderWidth: 1, borderColor: feedDificuldades.has(d) ? '#8B4513' : '#E5E7EB',
                }}
              >
                <AppText style={{ fontSize: 12, color: feedDificuldades.has(d) ? 'white' : '#6B7280' }}>{d}</AppText>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <Modal
        visible={filtrosFeedAbertos && buscaAberta}
        transparent
        animationType="fade"
        onRequestClose={() => setFiltrosFeedAbertos(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setFiltrosFeedAbertos(false)} />
          <View style={{ backgroundColor: '#FAF6F1', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24, gap: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <AppText variant="heading">Filtros</AppText>
                <AppText variant="muted" style={{ fontSize: 12, marginTop: 2 }}>
                  Refine as receitas do Feed
                </AppText>
              </View>
              <Pressable
                onPress={() => setFiltrosFeedAbertos(false)}
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={18} color="#2C1810" />
              </Pressable>
            </View>

            <View style={{ gap: 8 }}>
              <AppText variant="muted" style={{ fontSize: 11, textTransform: 'uppercase' }}>Tipo</AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {chips.map((c) => (
                  <FilterOption
                    key={c.value}
                    label={c.label}
                    ativo={filtro === c.value}
                    onPress={() => setFiltro(c.value)}
                  />
                ))}
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <AppText variant="muted" style={{ fontSize: 11, textTransform: 'uppercase' }}>Categorias</AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {CATEGORIAS.filter((c) => c !== 'Todas').map((cat) => (
                  <FilterOption
                    key={cat}
                    label={cat}
                    ativo={feedCategorias.has(cat)}
                    onPress={() => toggleFeedCategoria(cat)}
                  />
                ))}
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <AppText variant="muted" style={{ fontSize: 11, textTransform: 'uppercase' }}>Tempo</AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[{ label: 'até 15 min', valor: 15 }, { label: 'até 30 min', valor: 30 }, { label: 'até 1h', valor: 60 }].map((t) => (
                  <FilterOption
                    key={t.valor}
                    label={t.label}
                    ativo={feedTempos.has(t.valor)}
                    onPress={() => toggleFeedTempo(t.valor)}
                  />
                ))}
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <AppText variant="muted" style={{ fontSize: 11, textTransform: 'uppercase' }}>Dificuldade</AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(['Fácil', 'Médio', 'Difícil'] as const).map((d) => (
                  <FilterOption
                    key={d}
                    label={d}
                    ativo={feedDificuldades.has(d)}
                    onPress={() => toggleFeedDificuldade(d)}
                  />
                ))}
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={limparFiltrosFeed}
                style={{ flex: 1, height: 48, borderRadius: 12, backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }}
              >
                <AppText style={{ fontWeight: '500', color: '#2C1810' }}>Limpar</AppText>
              </Pressable>
              <Pressable
                onPress={() => setFiltrosFeedAbertos(false)}
                style={{ flex: 1, height: 48, borderRadius: 12, backgroundColor: '#8B4513', alignItems: 'center', justifyContent: 'center' }}
              >
                <AppText style={{ fontWeight: '700', color: 'white' }}>Aplicar</AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Resultados da busca */}
      {buscaAberta ? (
        <FlatList
          data={resultados}
          keyExtractor={(item) => `${item.tipo}-${item.id}`}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListEmptyComponent={
            buscando ? (
              <View style={{ paddingTop: 40, alignItems: 'center' }}>
                <ActivityIndicator color="#8B4513" />
              </View>
            ) : termo.length > 0 ? (
              <View style={{ paddingTop: 40, alignItems: 'center' }}>
                <AppText variant="muted">Nenhum resultado para "{termo}"</AppText>
              </View>
            ) : (
              <View style={{ paddingTop: 40, alignItems: 'center' }}>
                <AppText variant="muted">Digite para buscar</AppText>
              </View>
            )
          }
          renderItem={({ item }) => {
            if (item.tipo === 'receita') {
              return (
                <Pressable
                  onPress={() => router.push(`/receita/${item.id}` as any)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'white', borderRadius: 12, padding: 12 }}
                >
                  <View style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: '#E8DDD4', overflow: 'hidden' }}>
                    {item.imagem
                      ? <Image source={{ uri: item.imagem }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><AppText style={{ fontSize: 24 }}>🍽</AppText></View>
                    }
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText style={{ fontWeight: '600', fontSize: 15 }} numberOfLines={1}>{item.nome}</AppText>
                    <AppText variant="muted" style={{ fontSize: 12, marginTop: 2 }}>{item.tempoPreparo} min · {item.categorias[0]}</AppText>
                  </View>
                </Pressable>
              );
            }

            const iniciais = item.nome.trim().split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
            return (
              <Pressable
                onPress={() => router.push(`/perfil/${item.id}` as any)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'white', borderRadius: 12, padding: 12 }}
              >
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#8B4513', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {item.foto_url
                    ? <Image source={{ uri: item.foto_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    : <AppText style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>{iniciais}</AppText>
                  }
                </View>
                <View style={{ flex: 1 }}>
                  <AppText style={{ fontWeight: '600', fontSize: 15 }}>{item.nome}</AppText>
                  <AppText variant="muted" style={{ fontSize: 12, marginTop: 2 }}>{item.total_importacoes} importações</AppText>
                </View>
              </Pressable>
            );
          }}
        />
      ) : (
        <View
          style={{ flex: 1 }}
          onLayout={(e) => setItemHeight(e.nativeEvent.layout.height)}
        >
          {itemHeight > 0 && (
            <FlatList
              data={receitasFeedFiltradas}
              keyExtractor={(item) => item.id}
              pagingEnabled
              showsVerticalScrollIndicator={false}
              snapToInterval={itemHeight}
              snapToAlignment="start"
              decelerationRate="fast"
              onEndReached={temMais ? carregarMais : undefined}
              onEndReachedThreshold={0.5}
              ListEmptyComponent={
                loading ? (
                  <View style={{ height: itemHeight, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator color="#8B4513" />
                  </View>
                ) : (
                  <View style={{ height: itemHeight, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
                    <AppText style={{ fontSize: 48, marginBottom: 16 }}>🍽</AppText>
                    <AppText variant="heading" style={{ textAlign: 'center' }}>Feed vazio</AppText>
                    <AppText variant="muted" style={{ textAlign: 'center', marginTop: 8 }}>
                      Nenhuma receita pública de outros usuários ainda.
                    </AppText>
                  </View>
                )
              }
              renderItem={({ item }) => (
                <FeedCard
                  receita={item}
                  altura={itemHeight}
                  onSalvar={() => handleSalvar(item.id, item.user_id)}
                  onRemover={() => handleRemover(item.id)}
                  onVerPerfil={(userId) => router.push(`/perfil/${userId}` as any)}
                  onVerReceita={(receitaId) => router.push(`/receita/${receitaId}` as any)}
                  onVerComentarios={(receitaId, receitaUserId) => router.push({
                    pathname: '/comentarios/[id]',
                    params: { id: receitaId, receitaUserId },
                  } as any)}
                  salvada={salvas.has(item.id)}
                  coracaoTotal={coracoes.get(item.id)?.total ?? 0}
                  coracaoMeu={coracoes.get(item.id)?.meu ?? false}
                  onToggleCoracao={() => toggleCoracao(item.id)}
                  totalComentarios={contagensComentarios.get(item.id) ?? 0}
                />
              )}
            />
          )}

        </View>
      )}
    </View>
  );
}
