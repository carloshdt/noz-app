import { View, FlatList, Pressable, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useMemo, useEffect } from 'react';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { Funnel, Plus, X } from 'lucide-react-native';
import { useReceitas } from '../../hooks/useReceitas';
import { ReceitaCard } from '../../components/ReceitaCard';
import { AppText } from '../../components/ui/AppText';
import { CATEGORIAS } from '../../constants/categorias';
import { supabase } from '../../lib/supabase';

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
        height: 34,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: ativo ? '#8B4513' : '#E5E7EB',
        backgroundColor: ativo ? '#8B4513' : 'white',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
      }}
    >
      <AppText
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{ fontSize: 11, fontWeight: '500', color: ativo ? 'white' : '#2C1810' }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

export default function ReceitasScreen() {
  const { receitas, buscar, carregarReceitas } = useReceitas();
  const [busca, setBusca] = useState('');
  const [categoriasAtivas, setCategoriasAtivas] = useState<Set<string>>(new Set());
  const [criadores, setCriadores] = useState<Record<string, string>>({});
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [filtroTempo, setFiltroTempo] = useState<number | null>(null);
  const [filtroDificuldade, setFiltroDificuldade] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    carregarReceitas();

    return () => {
      setBusca('');
      setCategoriasAtivas(new Set());
      setFiltrosAbertos(false);
      setFiltroTempo(null);
      setFiltroDificuldade(null);
    };
  }, [carregarReceitas]));

  useEffect(() => {
    const importadas = receitas.filter((r) => r.fonte_receita_id);
    if (!importadas.length) { setCriadores({}); return; }

    const fonteIds = [...new Set(importadas.map((r) => r.fonte_receita_id!))];

    supabase.from('receitas').select('id, user_id').in('id', fonteIds)
      .then(({ data: originais }) => {
        if (!originais?.length) return;
        const userIds = [...new Set(originais.map((r) => r.user_id))];
        supabase.from('profiles').select('id, nome').in('id', userIds)
          .then(({ data: profiles }) => {
            if (!profiles) return;
            const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p.nome]));
            const result: Record<string, string> = {};
            originais.forEach((o) => { result[o.id] = profileMap[o.user_id] ?? ''; });
            setCriadores(result);
          });
      });
  }, [receitas]);

  function toggleCategoria(cat: string) {
    setCategoriasAtivas((prev) => {
      const next = new Set(prev);
      if (cat === 'Todas') return new Set();
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }

  function limparFiltros() {
    setCategoriasAtivas(new Set());
    setFiltroTempo(null);
    setFiltroDificuldade(null);
  }

  const filtrosAtivos = categoriasAtivas.size + (filtroTempo !== null ? 1 : 0) + (filtroDificuldade !== null ? 1 : 0);

  const receitasFiltradas = useMemo(() => {
    let base = busca.trim() ? buscar(busca) : receitas;
    if (categoriasAtivas.size > 0) base = base.filter((r) => r.categorias.some((c) => categoriasAtivas.has(c)));
    if (filtroTempo !== null) base = base.filter((r) => r.tempoPreparo <= filtroTempo);
    if (filtroDificuldade !== null) base = base.filter((r) => r.dificuldade === filtroDificuldade);
    return base;
  }, [receitas, busca, categoriasAtivas, filtroTempo, filtroDificuldade]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom', 'left', 'right']}>
      <View className="px-4 pt-3 pb-1 gap-2">
        <AppText variant="title" className="text-[24px]">O que vamos cozinhar?</AppText>
        <View className="flex-row items-center gap-2">
          <View className="flex-1">
            <TextInput
              placeholder="Buscar receitas..."
              placeholderTextColor="#8C7B6B"
              value={busca}
              onChangeText={setBusca}
              style={{ height: 40, textAlignVertical: 'center' }}
              className="bg-surface border border-border rounded-card px-3 py-0 font-sans text-[14px] text-text"
            />
          </View>
          <Pressable
            onPress={() => setFiltrosAbertos(true)}
            style={{ width: 40, height: 40 }}
            className={`rounded-card border items-center justify-center ${
              filtrosAtivos > 0 ? 'bg-primary border-primary' : 'bg-surface border-border'
            }`}
          >
            <Funnel size={17} color={filtrosAtivos > 0 ? 'white' : '#8C7B6B'} />
            {filtrosAtivos > 0 && (
              <View
                style={{ top: -5, right: -5, width: 20, height: 20 }}
                className="absolute rounded-full bg-accent items-center justify-center"
              >
                <AppText
                  numberOfLines={1}
                  style={{ lineHeight: 20, textAlign: 'center' }}
                  className="text-white text-[10px] font-sans-bold"
                >
                  {filtrosAtivos}
                </AppText>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      <Modal
        visible={filtrosAbertos}
        transparent
        animationType="fade"
        onRequestClose={() => setFiltrosAbertos(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setFiltrosAbertos(false)} />
          <View style={{ backgroundColor: '#FAF6F1', borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 18, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <AppText variant="heading">Filtros</AppText>
                <AppText variant="muted" style={{ fontSize: 11, marginTop: 1 }}>
                  Refine seu acervo de receitas
                </AppText>
              </View>
              <Pressable
                onPress={() => setFiltrosAbertos(false)}
                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={18} color="#2C1810" />
              </Pressable>
            </View>

            <View style={{ gap: 6 }}>
              <AppText variant="muted" style={{ fontSize: 11, textTransform: 'uppercase' }}>Categorias</AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {CATEGORIAS.map((cat) => (
                  <FilterOption
                    key={cat}
                    label={cat}
                    ativo={cat === 'Todas' ? categoriasAtivas.size === 0 : categoriasAtivas.has(cat)}
                    onPress={() => toggleCategoria(cat)}
                  />
                ))}
              </View>
            </View>

            <View style={{ gap: 6 }}>
              <AppText variant="muted" style={{ fontSize: 11, textTransform: 'uppercase' }}>Tempo</AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {[{ label: 'até 15 min', valor: 15 }, { label: 'até 30 min', valor: 30 }, { label: 'até 1h', valor: 60 }].map((t) => (
                  <FilterOption
                    key={t.valor}
                    label={t.label}
                    ativo={filtroTempo === t.valor}
                    onPress={() => setFiltroTempo(filtroTempo === t.valor ? null : t.valor)}
                  />
                ))}
              </View>
            </View>

            <View style={{ gap: 6 }}>
              <AppText variant="muted" style={{ fontSize: 11, textTransform: 'uppercase' }}>Dificuldade</AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {(['Fácil', 'Médio', 'Difícil'] as const).map((d) => (
                  <FilterOption
                    key={d}
                    label={d}
                    ativo={filtroDificuldade === d}
                    onPress={() => setFiltroDificuldade(filtroDificuldade === d ? null : d)}
                  />
                ))}
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={limparFiltros}
                style={{ flex: 1, height: 42, borderRadius: 12, backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }}
              >
                <AppText style={{ fontWeight: '500', color: '#2C1810' }}>Limpar</AppText>
              </Pressable>
              <Pressable
                onPress={() => setFiltrosAbertos(false)}
                style={{ flex: 1, height: 42, borderRadius: 12, backgroundColor: '#8B4513', alignItems: 'center', justifyContent: 'center' }}
              >
                <AppText style={{ fontWeight: '700', color: 'white' }}>Aplicar</AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {receitasFiltradas.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-2">
          <AppText className="text-[40px]">🍽</AppText>
          <AppText variant="muted">Nenhuma receita encontrada</AppText>
          <AppText variant="muted" className="text-[13px]">Toque no + para adicionar</AppText>
        </View>
      ) : (
        <FlatList
          data={receitasFiltradas}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <ReceitaCard
              receita={item}
              onPress={() => router.push(`/receita/${item.id}`)}
              criadorNome={item.fonte_receita_id ? criadores[item.fonte_receita_id] : undefined}
            />
          )}
        />
      )}

      <Pressable
        onPress={() => router.push('/receita/nova')}
        className="absolute bottom-6 right-6 bg-primary w-14 h-14 rounded-full items-center justify-center"
        style={{ shadowColor: '#8B4513', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
      >
        <Plus size={24} color="white" />
      </Pressable>
    </SafeAreaView>
  );
}
