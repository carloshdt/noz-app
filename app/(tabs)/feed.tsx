import { View, FlatList, ScrollView, ActivityIndicator, TextInput, Pressable, Image } from 'react-native';
import { useCallback, useState, useEffect, useLayoutEffect, useMemo } from 'react';
import { router } from 'expo-router';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, X, SlidersHorizontal } from 'lucide-react-native';
import { useFeed } from '../../hooks/useFeed';
import { CATEGORIAS } from '../../constants/categorias';
import { useSalvarReceita } from '../../hooks/useSalvarReceita';
import { FeedCard } from '../../components/FeedCard';
import { AppText } from '../../components/ui/AppText';
import { supabase } from '../../lib/supabase';

type Filtro = 'todos' | 'receitas' | 'perfis';

type ResultadoReceita = { tipo: 'receita'; id: string; nome: string; imagem?: string; tempoPreparo: number; categorias: string[] };
type ResultadoPerfil = { tipo: 'perfil'; id: string; nome: string; foto_url?: string; total_importacoes: number };
type Resultado = ResultadoReceita | ResultadoPerfil;

export default function FeedScreen() {
  const { receitas, loading, temMais, recarregar, carregarMais } = useFeed();
  const { salvar, remover, salvando } = useSalvarReceita();
  const [itemHeight, setItemHeight] = useState(0);
  const [salvas, setSalvas] = useState<Map<string, string>>(new Map());

  const [buscaAberta, setBuscaAberta] = useState(false);
  const [termo, setTermo] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [buscando, setBuscando] = useState(false);

  const [filtrosFeedAbertos, setFiltrosFeedAbertos] = useState(false);
  const [feedCategoria, setFeedCategoria] = useState<string | null>(null);
  const [feedTempo, setFeedTempo] = useState<number | null>(null);
  const [feedDificuldade, setFeedDificuldade] = useState<string | null>(null);

  const navigation = useNavigation();

  const filtrosFeedAtivos = (feedCategoria !== null ? 1 : 0) + (feedTempo !== null ? 1 : 0) + (feedDificuldade !== null ? 1 : 0);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 16, gap: 4 }}>
          <Pressable
            onPress={() => setFiltrosFeedAbertos((v) => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ padding: 6 }}
          >
            <SlidersHorizontal size={22} color={filtrosFeedAtivos > 0 ? '#8B4513' : '#2C1810'} />
          </Pressable>
          <Pressable
            onPress={() => setBuscaAberta(true)}
            style={{ paddingLeft: 4 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Search size={30} color="#2C1810" />
          </Pressable>
        </View>
      ),
    });
  }, [navigation, filtrosFeedAtivos, filtrosFeedAbertos]);

  useFocusEffect(useCallback(() => { recarregar(); }, []));

  useEffect(() => {
    if (!termo.trim()) { setResultados([]); return; }
    const timer = setTimeout(async () => {
      setBuscando(true);
      const buscas: Promise<any>[] = [];

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
    setTermo('');
    setResultados([]);
    setFiltro('todos');
  }

  async function handleSalvar(receitaId: string, criadorId: string) {
    if (salvando || salvas.has(receitaId)) return;
    const copyId = await salvar(receitaId, criadorId);
    if (copyId) setSalvas((prev) => new Map(prev).set(receitaId, copyId));
  }

  async function handleRemover(receitaId: string) {
    const copyId = salvas.get(receitaId);
    if (copyId) await remover(copyId);
    setSalvas((prev) => { const next = new Map(prev); next.delete(receitaId); return next; });
  }

  const receitasFeedFiltradas = useMemo(() => {
    let base = receitas;
    if (feedCategoria) base = base.filter((r) => r.categorias.includes(feedCategoria));
    if (feedTempo !== null) base = base.filter((r) => r.tempoPreparo <= feedTempo);
    if (feedDificuldade !== null) base = base.filter((r) => r.dificuldade === feedDificuldade);
    return base;
  }, [receitas, feedCategoria, feedTempo, feedDificuldade]);

  const chips: { label: string; value: Filtro }[] = [
    { label: 'Todos', value: 'todos' },
    { label: 'Receitas', value: 'receitas' },
    { label: 'Perfis', value: 'perfis' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#FAF6F1' }}>
      {/* Header busca */}
      {buscaAberta && (
        <SafeAreaView edges={['top']} style={{ backgroundColor: '#FAF6F1' }}>
          <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, gap: 10 }}>
            {/* Search bar */}
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 12, height: 44 }}>
              <Search size={18} color="#8C7B6B" />
              <TextInput
                autoFocus
                value={termo}
                onChangeText={setTermo}
                placeholder="Buscar receitas ou perfis..."
                placeholderTextColor="#9CA3AF"
                style={{ flex: 1, marginLeft: 8, fontSize: 15, color: '#2C1810' }}
              />
              <Pressable onPress={fecharBusca}>
                <X size={18} color="#8C7B6B" />
              </Pressable>
            </View>

            {/* Chips */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {chips.map((c) => (
                <Pressable
                  key={c.value}
                  onPress={() => setFiltro(c.value)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
                    backgroundColor: filtro === c.value ? '#8B4513' : 'white',
                    borderWidth: 1, borderColor: filtro === c.value ? '#8B4513' : '#E5E7EB',
                  }}
                >
                  <AppText style={{ fontSize: 13, color: filtro === c.value ? 'white' : '#6B7280', fontWeight: filtro === c.value ? '600' : '400' }}>
                    {c.label}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </View>
        </SafeAreaView>
      )}

      {/* Painel de filtros do feed */}
      {!buscaAberta && filtrosFeedAbertos && (
        <View style={{ backgroundColor: '#FAF6F1', paddingHorizontal: 16, paddingBottom: 10, gap: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}>
            {CATEGORIAS.filter((c) => c !== 'Todas').map((cat) => (
              <Pressable
                key={cat}
                onPress={() => setFeedCategoria(feedCategoria === cat ? null : cat)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginRight: 2,
                  backgroundColor: feedCategoria === cat ? '#8B4513' : 'white',
                  borderWidth: 1, borderColor: feedCategoria === cat ? '#8B4513' : '#E5E7EB',
                }}
              >
                <AppText style={{ fontSize: 12, color: feedCategoria === cat ? 'white' : '#6B7280' }}>{cat}</AppText>
              </Pressable>
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {[{ label: 'até 15 min', valor: 15 }, { label: 'até 30 min', valor: 30 }, { label: 'até 1h', valor: 60 }].map((t) => (
              <Pressable
                key={t.valor}
                onPress={() => setFeedTempo(feedTempo === t.valor ? null : t.valor)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
                  backgroundColor: feedTempo === t.valor ? '#8B4513' : 'white',
                  borderWidth: 1, borderColor: feedTempo === t.valor ? '#8B4513' : '#E5E7EB',
                }}
              >
                <AppText style={{ fontSize: 12, color: feedTempo === t.valor ? 'white' : '#6B7280' }}>{t.label}</AppText>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {(['Fácil', 'Médio', 'Difícil'] as const).map((d) => (
              <Pressable
                key={d}
                onPress={() => setFeedDificuldade(feedDificuldade === d ? null : d)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
                  backgroundColor: feedDificuldade === d ? '#8B4513' : 'white',
                  borderWidth: 1, borderColor: feedDificuldade === d ? '#8B4513' : '#E5E7EB',
                }}
              >
                <AppText style={{ fontSize: 12, color: feedDificuldade === d ? 'white' : '#6B7280' }}>{d}</AppText>
              </Pressable>
            ))}
          </View>
        </View>
      )}

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
                  salvada={salvas.has(item.id)}
                />
              )}
            />
          )}

        </View>
      )}
    </View>
  );
}
