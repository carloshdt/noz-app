import { View, ScrollView, Image, Pressable, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Clock, Users, ChefHat, MoreVertical, Eye, EyeOff, Pencil, Trash2 } from 'lucide-react-native';
import { useReceitas } from '../../../hooks/useReceitas';
import { usePublicar } from '../../../hooks/usePublicar';
import { AppText } from '../../../components/ui/AppText';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { IngredienteItem } from '../../../components/IngredienteItem';
import { InstrucaoItem } from '../../../components/InstrucaoItem';
import { supabase } from '../../../lib/supabase';

export default function ReceitaDetalhesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { receitas, remover, editar, carregarReceitas } = useReceitas();
  const { togglePublicar } = usePublicar();
  const receita = receitas.find((r) => r.id === id);
  const [originalAtualizada, setOriginalAtualizada] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);

  useFocusEffect(useCallback(() => { carregarReceitas(); }, [carregarReceitas]));

  useEffect(() => {
    if (!receita?.fonte_receita_id) return;
    supabase
      .from('receitas')
      .select('atualizada_em')
      .eq('id', receita.fonte_receita_id)
      .single()
      .then(({ data }) => {
        if (data && receita.fonte_atualizada_em) {
          setOriginalAtualizada(data.atualizada_em > receita.fonte_atualizada_em);
        }
      });
  }, [receita?.fonte_receita_id, receita?.fonte_atualizada_em]);

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

        <View className="px-4 py-6 gap-6 pb-12">
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

          <View className="flex-row flex-wrap gap-2">
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
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={handleTogglePublicar} className="bg-black/30 rounded-full p-2">
              {publica ? <Eye size={20} color="white" /> : <EyeOff size={20} color="white" />}
            </Pressable>
            <Pressable onPress={() => setMenuAberto(true)} className="bg-black/30 rounded-full p-2">
              <MoreVertical size={20} color="white" />
            </Pressable>
          </View>
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

              {/* Toggle público */}
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
