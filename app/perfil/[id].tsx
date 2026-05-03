import { View, FlatList, Image, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { PerfilPublico } from '../../components/PerfilPublico';
import { AppText } from '../../components/ui/AppText';
import { Profile, ReceitaFeed } from '../../types';

export default function PerfilPublicoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [receitas, setReceitas] = useState<ReceitaFeed[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      setLoading(true);

      const [{ data: profileData }, { data: receitasData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).single(),
        supabase
          .from('receitas')
          .select('id, nome, categorias, imagem, tempo_preparo, porcoes, dificuldade, criada_em, user_id')
          .eq('user_id', id)
          .eq('publica', true)
          .order('criada_em', { ascending: false }),
      ]);

      if (profileData) setProfile(profileData);
      if (receitasData && profileData) {
        setReceitas(
          receitasData.map((r: any) => ({
            id: r.id,
            user_id: r.user_id,
            nome: r.nome,
            categorias: Array.isArray(r.categorias) ? r.categorias : [],
            imagem: r.imagem ?? undefined,
            tempoPreparo: r.tempo_preparo,
            porcoes: r.porcoes,
            dificuldade: r.dificuldade,
            criadaEm: r.criada_em,
            criador: {
              id: profileData.id,
              nome: profileData.nome,
              foto_url: profileData.foto_url ?? undefined,
              total_importacoes: profileData.total_importacoes ?? 0,
            },
          }))
        );
      }

      setLoading(false);
    }

    if (id) carregar();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FAF6F1', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#8B4513" />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FAF6F1', alignItems: 'center', justifyContent: 'center' }}>
        <AppText variant="muted">Perfil não encontrado</AppText>
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <AppText style={{ color: '#8B4513' }}>Voltar</AppText>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FAF6F1' }}>
      <FlatList
        data={receitas}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ paddingHorizontal: 16, gap: 12 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListHeaderComponent={
          <>
            <SafeAreaView edges={['top']}>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8 }}>
                <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
                  <ArrowLeft size={22} color="#2C1810" />
                </Pressable>
              </View>
            </SafeAreaView>

            <PerfilPublico
              nome={profile.nome}
              foto_url={profile.foto_url}
              totalReceitas={receitas.length}
              totalImportacoes={profile.total_importacoes ?? 0}
            />

            <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
              <AppText variant="heading">Receitas</AppText>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: 32 }}>
            <AppText variant="muted">Nenhuma receita pública ainda.</AppText>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={{ flex: 1, backgroundColor: 'white', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}
            onPress={() => router.push(`/receita/${item.id}` as any)}
          >
            <View style={{ height: 120, backgroundColor: '#E8DDD4', alignItems: 'center', justifyContent: 'center' }}>
              {item.imagem ? (
                <Image source={{ uri: item.imagem }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              ) : (
                <AppText style={{ fontSize: 40 }}>🍽</AppText>
              )}
            </View>
            <View style={{ padding: 10 }}>
              <AppText style={{ fontWeight: '600', fontSize: 13 }} numberOfLines={2}>{item.nome}</AppText>
              <AppText variant="muted" style={{ fontSize: 11, marginTop: 2 }}>{item.tempoPreparo} min</AppText>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}
