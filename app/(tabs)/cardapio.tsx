import { View, ScrollView, Pressable, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { Plus, X, Minus } from 'lucide-react-native';
import { Receita, PeriodoPlanejamento, DiaPorcao } from '../../types';
import { useCardapio } from '../../hooks/useCardapio';
import { useConfiguracao } from '../../hooks/useConfiguracao';
import { useReceitas } from '../../hooks/useReceitas';
import { AppText } from '../../components/ui/AppText';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const TOTAL_DIAS: Record<PeriodoPlanejamento, number> = { semanal: 7, quinzenal: 14, mensal: 30 };

function rotuloDia(i: number, periodo: PeriodoPlanejamento) {
  return periodo === 'semanal' ? DIAS_SEMANA[i % 7] : `Dia ${i + 1}`;
}

type Etapa = 'receitas' | 'batches' | 'dias';

export default function CardapioScreen() {
  const { plano, adicionarReceita, removerReceita, limpar } = useCardapio();
  const { periodo } = useConfiguracao();
  const { receitas } = useReceitas();

  const [modalAberto, setModalAberto] = useState(false);
  const [diaPre, setDiaPre] = useState<number | null>(null);
  const [receitaSelecionada, setReceitaSelecionada] = useState<Receita | null>(null);
  const [batches, setBatches] = useState(1);
  const [diasSelecionados, setDiasSelecionados] = useState<DiaPorcao[]>([]);
  const [etapa, setEtapa] = useState<Etapa>('receitas');

  const totalDias = TOTAL_DIAS[periodo];

  function abrirModal(dia?: number) {
    setDiaPre(dia ?? null);
    setReceitaSelecionada(null);
    setBatches(1);
    setDiasSelecionados(dia !== undefined ? [{ dia, porcoes: 1 }] : []);
    setEtapa('receitas');
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setDiaPre(null);
    setReceitaSelecionada(null);
  }

  function selecionarReceita(r: Receita) {
    setReceitaSelecionada(r);
    setEtapa('batches');
  }

  function confirmarBatches(semDia: boolean) {
    if (semDia) {
      adicionarReceita(receitaSelecionada!.id, batches, undefined);
      fecharModal();
    } else {
      setEtapa('dias');
    }
  }

  const totalPorcoesDisp = receitaSelecionada ? batches * receitaSelecionada.porcoes : 0;
  const totalPorcoesDistrib = diasSelecionados.reduce((s, d) => s + d.porcoes, 0);
  const porcoesRestantes = totalPorcoesDisp - totalPorcoesDistrib;

  function setPorcoesNoDia(dia: number, delta: number) {
    setDiasSelecionados((prev) => {
      const existe = prev.find((d) => d.dia === dia);
      if (!existe) {
        if (delta > 0 && porcoesRestantes > 0) return [...prev, { dia, porcoes: 1 }];
        return prev;
      }
      const novas = existe.porcoes + delta;
      if (novas <= 0) return prev.filter((d) => d.dia !== dia);
      if (delta > 0 && porcoesRestantes <= 0) return prev;
      return prev.map((d) => d.dia === dia ? { ...d, porcoes: novas } : d);
    });
  }

  function confirmarDias() {
    adicionarReceita(receitaSelecionada!.id, batches, diasSelecionados.length > 0 ? diasSelecionados : undefined);
    fecharModal();
  }

  function receitaDoDia(dia: number): { receita: Receita; porcoes: number } | undefined {
    const pr = plano.receitas.find((r) => r.dias?.some((d) => d.dia === dia));
    if (!pr) return undefined;
    const receita = receitas.find((r) => r.id === pr.receitaId);
    if (!receita) return undefined;
    const porcoes = pr.dias?.find((d) => d.dia === dia)?.porcoes ?? 1;
    return { receita, porcoes };
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom', 'left', 'right']}>
      <View className="px-4 pt-4 pb-2 flex-row justify-between items-center">
        <AppText variant="title">Cardápio</AppText>
        <Pressable onPress={limpar}>
          <AppText variant="muted" className="text-[13px]">Limpar</AppText>
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Receitas do período */}
        <View className="px-4 pb-2">
          <View className="flex-row justify-between items-center mb-2">
            <AppText variant="heading" className="text-[14px]">Receitas do período</AppText>
            <Pressable
              onPress={() => abrirModal()}
              className="w-8 h-8 rounded-full bg-primary items-center justify-center"
            >
              <Plus size={16} color="white" />
            </Pressable>
          </View>

          {plano.receitas.length === 0 ? (
            <AppText variant="muted" className="text-[13px] py-2">Nenhuma receita — toque em + para adicionar</AppText>
          ) : (
            <View className="gap-2">
              {plano.receitas.map((pr) => {
                const r = receitas.find((x) => x.id === pr.receitaId);
                if (!r) return null;
                return (
                  <Card key={pr.receitaId} className="flex-row items-center gap-3">
                    <View className="flex-1">
                      <AppText variant="heading" className="text-[14px]">{r.nome}</AppText>
                      {pr.dias && pr.dias.length > 0 && (
                        <AppText variant="muted" className="text-[12px]">
                          {pr.dias.map((d) => rotuloDia(d, periodo)).join(', ')}
                        </AppText>
                      )}
                    </View>
                    {pr.batches > 1 && <Badge label={`×${pr.batches}`} />}
                    <Pressable onPress={() => removerReceita(pr.receitaId)} className="p-1">
                      <X size={16} color="#8C7B6B" />
                    </Pressable>
                  </Card>
                );
              })}
            </View>
          )}
        </View>

        {/* Grade de dias */}
        <View className="px-4 pt-2">
          <AppText variant="heading" className="text-[14px] mb-2">Dias</AppText>
          <View className="flex-row flex-wrap gap-2">
            {Array.from({ length: totalDias }, (_, i) => {
              const info = receitaDoDia(i);
              return (
                <Pressable
                  key={i}
                  onPress={() => abrirModal(i)}
                  className="rounded-card border border-border bg-surface items-center justify-center p-2"
                  style={{ width: periodo === 'semanal' ? '13%' : '12%', minWidth: 44 }}
                >
                  <AppText className="font-sans-bold text-primary text-[12px]">{rotuloDia(i, periodo)}</AppText>
                  {info && (
                    <AppText variant="muted" className="text-[10px] text-center mt-0.5" numberOfLines={1}>
                      {info.receita.nome}
                    </AppText>
                  )}
                  {info && info.porcoes > 1 && (
                    <AppText className="text-[10px] text-primary font-sans-bold">{info.porcoes}×</AppText>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Modal */}
      <Modal visible={modalAberto} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-background">
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
            <AppText variant="heading">
              {etapa === 'receitas' ? 'Escolha a receita' : etapa === 'batches' ? 'Quantas vezes?' : 'Distribuir nos dias'}
            </AppText>
            <Pressable onPress={fecharModal}>
              <X size={22} color="#8C7B6B" />
            </Pressable>
          </View>

          {etapa === 'receitas' && (
            <FlatList
              data={receitas}
              keyExtractor={(r) => r.id}
              contentContainerStyle={{ padding: 16, gap: 10 }}
              renderItem={({ item }) => (
                <Pressable onPress={() => selecionarReceita(item)}>
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

          {etapa === 'batches' && receitaSelecionada && (
            <View className="flex-1 px-4 pt-4 gap-4">
              <Card className="gap-3">
                <AppText variant="heading" className="text-[16px]">{receitaSelecionada.nome}</AppText>
                <AppText variant="muted" className="text-[13px]">Rende {receitaSelecionada.porcoes} porções por preparo</AppText>
                <View className="flex-row items-center justify-center gap-6 py-2">
                  <Pressable
                    onPress={() => setBatches((b) => Math.max(1, b - 1))}
                    className="w-10 h-10 rounded-full bg-surface border border-border items-center justify-center"
                  >
                    <Minus size={18} color="#8C7B6B" />
                  </Pressable>
                  <View className="items-center">
                    <AppText className="font-sans-bold text-[28px] text-primary w-12 text-center">{batches}</AppText>
                    <AppText variant="muted" className="text-[11px]">{batches === 1 ? 'preparo' : 'preparos'}</AppText>
                  </View>
                  <Pressable
                    onPress={() => setBatches((b) => b + 1)}
                    className="w-10 h-10 rounded-full bg-surface border border-border items-center justify-center"
                  >
                    <Plus size={18} color="#8C7B6B" />
                  </Pressable>
                </View>
                <AppText variant="muted" className="text-center text-[12px]">
                  {batches * receitaSelecionada.porcoes} porções no total
                </AppText>
              </Card>
              <Button label="Escolher dias" onPress={() => confirmarBatches(false)} />
              <Button label="Adicionar sem dia específico" variant="secondary" onPress={() => confirmarBatches(true)} />
              <Button label="Voltar" variant="secondary" onPress={() => setEtapa('receitas')} />
            </View>
          )}

          {etapa === 'dias' && receitaSelecionada && (
            <View className="flex-1">
              <View className="px-4 py-2 border-b border-border">
                <AppText variant="muted" className="text-[13px] text-center">
                  {totalPorcoesDistrib}/{totalPorcoesDisp} porções distribuídas
                  {porcoesRestantes > 0 ? ` · restam ${porcoesRestantes}` : ' · completo'}
                </AppText>
              </View>
              <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
                {Array.from({ length: totalDias }, (_, i) => {
                  const dp = diasSelecionados.find((d) => d.dia === i);
                  const qtd = dp?.porcoes ?? 0;
                  const podeAumentar = porcoesRestantes > 0;
                  return (
                    <View
                      key={i}
                      className={`flex-row items-center gap-3 px-4 py-3 rounded-card border ${qtd > 0 ? 'bg-primary/10 border-primary' : 'bg-surface border-border'}`}
                    >
                      <AppText className={`flex-1 ${qtd > 0 ? 'font-sans-bold text-primary' : ''}`}>
                        {rotuloDia(i, periodo)}
                      </AppText>
                      <View className="flex-row items-center gap-3">
                        <Pressable
                          onPress={() => setPorcoesNoDia(i, -1)}
                          disabled={qtd === 0}
                          className={`w-8 h-8 rounded-full border items-center justify-center ${qtd === 0 ? 'border-border opacity-30' : 'border-primary bg-primary/10'}`}
                        >
                          <Minus size={14} color={qtd === 0 ? '#8C7B6B' : '#6B4F3A'} />
                        </Pressable>
                        <AppText className={`w-6 text-center font-sans-bold ${qtd > 0 ? 'text-primary' : 'text-muted'}`}>{qtd}</AppText>
                        <Pressable
                          onPress={() => setPorcoesNoDia(i, 1)}
                          disabled={!podeAumentar}
                          className={`w-8 h-8 rounded-full border items-center justify-center ${!podeAumentar ? 'border-border opacity-30' : 'border-primary bg-primary/10'}`}
                        >
                          <Plus size={14} color={!podeAumentar ? '#8C7B6B' : '#6B4F3A'} />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
              <View className="px-4 pb-4 gap-2">
                <Button label={`Confirmar${diasSelecionados.length > 0 ? ` (${diasSelecionados.length} dia${diasSelecionados.length > 1 ? 's' : ''})` : ''}`} onPress={confirmarDias} />
                <Button label="Voltar" variant="secondary" onPress={() => setEtapa('batches')} />
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
