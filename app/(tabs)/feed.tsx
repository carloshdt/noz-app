import { View, FlatList, ActivityIndicator } from 'react-native';
import { useCallback, useState } from 'react';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useFeed } from '../../hooks/useFeed';
import { useSalvarReceita } from '../../hooks/useSalvarReceita';
import { FeedCard } from '../../components/FeedCard';
import { AppText } from '../../components/ui/AppText';

export default function FeedScreen() {
  const { receitas, loading, temMais, recarregar, carregarMais } = useFeed();
  const { salvar, salvando } = useSalvarReceita();
  const [itemHeight, setItemHeight] = useState(0);
  const [salvas, setSalvas] = useState<Set<string>>(new Set());

  useFocusEffect(useCallback(() => { recarregar(); }, []));

  async function handleSalvar(receitaId: string, criadorId: string) {
    if (salvando || salvas.has(receitaId)) return;
    const ok = await salvar(receitaId, criadorId);
    if (ok) setSalvas((prev) => new Set(prev).add(receitaId));
  }

  return (
    <View
      style={{ flex: 1, backgroundColor: '#FAF6F1' }}
      onLayout={(e) => setItemHeight(e.nativeEvent.layout.height)}
    >
      {itemHeight > 0 && (
        <FlatList
          data={receitas}
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
              onVerPerfil={(userId) => router.push(`/perfil/${userId}` as any)}
              salvada={salvas.has(item.id)}
            />
          )}
        />
      )}
    </View>
  );
}
