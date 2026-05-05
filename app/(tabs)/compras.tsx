import { View, ScrollView, Pressable, ActivityIndicator, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useMemo, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Check, Plus, X, Trash2 } from 'lucide-react-native';
import { gerarListaComprasDoPlano, useCardapio } from '../../hooks/useCardapio';
import { useMercado } from '../../hooks/useMercado';
import { useReceitas } from '../../hooks/useReceitas';
import { AppText } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { Plano } from '../../types';

export default function ComprasScreen() {
  const { receitas, carregarReceitas } = useReceitas();
  const { plano, recarregar } = useCardapio();
  const { itens: itensAvulsos, adicionarItem, removerItem, sugestoes, recarregarMercado } = useMercado();
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [novoItem, setNovoItem] = useState('');
  const [planoAtual, setPlanoAtual] = useState<Plano>(plano);

  useFocusEffect(useCallback(() => {
    let ativo = true;
    setCarregando(true);
    Promise.all([recarregar(), carregarReceitas(), recarregarMercado()]).then(([planoCarregado]) => {
      if (ativo) setPlanoAtual(planoCarregado);
    }).finally(() => {
      if (ativo) setCarregando(false);
    });
    return () => { ativo = false; };
  }, [recarregar, carregarReceitas, recarregarMercado]));

  const [marcados, setMarcados] = useState<Set<string>>(new Set());

  const planoParaLista = planoAtual.receitas.length > 0 ? planoAtual : plano;
  const itensReceitas = useMemo(() => gerarListaComprasDoPlano(planoParaLista, receitas), [receitas, planoParaLista]);
  const receitasPlanejadasSemItens = useMemo(() => (
    planoParaLista.receitas
      .map((pr) => receitas.find((r) => r.id === pr.receitaId))
      .filter((r) => r && r.ingredientes.length === 0)
  ), [planoParaLista, receitas]);
  const ingredientesSugestao = useMemo(
    () => receitas.flatMap((r) => r.ingredientes.map((ing) => ing.nome)),
    [receitas]
  );
  const sugestoesVisiveis = useMemo(
    () => sugestoes(novoItem, ingredientesSugestao),
    [sugestoes, novoItem, ingredientesSugestao]
  );
  const temItens = itensReceitas.length > 0 || itensAvulsos.length > 0;

  function toggleMarcado(chave: string) {
    setMarcados((prev) => {
      const novo = new Set(prev);
      novo.has(chave) ? novo.delete(chave) : novo.add(chave);
      return novo;
    });
  }

  function limpar() {
    setMarcados(new Set());
  }

  async function confirmarAdicionar(nome = novoItem) {
    const limpo = nome.trim();
    if (!limpo) return;
    await adicionarItem(limpo);
    setNovoItem('');
    setModalAberto(false);
  }

  function abrirModal() {
    setNovoItem('');
    setModalAberto(true);
  }

  function renderCheck(chave: string) {
    const marcado = marcados.has(chave);
    return (
      <View className={`w-6 h-6 rounded-full border-2 items-center justify-center shrink-0 ${marcado ? 'bg-accent border-accent' : 'border-border'}`}>
        {marcado && <Check size={14} color="white" />}
      </View>
    );
  }

  if (carregando) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center gap-3 px-8" edges={['bottom', 'left', 'right']}>
        <ActivityIndicator color="#8B4513" />
        <AppText variant="muted" className="text-center">Atualizando mercado...</AppText>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom', 'left', 'right']}>
      <View className="px-4 pt-3 pb-2">
        <View>
          <AppText variant="title" className="text-[24px]">Mercado</AppText>
          <AppText variant="muted" className="text-[13px]">Receitas e itens avulsos em uma lista só</AppText>
        </View>
      </View>

      {marcados.size > 0 && (
        <View className="px-4 pt-3 pb-1 flex-row justify-end">
          <Pressable onPress={limpar}>
            <AppText variant="muted" className="text-[13px]">Limpar marcados</AppText>
          </Pressable>
        </View>
      )}

      {!temItens ? (
        <View className="flex-1 items-center justify-center gap-3 px-8">
          <AppText className="text-[48px]">🛒</AppText>
          <AppText variant="heading" className="text-center">
            {planoParaLista.receitas.length > 0 ? 'Sem ingredientes' : 'Lista vazia'}
          </AppText>
          {planoParaLista.receitas.length > 0 ? (
            <AppText variant="muted" className="text-center">
              As receitas planejadas ainda não têm ingredientes cadastrados, então não há itens para somar no mercado.
            </AppText>
          ) : (
            <AppText variant="muted" className="text-center">
              Adicione receitas ao cardápio ou inclua itens avulsos para levar uma lista só ao mercado.
            </AppText>
          )}
          <Button label="Adicionar item" onPress={abrirModal} />
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 96, gap: 16 }}>
          {planoParaLista.receitas.length > 0 && itensReceitas.length === 0 && receitasPlanejadasSemItens.length > 0 && (
            <View className="bg-surface border border-border rounded-card px-4 py-3">
              <AppText variant="heading" className="text-[13px]">Receitas sem ingredientes</AppText>
              <AppText variant="muted" className="text-[12px] mt-1">
                Algumas receitas planejadas não entraram no mercado porque estão sem ingredientes.
              </AppText>
            </View>
          )}

          {itensReceitas.length > 0 && (
            <View className="gap-2">
              <AppText variant="heading" className="text-[14px]">Das receitas</AppText>
              {itensReceitas.map((item) => {
                const chave = `receita|${item.nome}|${item.unidade}`;
                const marcado = marcados.has(chave);
                return (
                  <Pressable
                    key={chave}
                    onPress={() => toggleMarcado(chave)}
                    className={`flex-row items-center gap-3 bg-surface rounded-card px-4 py-3 ${marcado ? 'opacity-50' : ''}`}
                  >
                    {renderCheck(chave)}
                    <View className="flex-1">
                      <AppText className={marcado ? 'line-through text-muted' : ''}>{item.nome}</AppText>
                      <AppText variant="muted" className="text-[12px]">{item.receitas.join(' · ')}</AppText>
                    </View>
                    <AppText variant="muted">{item.quantidade > 0 ? `${item.quantidade} ${item.unidade}` : item.unidade}</AppText>
                  </Pressable>
                );
              })}
            </View>
          )}

          {itensAvulsos.length > 0 && (
            <View className="gap-2">
              {itensReceitas.length > 0 && <View className="h-px bg-border my-1" />}
              <AppText variant="heading" className="text-[14px]">Outros itens</AppText>
              {itensAvulsos.map((item) => {
                const chave = `avulso|${item.id}`;
                const marcado = marcados.has(chave);
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => toggleMarcado(chave)}
                    className={`flex-row items-center gap-3 bg-surface rounded-card px-4 py-3 ${marcado ? 'opacity-50' : ''}`}
                  >
                    {renderCheck(chave)}
                    <View className="flex-1">
                      <AppText className={marcado ? 'line-through text-muted' : ''}>{item.nome}</AppText>
                    </View>
                    <Pressable
                      onPress={() => removerItem(item.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      className="p-1"
                    >
                      <Trash2 size={16} color="#8C7B6B" />
                    </Pressable>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      <Pressable
        onPress={abrirModal}
        className="absolute bottom-6 right-6 bg-primary w-14 h-14 rounded-full items-center justify-center"
        style={{ shadowColor: '#8B4513', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
      >
        <Plus size={24} color="white" />
      </Pressable>

      <Modal visible={modalAberto} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalAberto(false)}>
        <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom', 'left', 'right']}>
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
            <AppText variant="heading">Adicionar item</AppText>
            <Pressable onPress={() => setModalAberto(false)}>
              <X size={22} color="#8C7B6B" />
            </Pressable>
          </View>

          <View className="px-4 pt-4 gap-4">
            <View className="gap-2">
              <AppText variant="label">Item</AppText>
              <TextInput
                autoFocus
                value={novoItem}
                onChangeText={setNovoItem}
                placeholder="Ex: frango, café, papel toalha"
                placeholderTextColor="#8C7B6B"
                returnKeyType="done"
                onSubmitEditing={() => confirmarAdicionar()}
                className="bg-surface border border-border rounded-card px-4 py-3 font-sans text-[16px] text-text"
              />
            </View>

            {sugestoesVisiveis.length > 0 && (
              <View className="gap-2">
                <AppText variant="muted" className="text-[11px] uppercase">Sugestões</AppText>
                <View className="flex-row flex-wrap gap-2">
                  {sugestoesVisiveis.map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => confirmarAdicionar(s)}
                      className="bg-surface border border-border rounded-full px-4 py-2"
                    >
                      <AppText className="text-[13px]">{s}</AppText>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            <Button label="Adicionar" onPress={() => confirmarAdicionar()} />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
