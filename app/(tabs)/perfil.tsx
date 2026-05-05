import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { MessageCircle, Pencil } from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { useReceitas } from '../../hooks/useReceitas';
import { computarBadges, ProfileBadge, ProfileStats } from '../../lib/badges';
import { AppText } from '../../components/ui/AppText';
import { ComentariosSheet } from '../../components/ComentariosSheet';
import { supabase } from '../../lib/supabase';
import { Receita } from '../../types';

function StatBox({ valor, label, borderRight = true }: { valor: number; label: string; borderRight?: boolean }) {
  return (
    <View style={{
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      borderRightWidth: borderRight ? 1 : 0,
      borderRightColor: '#F0EBE5',
    }}>
      <AppText style={{ fontSize: 20, fontWeight: '700', color: '#8B4513' }}>{valor}</AppText>
      <AppText variant="muted" style={{ fontSize: 10, marginTop: 2 }}>{label}</AppText>
    </View>
  );
}

function BadgeChip({ badge }: { badge: ProfileBadge }) {
  const influencia = badge.grupo === 'influencia';
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 5,
      marginRight: 6,
      marginBottom: 6,
      backgroundColor: badge.unlocked ? (influencia ? '#EDE9FE' : '#FEF3C7') : '#F3F4F6',
      opacity: badge.unlocked ? 1 : 0.45,
    }}>
      <AppText style={{ fontSize: 12 }}>
        {badge.unlocked ? badge.icon : '🔒'}
      </AppText>
      <AppText style={{
        fontSize: 11,
        color: badge.unlocked ? (influencia ? '#5B21B6' : '#92400E') : '#6B7280',
      }}>
        {badge.label}
      </AppText>
    </View>
  );
}

function BadgeSection({ titulo, badges }: { titulo: string; badges: ProfileBadge[] }) {
  if (badges.length === 0) return null;
  return (
    <View style={{ marginBottom: 12 }}>
      <AppText variant="muted" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
        {titulo}
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {badges.map((badge) => <BadgeChip key={badge.id} badge={badge} />)}
      </View>
    </View>
  );
}

export default function PerfilScreen() {
  const { user } = useAuth();
  const { profile, loading, stats } = useProfile();
  const { receitas, carregarReceitas } = useReceitas();
  const [tabAtiva, setTabAtiva] = useState<'criadas' | 'salvas'>('criadas');
  const [contagensComentarios, setContagensComentarios] = useState<Map<string, number>>(new Map());
  const [receitaComentariosId, setReceitaComentariosId] = useState<string | null>(null);

  useFocusEffect(useCallback(() => { carregarReceitas(); }, [carregarReceitas]));

  useEffect(() => {
    if (receitas.length === 0) {
      setContagensComentarios(new Map());
      return;
    }
    supabase
      .from('comments')
      .select('recipe_id')
      .in('recipe_id', receitas.map((r) => r.id))
      .is('parent_id', null)
      .then(({ data }) => {
        const map = new Map<string, number>();
        for (const row of data ?? []) {
          map.set(row.recipe_id, (map.get(row.recipe_id) ?? 0) + 1);
        }
        setContagensComentarios(map);
      });
  }, [receitas]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FAF6F1', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#8B4513" />
      </View>
    );
  }

  const iniciais = (profile?.nome ?? 'U').trim().split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
  const desde = profile?.criado_em
    ? new Date(profile.criado_em).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
    : null;

  const criadas = receitas.filter((r) => !r.fonte_receita_id);
  const salvas = receitas.filter((r) => !!r.fonte_receita_id);
  const receitasTab = tabAtiva === 'criadas' ? criadas : salvas;

  const profileStats: ProfileStats = {
    totalReceitas: criadas.length,
    totalSalvas: profile?.total_importacoes ?? stats.totalSalvas,
    totalCoracoes: stats.totalCoracoes,
    totalComentarios: stats.totalComentarios,
  };

  const badges = computarBadges(criadas, profileStats);

  function handleReceitaPress(receita: Receita) {
    if (tabAtiva === 'criadas') {
      setReceitaComentariosId(receita.id);
    } else {
      router.push(`/receita/${receita.id}` as any);
    }
  }

  return (
    <>
      <FlatList
        style={{ backgroundColor: '#FAF6F1' }}
        data={receitasTab}
        keyExtractor={(item) => item.id}
        numColumns={3}
        columnWrapperStyle={{ paddingHorizontal: 16, gap: 6 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListHeaderComponent={
          <View>
            {/* Header — avatar, nome, stats */}
            <View style={{
              backgroundColor: 'white',
              marginHorizontal: 16,
              marginTop: 16,
              marginBottom: 12,
              borderRadius: 16,
              padding: 20,
              alignItems: 'center',
            }}>
              <View style={{ position: 'relative', marginBottom: 12 }}>
                <View style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: '#8B4513',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}>
                  {profile?.foto_url
                    ? <Image source={{ uri: profile.foto_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    : <AppText style={{ fontSize: 30, color: 'white', fontWeight: '700' }}>{iniciais}</AppText>
                  }
                </View>
                <Pressable
                  onPress={() => router.push('/perfil/editar' as any)}
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    backgroundColor: '#8B4513',
                    borderRadius: 12,
                    padding: 6,
                    borderWidth: 2,
                    borderColor: 'white',
                  }}
                >
                  <Pencil size={12} color="white" />
                </Pressable>
              </View>

              <AppText style={{ fontSize: 20, fontWeight: '700', color: '#2C1810' }}>
                {profile?.nome ?? 'Usuário'}
              </AppText>

              {desde && (
                <AppText variant="muted" style={{ fontSize: 12, marginTop: 3 }}>
                  Chef desde {desde}
                </AppText>
              )}

              <View style={{
                flexDirection: 'row',
                borderWidth: 1,
                borderColor: '#F0EBE5',
                borderRadius: 12,
                overflow: 'hidden',
                width: '100%',
                marginTop: 16,
              }}>
                <StatBox valor={profileStats.totalReceitas} label="receitas" />
                <StatBox valor={profileStats.totalSalvas} label="salvas" />
                <StatBox valor={profileStats.totalCoracoes} label="corações" />
                <StatBox valor={profileStats.totalComentarios} label="comentários" borderRight={false} />
              </View>
            </View>

            {/* Conquistas */}
            <View style={{
              backgroundColor: 'white',
              marginHorizontal: 16,
              marginBottom: 12,
              borderRadius: 16,
              padding: 16,
            }}>
              <AppText style={{ fontSize: 13, fontWeight: '700', color: '#2C1810', marginBottom: 14 }}>
                Conquistas
              </AppText>
              <BadgeSection titulo="Suas ações" badges={badges.filter((b) => b.grupo === 'solo')} />
              <BadgeSection titulo="Por categoria" badges={badges.filter((b) => b.grupo === 'categoria')} />
              <BadgeSection titulo="Influência" badges={badges.filter((b) => b.grupo === 'influencia')} />
            </View>

            {/* Tabs */}
            <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', backgroundColor: '#F5F0EB', borderRadius: 12, padding: 4 }}>
                {([
                  { key: 'criadas' as const, label: `Criadas (${criadas.length})` },
                  { key: 'salvas' as const, label: `Salvas (${salvas.length})` },
                ] as const).map((tab) => (
                  <Pressable
                    key={tab.key}
                    onPress={() => setTabAtiva(tab.key)}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      paddingVertical: 8,
                      borderRadius: 9,
                      backgroundColor: tabAtiva === tab.key ? 'white' : 'transparent',
                    }}
                  >
                    <AppText style={{
                      fontSize: 12,
                      fontWeight: tabAtiva === tab.key ? '700' : '400',
                      color: tabAtiva === tab.key ? '#2C1810' : '#8C7B6B',
                    }}>
                      {tab.label}
                    </AppText>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: 32 }}>
            <AppText variant="muted">Nenhuma receita aqui ainda.</AppText>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={{ flex: 1, aspectRatio: 1, borderRadius: 10, overflow: 'hidden', marginBottom: 6 }}
            onPress={() => handleReceitaPress(item)}
          >
            <View style={{ flex: 1, backgroundColor: '#E8DDD4', alignItems: 'center', justifyContent: 'center' }}>
              {item.imagem
                ? <Image source={{ uri: item.imagem }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                : <AppText style={{ fontSize: 28 }}>🍽</AppText>
              }
              {item.publica === false && (
                <View style={{
                  position: 'absolute',
                  top: 5,
                  right: 5,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  borderRadius: 6,
                  paddingHorizontal: 5,
                  paddingVertical: 2,
                }}>
                  <AppText style={{ fontSize: 9, color: 'white' }}>Privada</AppText>
                </View>
              )}
              {(contagensComentarios.get(item.id) ?? 0) > 0 && (
                <View style={{
                  position: 'absolute',
                  bottom: 5,
                  right: 5,
                  backgroundColor: 'rgba(255,255,255,0.92)',
                  borderRadius: 12,
                  paddingHorizontal: 6,
                  paddingVertical: 3,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 3,
                }}>
                  <MessageCircle size={10} color="#8B4513" />
                  <AppText style={{ fontSize: 10, color: '#8B4513', fontWeight: '700' }}>
                    {contagensComentarios.get(item.id)}
                  </AppText>
                </View>
              )}
            </View>
          </Pressable>
        )}
      />

      <Modal
        visible={!!receitaComentariosId}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setReceitaComentariosId(null)}
      >
        {receitaComentariosId ? (
          <ComentariosSheet
            receitaId={receitaComentariosId}
            receitaUserId={user?.id ?? ''}
            onClose={() => setReceitaComentariosId(null)}
          />
        ) : null}
      </Modal>
    </>
  );
}
