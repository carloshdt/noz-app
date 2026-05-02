import { View, FlatList, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useMemo } from 'react';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { Plus } from 'lucide-react-native';
import { useReceitas } from '../../hooks/useReceitas';
import { ReceitaCard } from '../../components/ReceitaCard';
import { CategoriaChip } from '../../components/CategoriaChip';
import { Input } from '../../components/ui/Input';
import { AppText } from '../../components/ui/AppText';
import { CATEGORIAS } from '../../constants/categorias';

export default function ReceitasScreen() {
  const { receitas, buscar, carregarReceitas } = useReceitas();
  const [busca, setBusca] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState('Todas');

  useFocusEffect(useCallback(() => { carregarReceitas(); }, [carregarReceitas]));

  const receitasFiltradas = useMemo(() => {
    const base = busca.trim() ? buscar(busca) : receitas;
    if (categoriaAtiva === 'Todas') return base;
    return base.filter((r) => r.categorias.includes(categoriaAtiva));
  }, [receitas, busca, categoriaAtiva]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom', 'left', 'right']}>
      <View className="px-4 pt-4 pb-2 gap-4">
        <AppText variant="title">O que vamos cozinhar?</AppText>
        <Input
          placeholder="Buscar receitas..."
          value={busca}
          onChangeText={setBusca}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 px-4">
          {CATEGORIAS.map((cat) => (
            <CategoriaChip
              key={cat}
              label={cat}
              ativo={categoriaAtiva === cat}
              onPress={() => setCategoriaAtiva(cat)}
            />
          ))}
        </ScrollView>
      </View>

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
          numColumns={2}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <ReceitaCard
              receita={item}
              onPress={() => router.push(`/receita/${item.id}`)}
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
