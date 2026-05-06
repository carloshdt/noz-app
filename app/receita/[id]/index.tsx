import { View, ScrollView, Image, Pressable, Alert, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Clock, Users, ChefHat, MoreVertical, Eye, EyeOff, Pencil, Trash2, Heart, MessageCircle } from 'lucide-react-native';
import { useReceitas } from '../../../hooks/useReceitas';
import { usePublicar } from '../../../hooks/usePublicar';
import { useAuth } from '../../../hooks/useAuth';
import { useCoracoes } from '../../../hooks/useCoracoes';
import { useComentarios } from '../../../hooks/useComentarios';
import { Receita } from '../../../types';
import { AppText } from '../../../components/ui/AppText';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { IngredienteItem } from '../../../components/IngredienteItem';
import { InstrucaoItem } from '../../../components/InstrucaoItem';
import { supabase } from '../../../lib/supabase';

function mapReceitaSupabase(r: any): Receita {
  return {
    id: r.id,
    user_id: r.user_id,
    nome: r.nome,
    categorias: Array.isArray(r.categorias) ? r.categorias : [r.categoria ?? 'Carnes'],
    imagem: r.imagem ?? undefined,
    tempoPreparo: r.tempo_preparo,
    porcoes: r.porcoes,
    dificuldade: r.dificuldade,
    ingredientes: (r.ingredientes ?? []).map((i: any) => ({
      id: i.id,
      nome: i.nome,
      quantidade: parseFloat(i.quantidade),
      unidade: i.unidade,
    })),
    instrucoes: (r.instrucoes ?? []).map((inst: any) =>
      typeof inst === 'string' ? { texto: inst } : inst
    ),
    publica: r.publica,
    criadaEm: r.criada_em,
    atualizadaEm: r.atualizada_em,
    fonte_receita_id: r.fonte_receita_id,
    fonte_atualizada_em: r.fonte_atualizada_em,
  };
}

export default function ReceitaDetalhesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { receitas, remover, editar, carregarReceitas } = useReceitas();
  const { togglePublicar } = usePublicar();
  const receitaLocal = receitas.find((r) => r.id === id);
  const [receitaPublica, setReceitaPublica] = useState<Receita | null>(null);
  const [carregandoPublica, setCarregandoPublica] = useState(false);
  const receita = receitaLocal ?? receitaPublica;
  const { coracoes, carregarCorações: carregarCoracoes, toggleCoracao } = useCoracoes(receita ? [receita.id] : []);
  const coracao = coracoes.get(receita?.id ?? '');
  const { total: totalComentarios, carregar: carregarComentarios } = useComentarios(receita?.id ?? '');
  const isOwnRecipe = receita?.user_id === user?.id && !receita?.fonte_receita_id;
  const isSavedRecipe = !!receita?.fonte_receita_id;
  const podeEditar = !!receitaLocal && (isOwnRecipe || isSavedRecipe);
  const [originalAtualizada, setOriginalAtualizada] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [criadorOriginal, setCriadorOriginal] = useState<{ id: string; nome: string; foto_url?: string } | null>(null);

  useFocusEffect(useCallback(() => { carregarReceitas(); }, [carregarReceitas]));

  useEffect(() => {
    if (receita?.id) carregarCoracoes([receita.id]);
  }, [receita?.id, carregarCoracoes]);

  useEffect(() => {
    if (receita?.id) carregarComentarios();
  }, [receita?.id, carregarComentarios]);

  useEffect(() => {
    if (!id || receitaLocal) {
      setReceitaPublica(null);
      setCarregandoPublica(false);
      return;
    }

    let ativo = true;
    setCarregandoPublica(true);
    async function carregarPublica() {
      const { data } = await supabase
        .from('receitas')
        .select('*, ingredientes(*)')
        .eq('id', id)
        .eq('publica', true)
        .single();

      if (ativo) {
        setReceitaPublica(data ? mapReceitaSupabase(data) : null);
        setCarregandoPublica(false);
      }
    }

    carregarPublica().catch(() => {
      if (ativo) {
        setReceitaPublica(null);
        setCarregandoPublica(false);
      }
    });

    return () => { ativo = false; };
  }, [id, receitaLocal?.id]);

  useEffect(() => {
    if (!receita?.fonte_receita_id) { setCriadorOriginal(null); return; }
    supabase
      .from('receitas')
      .select('atualizada_em, user_id')
      .eq('id', receita.fonte_receita_id)
      .single()
      .then(async ({ data }) => {
        if (!data) return;
        if (receita.fonte_atualizada_em) {
          setOriginalAtualizada(data.atualizada_em > receita.fonte_atualizada_em);
        }
        const { data: perfil } = await supabase
          .from('profiles')
          .select('id, nome, foto_url')
          .eq('id', data.user_id)
          .single();
        if (perfil) setCriadorOriginal(perfil);
      });
  }, [receita?.fonte_receita_id, receita?.fonte_atualizada_em]);

  if (carregandoPublica && !receita) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center gap-3">
        <ActivityIndicator color="#8B4513" />
        <AppText variant="muted">Carregando receita...</AppText>
      </SafeAreaView>
    );
  }

  if (!receita) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <AppText variant="muted">Receita não encontrada</AppText>
        <Button label="Voltar" variant="ghost" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const publica = receita.publica !== false;

  async function handleTogglePublicar() {
    if (!podeEditar) return;
    const ok = await togglePublicar(receita!.id, publica);
    if (ok) editar(receita!.id, { publica: !publica });
  }

  function confirmarRemocao() {
    setMenuAberto(false);
    Alert.alert('Remover receita', `Deseja remover "${receita!.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => { remover(id); router.back(); },
      },
    ]);
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView>
        <View className="aspect-[4/3] w-full bg-border">
          {receita.imagem ? (
            <Image source={{ uri: receita.imagem }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <View className="w-full h-full items-center justify-center bg-surface">
              <AppText className="text-[64px]">🍽</AppText>
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(44,24,16,0.85)']}
            className="absolute bottom-0 left-0 right-0 h-32 justify-end p-4"
          >
            <AppText variant="title" className="text-white">{receita.nome}</AppText>
          </LinearGradient>
        </View>

        <View className="px-4 gap-6 pb-12" style={{ paddingTop: 8, paddingBottom: 48 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <Pressable
                onPress={() => toggleCoracao(receita.id)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Heart size={20} color="#8B4513" fill={coracao?.meu ? '#8B4513' : 'none'} />
                <AppText style={{ fontSize: 13, color: '#2C1810' }}>{coracao?.total ?? 0}</AppText>
              </Pressable>
              <Pressable
                onPress={() => router.push({ pathname: '/comentarios/[id]', params: { id: receita.id, receitaUserId: receita.user_id } } as any)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MessageCircle size={20} color="#8B4513" />
                <AppText style={{ fontSize: 13, color: '#2C1810' }}>{totalComentarios}</AppText>
              </Pressable>
            </View>
            <AppText variant="muted" style={{ flex: 1, textAlign: 'right', fontSize: 12 }}>
              {new Date(receita.criadaEm).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </AppText>
          </View>
          {criadorOriginal && (
            <Pressable
              onPress={() => router.push(`/perfil/${criadorOriginal.id}` as any)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 6, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E5E7EB', marginTop: -16, marginHorizontal: -16 }}
            >
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#8B4513', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {criadorOriginal.foto_url
                  ? <Image source={{ uri: criadorOriginal.foto_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  : <AppText style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>
                      {criadorOriginal.nome.trim().split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                    </AppText>
                }
              </View>
              <AppText variant="muted" style={{ fontSize: 13 }}>
                Salva de <AppText style={{ fontWeight: '600', fontSize: 13, color: '#2C1810' }}>{criadorOriginal.nome}</AppText>
              </AppText>
              <AppText variant="muted" style={{ fontSize: 12, marginLeft: 'auto' }}>Ver perfil →</AppText>
            </Pressable>
          )}

          {originalAtualizada && (
            <Pressable
              onPress={() => router.push(`/receita/${receita.fonte_receita_id}` as any)}
              style={{ backgroundColor: '#FEF3C7', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#F59E0B' }}
            >
              <AppText style={{ fontSize: 13, color: '#92400E' }}>
                Original atualizada · toque para ver
              </AppText>
            </Pressable>
          )}

          <View className="flex-row flex-wrap gap-2" style={{ marginVertical: -10 }}>
            {receita.categorias.map((c) => <Badge key={c} label={c} variant="accent" />)}
          </View>

          <View className="flex-row justify-around">
            <View className="items-center gap-1">
              <Clock size={20} color="#8B4513" />
              <AppText variant="label">Tempo</AppText>
              <AppText className="font-sans-bold">{receita.tempoPreparo} min</AppText>
            </View>
            <View className="items-center gap-1">
              <Users size={20} color="#8B4513" />
              <AppText variant="label">Porções</AppText>
              <AppText className="font-sans-bold">{receita.porcoes}</AppText>
            </View>
            <View className="items-center gap-1">
              <ChefHat size={20} color="#8B4513" />
              <AppText variant="label">Dificuldade</AppText>
              <AppText className="font-sans-bold">{receita.dificuldade}</AppText>
            </View>
          </View>

          <View className="gap-2">
            <AppText variant="heading">Ingredientes</AppText>
            {receita.ingredientes.map((ing, i) => (
              <IngredienteItem key={i} ingrediente={ing} />
            ))}
          </View>

          <View className="gap-2">
            <AppText variant="heading">Modo de Preparo</AppText>
            {receita.instrucoes.map((inst, i) => (
              <InstrucaoItem key={i} numero={i + 1} instrucao={inst} />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Header */}
      <SafeAreaView className="absolute top-0 left-0 right-0">
        <View className="flex-row justify-between px-4 pt-2">
          <Pressable onPress={() => router.back()} className="bg-black/30 rounded-full p-2">
            <ArrowLeft size={20} color="white" />
          </Pressable>
          {podeEditar && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {isOwnRecipe && (
                <Pressable onPress={handleTogglePublicar} className="bg-black/30 rounded-full p-2">
                  {publica ? <Eye size={20} color="white" /> : <EyeOff size={20} color="white" />}
                </Pressable>
              )}
              <Pressable onPress={() => setMenuAberto(true)} className="bg-black/30 rounded-full p-2">
                <MoreVertical size={20} color="white" />
              </Pressable>
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* Bottom sheet menu */}
      <Modal visible={menuAberto} transparent animationType="slide" onRequestClose={() => setMenuAberto(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
          onPress={() => setMenuAberto(false)}
        >
          <Pressable onPress={() => {}}>
            <View style={{ backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 8, paddingBottom: 32 }}>
              {/* Handle */}
              <View style={{ width: 36, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />

              {/* Título */}
              <AppText variant="muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 20, marginBottom: 8 }}>
                {receita.nome}
              </AppText>

              {/* Editar */}
              <Pressable
                onPress={() => { setMenuAberto(false); router.push(`/receita/${id}/editar`); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingVertical: 16 }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F0EB', alignItems: 'center', justifyContent: 'center' }}>
                  <Pencil size={18} color="#8B4513" />
                </View>
                <View>
                  <AppText style={{ fontWeight: '600' }}>Editar receita</AppText>
                  <AppText variant="muted" style={{ fontSize: 12 }}>Alterar ingredientes, modo de preparo...</AppText>
                </View>
              </Pressable>

              {/* Toggle público — só para receitas próprias */}
              {isOwnRecipe && (
                <Pressable
                  onPress={handleTogglePublicar}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingVertical: 16 }}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: publica ? '#F0FDF4' : '#F5F5F5', alignItems: 'center', justifyContent: 'center' }}>
                    {publica ? <Eye size={18} color="#166534" /> : <EyeOff size={18} color="#6B7280" />}
                  </View>
                  <View>
                    <AppText style={{ fontWeight: '600', color: publica ? '#166534' : '#374151' }}>
                      {publica ? 'Pública' : 'Privada'}
                    </AppText>
                    <AppText variant="muted" style={{ fontSize: 12 }}>
                      {publica ? 'Toque para tornar privada' : 'Toque para tornar pública'}
                    </AppText>
                  </View>
                </Pressable>
              )}

              {/* Divisor */}
              <View style={{ height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 20, marginVertical: 4 }} />

              {/* Remover */}
              <Pressable
                onPress={confirmarRemocao}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingVertical: 16 }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={18} color="#DC2626" />
                </View>
                <View>
                  <AppText style={{ fontWeight: '600', color: '#DC2626' }}>Remover receita</AppText>
                  <AppText variant="muted" style={{ fontSize: 12 }}>Esta ação não pode ser desfeita</AppText>
                </View>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
