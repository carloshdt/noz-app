import { View, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useMemo, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Check } from 'lucide-react-native';
import { useCardapio } from '../../hooks/useCardapio';
import { useReceitas } from '../../hooks/useReceitas';
import { AppText } from '../../components/ui/AppText';

export default function ComprasScreen() {
  const { receitas, carregarReceitas } = useReceitas();
  const { gerarListaCompras, recarregar } = useCardapio();

  useFocusEffect(useCallback(() => { recarregar(); carregarReceitas(); }, [recarregar, carregarReceitas]));
  const [marcados, setMarcados] = useState<Set<string>>(new Set());

  const itens = useMemo(() => gerarListaCompras(receitas), [receitas, gerarListaCompras]);

  function toggleMarcado(chave: string) {
    setMarcados((prev) => {
      const novo = new Set(prev);
      novo.has(chave) ? novo.delete(chave) : novo.add(chave);
      return novo;
    });
  }

  function limpar() {
    setMarcados(new Set());
  }

  if (itens.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center gap-3 px-8" edges={['bottom', 'left', 'right']}>
        <AppText className="text-[48px]">🛒</AppText>
        <AppText variant="heading" className="text-center">Lista vazia</AppText>
        <AppText variant="muted" className="text-center">Adicione receitas ao cardápio semanal para gerar sua lista de compras automaticamente.</AppText>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom', 'left', 'right']}>
      <View className="px-4 pt-4 pb-2 flex-row justify-between items-center">
        <AppText variant="title">Lista de Compras</AppText>
        {marcados.size > 0 && (
          <Pressable onPress={limpar}>
            <AppText variant="muted" className="text-[13px]">Limpar marcados</AppText>
          </Pressable>
        )}
      </View>

      <FlatList
        data={itens}
        keyExtractor={(item) => `${item.nome}|${item.unidade}`}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        renderItem={({ item }) => {
          const chave = `${item.nome}|${item.unidade}`;
          const marcado = marcados.has(chave);
          return (
            <Pressable
              onPress={() => toggleMarcado(chave)}
              className={`flex-row items-center gap-3 bg-surface rounded-card px-4 py-3 ${marcado ? 'opacity-50' : ''}`}
            >
              <View className={`w-6 h-6 rounded-full border-2 items-center justify-center shrink-0 ${marcado ? 'bg-accent border-accent' : 'border-border'}`}>
                {marcado && <Check size={14} color="white" />}
              </View>
              <View className="flex-1">
                <AppText className={marcado ? 'line-through text-muted' : ''}>{item.nome}</AppText>
                <AppText variant="muted" className="text-[12px]">{item.receitas.join(' · ')}</AppText>
              </View>
              <AppText variant="muted">{item.quantidade > 0 ? `${item.quantidade} ${item.unidade}` : item.unidade}</AppText>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}
