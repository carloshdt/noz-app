import { View, ScrollView, Pressable, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { Plus, X, Minus } from 'lucide-react-native';
import { Receita } from '../../types';
import { useCardapio } from '../../hooks/useCardapio';
import { useReceitas } from '../../hooks/useReceitas';
import { AppText } from '../../components/ui/AppText';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DIAS_COMPLETOS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export default function CardapioScreen() {
  const { cardapio, atribuir, limpar } = useCardapio();
  const { receitas } = useReceitas();
  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null);
  const [receitaPendente, setReceitaPendente] = useState<Receita | null>(null);
  const [porcoesSelecionadas, setPorcoesSelecionadas] = useState(1);

  function obterReceita(receitaId: string | null) {
    if (!receitaId) return null;
    return receitas.find((r) => r.id === receitaId) ?? null;
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom', 'left', 'right']}>
      <View className="px-4 pt-4 pb-2 flex-row justify-between items-center">
        <AppText variant="title">Cardápio da Semana</AppText>
        <Pressable onPress={limpar}>
          <AppText variant="muted" className="text-[13px]">Limpar</AppText>
        </Pressable>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingVertical: 12, gap: 10 }}>
        {cardapio.map((dia) => {
          const receita = obterReceita(dia.receitaId);
          return (
            <Pressable key={dia.diaSemana} onPress={() => setDiaSelecionado(dia.diaSemana)}>
              <Card className="flex-row items-center gap-3">
                <View className="w-12 h-12 bg-primary/10 rounded-full items-center justify-center shrink-0">
                  <AppText className="font-sans-bold text-primary text-[13px]">{DIAS[dia.diaSemana]}</AppText>
                </View>
                <View className="flex-1">
                  {receita ? (
                    <>
                      <AppText variant="heading" className="text-[15px]">{receita.nome}</AppText>
                      <View className="flex-row gap-2 mt-1">
                        <Badge label={receita.categorias[0]} />
                        <Badge label={`${receita.tempoPreparo} min`} />
                      </View>
                    </>
                  ) : (
                    <AppText variant="muted">Sem receita — toque para adicionar</AppText>
                  )}
                </View>
                <Plus size={18} color="#8C7B6B" />
              </Card>
            </Pressable>
          );
        })}
      </ScrollView>

      <Modal visible={diaSelecionado !== null} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-background">
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
            <AppText variant="heading">
              {diaSelecionado !== null ? DIAS_COMPLETOS[diaSelecionado] : ''}
            </AppText>
            <Pressable onPress={() => { setDiaSelecionado(null); setReceitaPendente(null); }}>
              <X size={22} color="#8C7B6B" />
            </Pressable>
          </View>

          {diaSelecionado !== null && (
            <Pressable
              className="mx-4 mt-3 mb-1"
              onPress={() => { atribuir(diaSelecionado, null); setDiaSelecionado(null); }}
            >
              <AppText variant="muted" className="text-center py-2">Remover receita do dia</AppText>
            </Pressable>
          )}

          {receitaPendente ? (
            <View className="flex-1 px-4 pt-4 gap-4">
              <Card className="gap-3">
                <AppText variant="heading" className="text-[16px]">{receitaPendente.nome}</AppText>
                <AppText variant="muted" className="text-[13px]">Receita original: {receitaPendente.porcoes} porções</AppText>
                <View className="flex-row items-center justify-center gap-6 py-2">
                  <Pressable
                    onPress={() => setPorcoesSelecionadas((p) => Math.max(1, p - 1))}
                    className="w-10 h-10 rounded-full bg-surface border border-border items-center justify-center"
                  >
                    <Minus size={18} color="#8C7B6B" />
                  </Pressable>
                  <AppText className="font-sans-bold text-[28px] text-primary w-12 text-center">{porcoesSelecionadas}</AppText>
                  <Pressable
                    onPress={() => setPorcoesSelecionadas((p) => p + 1)}
                    className="w-10 h-10 rounded-full bg-surface border border-border items-center justify-center"
                  >
                    <Plus size={18} color="#8C7B6B" />
                  </Pressable>
                </View>
                <AppText variant="muted" className="text-center text-[12px]">
                  {porcoesSelecionadas === receitaPendente.porcoes
                    ? 'Quantidades originais'
                    : `Ingredientes ×${(porcoesSelecionadas / receitaPendente.porcoes).toFixed(2).replace(/\.?0+$/, '')}`}
                </AppText>
              </Card>
              <Button
                label="Adicionar ao cardápio"
                onPress={() => {
                  if (diaSelecionado !== null) {
                    atribuir(diaSelecionado, receitaPendente.id, porcoesSelecionadas);
                    setDiaSelecionado(null);
                    setReceitaPendente(null);
                  }
                }}
              />
              <Button label="Voltar" variant="secondary" onPress={() => setReceitaPendente(null)} />
            </View>
          ) : (
            <FlatList
              data={receitas}
              keyExtractor={(r) => r.id}
              contentContainerStyle={{ padding: 16, gap: 10 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setPorcoesSelecionadas(item.porcoes);
                    setReceitaPendente(item);
                  }}
                >
                  <Card className="flex-row items-center gap-3">
                    <View className="flex-1">
                      <AppText variant="heading" className="text-[15px]">{item.nome}</AppText>
                      <AppText variant="muted" className="text-[13px]">{item.tempoPreparo} min · {item.porcoes} porções</AppText>
                    </View>
                    <Badge label={item.categorias[0]} />
                  </Card>
                </Pressable>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
