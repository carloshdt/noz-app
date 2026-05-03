import { View, ScrollView, Image, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Clock, Users, ChefHat, Eye, EyeOff } from 'lucide-react-native';
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

  async function handleTogglePublicar() {
    const publicaAtual = receita!.publica !== false;
    const ok = await togglePublicar(receita!.id, publicaAtual);
    if (ok) editar(receita!.id, { publica: !publicaAtual });
  }

  function confirmarRemocao() {
    Alert.alert('Remover receita', `Deseja remover "${receita!.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => { remover(id); router.back(); },
      },
    ]);
  }

  const publica = receita.publica !== false;

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

        <View className="px-4 py-6 gap-6">
          {originalAtualizada && (
            <Pressable
              onPress={() => router.push(`/receita/${receita.fonte_receita_id}` as any)}
              style={{
                backgroundColor: '#FEF3C7',
                borderRadius: 8,
                padding: 12,
                borderWidth: 1,
                borderColor: '#F59E0B',
              }}
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

          <View className="gap-3 pb-8">
            <Pressable
              onPress={handleTogglePublicar}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingVertical: 12,
                paddingHorizontal: 16,
                backgroundColor: publica ? '#F0FDF4' : '#F5F5F5',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: publica ? '#86EFAC' : '#E5E7EB',
              }}
            >
              {publica ? <Eye size={18} color="#166534" /> : <EyeOff size={18} color="#6B7280" />}
              <AppText style={{ flex: 1, color: publica ? '#166534' : '#6B7280', fontWeight: '500' }}>
                {publica ? 'Pública — visível no Feed' : 'Privada — só você vê'}
              </AppText>
              <AppText style={{ fontSize: 12, color: publica ? '#166534' : '#6B7280' }}>
                {publica ? 'Tornar privada' : 'Tornar pública'}
              </AppText>
            </Pressable>

            <Button label="Editar receita" variant="secondary" onPress={() => router.push(`/receita/${id}/editar`)} />
            <Button label="Remover receita" variant="ghost" onPress={confirmarRemocao} />
          </View>
        </View>
      </ScrollView>

      <SafeAreaView className="absolute top-0 left-0 right-0">
        <View className="flex-row justify-between px-4 pt-2">
          <Pressable onPress={() => router.back()} className="bg-black/30 rounded-full p-2">
            <ArrowLeft size={20} color="white" />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
