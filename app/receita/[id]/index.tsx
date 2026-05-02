import { View, ScrollView, Image, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Clock, Users, ChefHat } from 'lucide-react-native';
import { useReceitas } from '../../../hooks/useReceitas';
import { AppText } from '../../../components/ui/AppText';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { IngredienteItem } from '../../../components/IngredienteItem';
import { InstrucaoItem } from '../../../components/InstrucaoItem';

export default function ReceitaDetalhesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { receitas, remover, carregarReceitas } = useReceitas();
  const receita = receitas.find((r) => r.id === id);

  useFocusEffect(useCallback(() => { carregarReceitas(); }, [carregarReceitas]));

  if (!receita) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <AppText variant="muted">Receita não encontrada</AppText>
        <Button label="Voltar" variant="ghost" onPress={() => router.back()} />
      </SafeAreaView>
    );
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
