import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { AppText } from '../../components/ui/AppText';
import { computarBadges, ProfileBadge, ProfileStats } from '../../lib/badges';
import { Profile, Receita } from '../../types';

function StatBox({ valor, label }: { valor: number; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 10 }}>
      <AppText style={{ fontSize: 18, fontWeight: '700', color: '#8B4513' }}>{valor}</AppText>
      <AppText variant="muted" style={{ fontSize: 10 }}>{label}</AppText>
    </View>
  );
}

function BadgeChip({ badge }: { badge: ProfileBadge }) {
  const influencia = badge.grupo === 'influencia';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: 14,
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginRight: 6,
        marginBottom: 6,
        backgroundColor: badge.unlocked ? (influencia ? '#EDE9FE' : '#FEF3C7') : '#F3F4F6',
        opacity: badge.unlocked ? 1 : 0.5,
      }}
    >
      <AppText style={{ fontSize: 10, fontWeight: '700', color: influencia ? '#5B21B6' : '#92400E' }}>
        {badge.unlocked ? badge.icon : 'bloq'}
      </AppText>
      <AppText style={{ fontSize: 11, color: badge.unlocked ? '#2C1810' : '#6B7280' }}>
        {badge.label}
      </AppText>
    </View>
  );
}

function BadgeSection({ titulo, badges }: { titulo: string; badges: ProfileBadge[] }) {
  if (badges.length === 0) return null;
  return (
    <View style={{ marginTop: 12 }}>
      <AppText variant="label" style={{ marginBottom: 8 }}>{titulo}</AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {badges.map((badge) => <BadgeChip key={badge.id} badge={badge} />)}
      </View>
    </View>
  );
}

function mapReceita(row: any): Receita {
  return {
    id: row.id,
    user_id: row.user_id,
    nome: row.nome,
    categorias: Array.isArray(row.categorias) ? row.categorias : [],
    imagem: row.imagem ?? undefined,
    tempoPreparo: row.tempo_preparo,
    porcoes: row.porcoes,
    dificuldade: row.dificuldade,
    ingredientes: Array.isArray(row.ingredientes) ? row.ingredientes : [],
    instrucoes: Array.isArray(row.instrucoes) ? row.instrucoes : [],
    publica: row.publica,
    criadaEm: row.criada_em,
    atualizadaEm: row.atualizada_em ?? undefined,
    fonte_receita_id: row.fonte_receita_id ?? undefined,
  };
}

export default function PerfilPublicoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [stats, setStats] = useState<ProfileStats>({
    totalReceitas: 0,
    totalSalvas: 0,
    totalCoracoes: 0,
    totalComentarios: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      setLoading(true);

      const [{ data: profileData }, { data: receitasData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).single(),
        supabase
          .from('receitas')
          .select('id, user_id, nome, categorias, imagem, tempo_preparo, porcoes, dificuldade, ingredientes, instrucoes, publica, criada_em, atualizada_em, fonte_receita_id')
          .eq('user_id', id)
          .eq('publica', true)
          .order('criada_em', { ascending: false }),
      ]);

      const mapped = (receitasData ?? []).map(mapReceita);
      setProfile((profileData as Profile) ?? null);
      setReceitas(mapped);

      const ids = mapped.map((r) => r.id);
      if (ids.length === 0) {
        setStats({
          totalReceitas: 0,
          totalSalvas: profileData?.total_importacoes ?? 0,
          totalCoracoes: 0,
          totalComentarios: 0,
        });
      } else {
        const [{ count: coracoes }, { count: comentarios }] = await Promise.all([
          supabase.from('recipe_hearts').select('id', { count: 'exact', head: true }).in('recipe_id', ids),
          supabase.from('comments').select('id', { count: 'exact', head: true }).in('recipe_id', ids),
        ]);
        setStats({
          totalReceitas: mapped.length,
          totalSalvas: profileData?.total_importacoes ?? 0,
          totalCoracoes: coracoes ?? 0,
          totalComentarios: comentarios ?? 0,
        });
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
        <AppText variant="muted">Perfil nao encontrado</AppText>
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <AppText style={{ color: '#8B4513' }}>Voltar</AppText>
        </Pressable>
      </SafeAreaView>
    );
  }

  const iniciais = (profile.nome ?? 'U').trim().split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  const badges = computarBadges(receitas, stats);

  return (
    <View style={{ flex: 1, backgroundColor: '#FAF6F1' }}>
      <FlatList
        data={receitas}
        keyExtractor={(item) => item.id}
        numColumns={3}
        columnWrapperStyle={{ paddingHorizontal: 16, gap: 8 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListHeaderComponent={
          <View>
            <SafeAreaView edges={['top']}>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8 }}>
                <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
                  <ArrowLeft size={22} color="#2C1810" />
                </Pressable>
              </View>
            </SafeAreaView>

            <View style={{ backgroundColor: 'white', marginHorizontal: 16, marginTop: 8, marginBottom: 12, borderRadius: 16, padding: 18, alignItems: 'center', gap: 12 }}>
              <View style={{ width: 86, height: 86, borderRadius: 43, backgroundColor: '#8B4513', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {profile.foto_url
                  ? <Image source={{ uri: profile.foto_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  : <AppText style={{ fontSize: 32, color: 'white', fontWeight: '700' }}>{iniciais}</AppText>
                }
              </View>

              <AppText style={{ fontSize: 20, fontWeight: '700', color: '#2C1810' }}>{profile.nome}</AppText>
              <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: '#F0EBE5', borderRadius: 12, overflow: 'hidden', width: '100%' }}>
                <StatBox valor={stats.totalReceitas} label="receitas" />
                <StatBox valor={stats.totalSalvas} label="salvas" />
                <StatBox valor={stats.totalCoracoes} label="coracoes" />
                <StatBox valor={stats.totalComentarios} label="comentarios" />
              </View>
            </View>

            <View style={{ backgroundColor: 'white', marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 14 }}>
              <AppText variant="heading" style={{ fontSize: 15 }}>Conquistas</AppText>
              <BadgeSection titulo="Acoes" badges={badges.filter((b) => b.grupo === 'solo')} />
              <BadgeSection titulo="Por categoria" badges={badges.filter((b) => b.grupo === 'categoria')} />
              <BadgeSection titulo="Influencia" badges={badges.filter((b) => b.grupo === 'influencia')} />
            </View>

            <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
              <AppText variant="heading">Receitas publicas</AppText>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: 32 }}>
            <AppText variant="muted">Nenhuma receita publica ainda.</AppText>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={{ flex: 1, aspectRatio: 1, backgroundColor: 'white', borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}
            onPress={() => router.push(`/receita/${item.id}` as any)}
          >
            <View style={{ flex: 1, backgroundColor: '#E8DDD4', alignItems: 'center', justifyContent: 'center' }}>
              {item.imagem ? (
                <Image source={{ uri: item.imagem }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              ) : (
                <AppText style={{ fontSize: 28 }}>prato</AppText>
              )}
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}
