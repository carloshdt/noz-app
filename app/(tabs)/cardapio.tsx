import { View, ScrollView, Pressable, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useMemo, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { Plus, X, Minus, Pencil } from 'lucide-react-native';
import { Receita, PlanoReceita, PeriodoPlanejamento, DiaPorcao } from '../../types';
import { useCardapio } from '../../hooks/useCardapio';
import { useConfiguracao } from '../../hooks/useConfiguracao';
import { useReceitas } from '../../hooks/useReceitas';
import { AppText } from '../../components/ui/AppText';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

const NOMES_DIA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const TOTAL_DIAS: Record<PeriodoPlanejamento, number> = { semanal: 7, quinzenal: 14, mensal: 30 };

function obterDatasDoPerio(periodo: PeriodoPlanejamento, diaInicio: 'seg' | 'dom'): Date[] {
  const hoje = new Date();
  const dow = hoje.getDay(); // 0=Dom ... 6=Sáb
  const offset = diaInicio === 'seg' ? (dow === 0 ? 6 : dow - 1) : dow;
  const inicio = new Date(hoje);
  inicio.setDate(hoje.getDate() - offset);
  inicio.setHours(0, 0, 0, 0);
  return Array.from({ length: TOTAL_DIAS[periodo] }, (_, i) => {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    return d;
  });
}

function rotuloDia(data: Date): string {
  return `${data.getDate()} ${NOMES_DIA[data.getDay()]}`;
}

type Etapa = 'receitas' | 'batches' | 'dias';
type Visualizacao = 'receitas' | 'dias';

export default function CardapioScreen() {
  const { plano, adicionarReceita, editarDiasReceita, removerReceita, limpar } = useCardapio();
  const { periodo, diaInicio, recarregar } = useConfiguracao();
  const { receitas, carregarReceitas } = useReceitas();

  useFocusEffect(useCallback(() => {
    recarregar();
    carregarReceitas();
  }, [recarregar, carregarReceitas]));

  const [modalAberto, setModalAberto] = useState(false);
  const [receitaSelecionada, setReceitaSelecionada] = useState<Receita | null>(null);
  const [batches, setBatches] = useState(1);
  const [diasSelecionados, setDiasSelecionados] = useState<DiaPorcao[]>([]);
  const [etapa, setEtapa] = useState<Etapa>('receitas');
  const [visualizacao, setVisualizacao] = useState<Visualizacao>('receitas');
  const [editandoTipo, setEditandoTipo] = useState<'comDias' | 'semDias' | null>(null);
  const [editandoReceitaId, setEditandoReceitaId] = useState<string | null>(null);

  const datas = useMemo(() => obterDatasDoPerio(periodo, diaInicio), [periodo, diaInicio]);

  function abrirModal(dia?: number) {
    setReceitaSelecionada(null);
    setBatches(1);
    setDiasSelecionados(dia !== undefined ? [{ dia, porcoes: 1 }] : []);
    setEtapa('receitas');
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setReceitaSelecionada(null);
    setEditandoTipo(null);
    setEditandoReceitaId(null);
  }

  function editarReceita(pr: PlanoReceita, r: Receita, tipo: 'comDias' | 'semDias') {
    setReceitaSelecionada(r);
    setEditandoTipo(tipo);
    setEditandoReceitaId(pr.receitaId);
    if (tipo === 'comDias') {
      setBatches(pr.batches || 1);
      setDiasSelecionados(pr.dias ?? []);
    } else {
      setBatches(pr.batchesSemDias ?? 1);
      setDiasSelecionados([]);
    }
    setEtapa('dias');
    setModalAberto(true);
  }

  function selecionarReceita(r: Receita) {
    setReceitaSelecionada(r);
    setBatches(1);
    setDiasSelecionados([]);
    setEtapa('batches');
  }

  function confirmarBatches(semDia: boolean) {
    if (semDia) {
      if (editandoTipo) {
        editarDiasReceita(editandoReceitaId!, batches, undefined, editandoTipo);
      } else {
        adicionarReceita(receitaSelecionada!.id, batches, undefined);
      }
      fecharModal();
    } else {
      setEtapa('dias');
    }
  }

  const totalPorcoesDisp = receitaSelecionada ? batches * receitaSelecionada.porcoes : 0;
  const totalPorcoesDistrib = diasSelecionados.reduce((s, d) => s + d.porcoes, 0);
  const porcoesRestantes = totalPorcoesDisp - totalPorcoesDistrib;
  const batchesMinimosParaDias = receitaSelecionada
    ? Math.max(1, Math.ceil(totalPorcoesDistrib / receitaSelecionada.porcoes))
    : 1;

  function setPorcoesNoDia(dia: number, delta: number) {
    setDiasSelecionados((prev) => {
      const restantes = totalPorcoesDisp - prev.reduce((s, d) => s + d.porcoes, 0);
      const existe = prev.find((d) => d.dia === dia);
      if (!existe) {
        if (delta > 0 && restantes > 0) return [...prev, { dia, porcoes: 1 }];
        return prev;
      }
      const novas = existe.porcoes + delta;
      if (novas <= 0) return prev.filter((d) => d.dia !== dia);
      if (delta > 0 && restantes <= 0) return prev;
      return prev.map((d) => d.dia === dia ? { ...d, porcoes: novas } : d);
    });
  }

  function confirmarDias() {
    const dias = diasSelecionados.length > 0 ? diasSelecionados : undefined;
    if (editandoTipo) {
      editarDiasReceita(editandoReceitaId!, batches, dias, editandoTipo);
    } else {
      adicionarReceita(receitaSelecionada!.id, batches, dias);
    }
    fecharModal();
  }

  function receitasDoDia(dia: number): { receita: Receita; porcoes: number }[] {
    return plano.receitas
      .filter((pr) => pr.dias?.some((d) => d.dia === dia))
      .flatMap((pr) => {
        const receita = receitas.find((r) => r.id === pr.receitaId);
        if (!receita) return [];
        const porcoes = pr.dias?.find((d) => d.dia === dia)?.porcoes ?? 1;
        return [{ receita, porcoes }];
      });
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="px-4 pt-4 gap-4">
          <View className="gap-1">
            <AppText variant="title">Monte seu cardápio</AppText>
            <AppText variant="muted" className="text-[13px]">
              Planeje suas receitas por preparo ou por dia
            </AppText>
          </View>
          <View className="flex-row rounded-card bg-surface border border-border p-1">
            {([
              { label: 'Receitas', value: 'receitas' },
              { label: 'Dias', value: 'dias' },
            ] as const).map((item) => {
              const ativo = visualizacao === item.value;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => setVisualizacao(item.value)}
                  className={`flex-1 h-10 rounded-card items-center justify-center ${ativo ? 'bg-primary' : ''}`}
                >
                  <AppText className={`font-sans-medium text-[13px] ${ativo ? 'text-white' : 'text-muted'}`}>
                    {item.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
        {/* Receitas do período */}
        {visualizacao === 'receitas' && (
        <View className="px-4 pt-4 pb-2">
          <View className="flex-row justify-between items-center mb-2">
            <AppText variant="heading" className="text-[14px]">Receitas planejadas</AppText>
            <Pressable onPress={limpar}>
              <AppText variant="muted" className="text-[13px]">Limpar</AppText>
            </Pressable>
          </View>

          {plano.receitas.length === 0 ? (
            <View className="flex-1 items-center justify-center gap-2 py-20">
              <AppText variant="muted">Nenhuma receita planejada</AppText>
              <AppText variant="muted" className="text-[13px]">Toque no + para adicionar</AppText>
            </View>
          ) : (
            <View className="gap-2">
              {plano.receitas.flatMap((pr) => {
                const r = receitas.find((x) => x.id === pr.receitaId);
                if (!r) return [];
                const cards = [];
                if (pr.dias && pr.dias.length > 0) {
                  cards.push(
                    <Card key={`${pr.receitaId}-dias`} className="flex-row items-center gap-3">
                      <View className="flex-1">
                        <AppText variant="heading" className="text-[14px]">{r.nome}</AppText>
                        <AppText variant="muted" className="text-[12px]">
                          {`Dias definidos · ${pr.batches * r.porcoes} porções`}
                        </AppText>
                      </View>
                      <Pressable onPress={() => editarReceita(pr, r, 'comDias')} className="p-1">
                        <Pencil size={15} color="#8C7B6B" />
                      </Pressable>
                      <Pressable onPress={() => removerReceita(pr.receitaId)} className="p-1">
                        <X size={16} color="#8C7B6B" />
                      </Pressable>
                    </Card>
                  );
                }
                if ((pr.batchesSemDias ?? 0) > 0) {
                  cards.push(
                    <Card key={`${pr.receitaId}-semDias`} className="flex-row items-center gap-3">
                      <View className="flex-1">
                        <AppText variant="heading" className="text-[14px]">{r.nome}</AppText>
                        <AppText variant="muted" className="text-[12px]">
                          {`Sem dias definidos · ${pr.batchesSemDias! * r.porcoes} porções`}
                        </AppText>
                      </View>
                      <Pressable onPress={() => editarReceita(pr, r, 'semDias')} className="p-1">
                        <Pencil size={15} color="#8C7B6B" />
                      </Pressable>
                      <Pressable onPress={() => removerReceita(pr.receitaId)} className="p-1">
                        <X size={16} color="#8C7B6B" />
                      </Pressable>
                    </Card>
                  );
                }
                if (cards.length === 0) {
                  cards.push(
                    <Card key={pr.receitaId} className="flex-row items-center gap-3">
                      <View className="flex-1">
                        <AppText variant="heading" className="text-[14px]">{r.nome}</AppText>
                        <AppText variant="muted" className="text-[12px]">Sem dias definidos</AppText>
                      </View>
                      <Pressable onPress={() => removerReceita(pr.receitaId)} className="p-1">
                        <X size={16} color="#8C7B6B" />
                      </Pressable>
                    </Card>
                  );
                }
                return cards;
              })}
            </View>
          )}
        </View>
        )}

        {/* Lista de dias */}
        {visualizacao === 'dias' && (
        <View className="px-4 pt-4">
          <AppText variant="heading" className="text-[14px] mb-2">Cardápio por dia</AppText>
          {Array.from({ length: Math.ceil(datas.length / 7) }, (_, semana) => {
            const inicio = semana * 7;
            const diasDaSemana = datas.slice(inicio, inicio + 7);
            return (
              <View key={semana} className="mb-4">
                {datas.length > 7 && (
                  <AppText variant="muted" className="text-[11px] uppercase tracking-wider mb-2">
                    {`Semana ${semana + 1}  ·  ${diasDaSemana[0].getDate()} ${NOMES_DIA[diasDaSemana[0].getDay()]} – ${diasDaSemana[diasDaSemana.length - 1].getDate()} ${NOMES_DIA[diasDaSemana[diasDaSemana.length - 1].getDay()]}`}
                  </AppText>
                )}
                <View className="gap-2">
                  {diasDaSemana.map((data, j) => {
                    const i = inicio + j;
                    const infos = receitasDoDia(i);
                    return (
                      <Pressable
                        key={i}
                        onPress={() => abrirModal(i)}
                        className={`flex-row items-center gap-3 rounded-card border px-4 py-3 ${infos.length > 0 ? 'border-primary/30 bg-primary/5' : 'border-border bg-surface'}`}
                      >
                        <View className="items-center shrink-0" style={{ width: 44 }}>
                          <View className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center">
                            <AppText className="font-sans-bold text-primary text-[15px]">{data.getDate()}</AppText>
                          </View>
                          <AppText className="text-primary text-[10px] mt-0.5">{NOMES_DIA[data.getDay()]}</AppText>
                        </View>
                        <View className="flex-1 gap-0.5">
                          {infos.length > 0 ? infos.map(({ receita, porcoes }) => (
                            <View key={receita.id}>
                              <AppText variant="heading" className="text-[14px]">{receita.nome}</AppText>
                              <AppText variant="muted" className="text-[12px]">
                                {porcoes} porção{porcoes > 1 ? 's' : ''}
                              </AppText>
                            </View>
                          )) : (
                            <AppText variant="muted" className="text-[13px]">Sem receita</AppText>
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
        )}
      </ScrollView>

      <Pressable
        onPress={() => abrirModal()}
        className="absolute bottom-6 right-6 bg-primary w-14 h-14 rounded-full items-center justify-center"
        style={{ shadowColor: '#8B4513', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
      >
        <Plus size={24} color="white" />
      </Pressable>

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
              {editandoTipo === 'semDias' ? (
                <>
                  <Button label="Confirmar" onPress={() => confirmarBatches(true)} />
                  <Button label="Cancelar" variant="secondary" onPress={fecharModal} />
                </>
              ) : (
                <>
                  <Button label="Escolher dias" onPress={() => confirmarBatches(false)} />
                  <Button label="Adicionar sem dia específico" variant="secondary" onPress={() => confirmarBatches(true)} />
                  {!editandoTipo && <Button label="Voltar" variant="secondary" onPress={() => setEtapa('receitas')} />}
                </>
              )}
            </View>
          )}

          {etapa === 'dias' && receitaSelecionada && (
            <View className="flex-1">
              <View className="px-4 py-3 border-b border-border gap-3">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <AppText variant="heading" className="text-[14px]" numberOfLines={1}>{receitaSelecionada.nome}</AppText>
                    <AppText variant="muted" className="text-[12px]">Rende {receitaSelecionada.porcoes} porções por preparo</AppText>
                  </View>
                  <View className="flex-row items-center gap-3">
                    <Pressable
                      onPress={() => setBatches((b) => Math.max(batchesMinimosParaDias, b - 1))}
                      disabled={batches <= batchesMinimosParaDias}
                      className={`w-8 h-8 rounded-full border items-center justify-center ${batches <= batchesMinimosParaDias ? 'border-border opacity-30' : 'border-primary bg-primary/10'}`}
                    >
                      <Minus size={14} color={batches <= batchesMinimosParaDias ? '#8C7B6B' : '#6B4F3A'} />
                    </Pressable>
                    <View className="items-center">
                      <AppText className="font-sans-bold text-[20px] text-primary w-8 text-center">{batches}</AppText>
                      <AppText variant="muted" className="text-[10px]">{batches === 1 ? 'preparo' : 'preparos'}</AppText>
                    </View>
                    <Pressable
                      onPress={() => setBatches((b) => b + 1)}
                      className="w-8 h-8 rounded-full border border-primary bg-primary/10 items-center justify-center"
                    >
                      <Plus size={14} color="#6B4F3A" />
                    </Pressable>
                  </View>
                </View>
                <AppText variant="muted" className="text-[13px] text-center">
                  {totalPorcoesDistrib}/{totalPorcoesDisp} porções distribuídas
                  {porcoesRestantes > 0 ? ` · restam ${porcoesRestantes}` : ' · completo'}
                </AppText>
              </View>
              <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
                {datas.map((data, i) => {
                  const dp = diasSelecionados.find((d) => d.dia === i);
                  const qtd = dp?.porcoes ?? 0;
                  const podeAumentar = porcoesRestantes > 0;
                  return (
                    <View
                      key={i}
                      className={`flex-row items-center gap-3 px-4 py-3 rounded-card border ${qtd > 0 ? 'bg-primary/10 border-primary' : 'bg-surface border-border'}`}
                    >
                      <AppText className={`flex-1 ${qtd > 0 ? 'font-sans-bold text-primary' : ''}`}>
                        {rotuloDia(data)}
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
