import { View, FlatList, Image, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { Pencil } from 'lucide-react-native';
import { useProfile } from '../../hooks/useProfile';
import { useReceitas } from '../../hooks/useReceitas';
import { AppText } from '../../components/ui/AppText';

export default function PerfilScreen() {
  const { profile, loading } = useProfile();
  const { receitas, carregarReceitas } = useReceitas();

  useFocusEffect(useCallback(() => { carregarReceitas(); }, [carregarReceitas]));

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FAF6F1', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#8B4513" />
      </View>
    );
  }

  const iniciais = (profile?.nome ?? 'U')
    .trim().split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  const totalReceitas = receitas.length;
  const totalPublicas = receitas.filter((r) => r.publica !== false).length;
  const totalImportacoes = profile?.total_importacoes ?? 0;

  return (
    <FlatList
      style={{ backgroundColor: '#FAF6F1' }}
      data={receitas}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={{ paddingHorizontal: 16, gap: 12 }}
      contentContainerStyle={{ paddingBottom: 32 }}
      ListHeaderComponent={
        <View>
          {/* Header card */}
          <View style={{ backgroundColor: 'white', marginHorizontal: 16, marginTop: 16, marginBottom: 24, borderRadius: 16, padding: 20, alignItems: 'center', gap: 12 }}>
            {/* Avatar */}
            <View style={{ position: 'relative' }}>
              <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: '#8B4513', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {profile?.foto_url
                  ? <Image source={{ uri: profile.foto_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  : <AppText style={{ fontSize: 32, color: 'white', fontWeight: '700' }}>{iniciais}</AppText>
                }
              </View>
              <Pressable
                onPress={() => router.push('/perfil/editar' as any)}
                style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: '#8B4513', borderRadius: 12, padding: 6, borderWidth: 2, borderColor: 'white' }}
              >
                <Pencil size={12} color="white" />
              </Pressable>
            </View>

            {/* Nome */}
            <AppText style={{ fontSize: 20, fontWeight: '700', color: '#2C1810' }}>
              {profile?.nome ?? 'Usuário'}
            </AppText>

            {/* Stats */}
            <View style={{ flexDirection: 'row', gap: 24, marginTop: 4 }}>
              <View style={{ alignItems: 'center' }}>
                <AppText style={{ fontSize: 20, fontWeight: '700', color: '#8B4513' }}>{totalReceitas}</AppText>
                <AppText variant="muted" style={{ fontSize: 12 }}>receitas</AppText>
              </View>
              <View style={{ width: 1, backgroundColor: '#E5E7EB' }} />
              <View style={{ alignItems: 'center' }}>
                <AppText style={{ fontSize: 20, fontWeight: '700', color: '#8B4513' }}>{totalPublicas}</AppText>
                <AppText variant="muted" style={{ fontSize: 12 }}>públicas</AppText>
              </View>
              <View style={{ width: 1, backgroundColor: '#E5E7EB' }} />
              <View style={{ alignItems: 'center' }}>
                <AppText style={{ fontSize: 20, fontWeight: '700', color: '#8B4513' }}>{totalImportacoes}</AppText>
                <AppText variant="muted" style={{ fontSize: 12 }}>importações</AppText>
              </View>
            </View>
          </View>

          <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
            <AppText variant="heading">Minhas receitas</AppText>
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={{ alignItems: 'center', paddingVertical: 32 }}>
          <AppText variant="muted">Nenhuma receita ainda.</AppText>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          style={{ flex: 1, backgroundColor: 'white', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}
          onPress={() => router.push(`/receita/${item.id}` as any)}
        >
          <View style={{ height: 110, backgroundColor: '#E8DDD4', alignItems: 'center', justifyContent: 'center' }}>
            {item.imagem
              ? <Image source={{ uri: item.imagem }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              : <AppText style={{ fontSize: 36 }}>🍽</AppText>
            }
            {item.publica === false && (
              <View style={{ position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                <AppText style={{ fontSize: 10, color: 'white' }}>Privada</AppText>
              </View>
            )}
          </View>
          <View style={{ padding: 10 }}>
            <AppText style={{ fontWeight: '600', fontSize: 13 }} numberOfLines={2}>{item.nome}</AppText>
            <AppText variant="muted" style={{ fontSize: 11, marginTop: 2 }}>{item.tempoPreparo} min</AppText>
          </View>
        </Pressable>
      )}
    />
  );
}
