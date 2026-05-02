import { View, ScrollView, Pressable, Modal, FlatList, Keyboard, KeyboardAvoidingView, Platform, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useRef } from 'react';
import { X, Trash2, ChevronDown } from 'lucide-react-native';
import { router } from 'expo-router';
import { Receita, Ingrediente, Dificuldade } from '../types';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { AppText } from './ui/AppText';
import { CATEGORIAS } from '../constants/categorias';
import { UNIDADES, UNIDADES_NOMES } from '../constants/unidades';
import { CategoriaChip } from './CategoriaChip';

type FormData = Omit<Receita, 'id' | 'criadaEm'>;

type Props = {
  inicial?: FormData;
  onSalvar: (dados: FormData) => void;
  titulo: string;
};

const DIFICULDADES: Dificuldade[] = ['Fácil', 'Médio', 'Difícil'];

const formVazio = (): FormData => ({
  nome: '',
  categorias: ['Carnes'],
  tempoPreparo: 30,
  porcoes: 4,
  dificuldade: 'Fácil',
  ingredientes: [],
  instrucoes: [],
});

export function ReceitaForm({ inicial, onSalvar, titulo }: Props) {
  const [form, setForm] = useState<FormData>(inicial ?? formVazio());
  const [novoIng, setNovoIng] = useState({ nome: '', quantidade: '', unidade: 'g' });
  const [editandoIngIndex, setEditandoIngIndex] = useState<number | null>(null);
  const nomeIngRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);
  const ingSecaoY = useRef(0);
  const adicionarBtnLocalY = useRef(0);
  const [modalUnidade, setModalUnidade] = useState(false);
  const [novaInst, setNovaInst] = useState('');

  const semQuantidade = (u: string) => u === 'a gosto' || u === 'pitada';

  function adicionarIngrediente() {
    if (!novoIng.nome) return;
    if (!semQuantidade(novoIng.unidade) && !novoIng.quantidade) return;
    const ing: Ingrediente = {
      nome: novoIng.nome,
      quantidade: semQuantidade(novoIng.unidade) ? 0 : parseFloat(novoIng.quantidade),
      unidade: novoIng.unidade || 'g',
    };
    if (editandoIngIndex !== null) {
      setForm((f) => {
        const lista = [...f.ingredientes];
        lista[editandoIngIndex] = ing;
        return { ...f, ingredientes: lista };
      });
      setEditandoIngIndex(null);
    } else {
      setForm((f) => ({ ...f, ingredientes: [...f.ingredientes, ing] }));
    }
    setNovoIng({ nome: '', quantidade: '', unidade: 'g' });
    if (editandoIngIndex !== null) {
      Keyboard.dismiss();
    } else {
      setTimeout(() => {
        nomeIngRef.current?.focus();
        scrollRef.current?.scrollTo({ y: ingSecaoY.current + adicionarBtnLocalY.current - 80, animated: true });
      }, 100);
    }
  }

  function editarIngrediente(index: number) {
    const ing = form.ingredientes[index];
    setNovoIng({
      nome: ing.nome,
      quantidade: semQuantidade(ing.unidade) ? '' : String(ing.quantidade),
      unidade: ing.unidade,
    });
    setEditandoIngIndex(index);
  }

  function removerIngrediente(index: number) {
    if (editandoIngIndex === index) { setEditandoIngIndex(null); setNovoIng({ nome: '', quantidade: '', unidade: 'g' }); }
    setForm((f) => ({ ...f, ingredientes: f.ingredientes.filter((_, i) => i !== index) }));
  }

  function adicionarInstrucao() {
    if (!novaInst.trim()) return;
    setForm((f) => ({ ...f, instrucoes: [...f.instrucoes, novaInst.trim()] }));
    setNovaInst('');
  }

  function removerInstrucao(index: number) {
    setForm((f) => ({ ...f, instrucoes: f.instrucoes.filter((_, i) => i !== index) }));
  }

  function salvar() {
    if (!form.nome.trim()) {
      Alert.alert('Atenção', 'Dê um nome para a receita antes de salvar.');
      return;
    }
    const dadosFinais = novaInst.trim()
      ? { ...form, instrucoes: [...form.instrucoes, novaInst.trim()] }
      : form;
    onSalvar(dadosFinais);
    router.back();
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <AppText variant="heading">{titulo}</AppText>
        <Pressable onPress={() => router.back()}>
          <X size={22} color="#8C7B6B" />
        </Pressable>
      </View>

      <ScrollView ref={scrollRef} className="flex-1 px-4" contentContainerStyle={{ paddingVertical: 16, gap: 20 }} keyboardShouldPersistTaps="handled">
        <Input label="Nome da receita" value={form.nome} onChangeText={(v) => setForm((f) => ({ ...f, nome: v }))} placeholder="Ex: Frango ao curry" />

        <View className="gap-2">
          <AppText variant="label">Categoria</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {CATEGORIAS.filter((c) => c !== 'Todas').map((cat) => (
              <CategoriaChip
                key={cat}
                label={cat}
                ativo={form.categorias.includes(cat)}
                onPress={() => setForm((f) => {
                  const lista = f.categorias.includes(cat)
                    ? f.categorias.filter((c) => c !== cat)
                    : [...f.categorias, cat];
                  return { ...f, categorias: lista.length > 0 ? lista : [cat] };
                })}
              />
            ))}
          </ScrollView>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Input label="Tempo (min)" value={form.tempoPreparo === 0 ? '' : String(form.tempoPreparo)} onChangeText={(v) => setForm((f) => ({ ...f, tempoPreparo: parseInt(v) || 0 }))} keyboardType="numeric" placeholder="0" />
          </View>
          <View className="flex-1">
            <Input label="Porções" value={form.porcoes === 0 ? '' : String(form.porcoes)} onChangeText={(v) => setForm((f) => ({ ...f, porcoes: parseInt(v) || 0 }))} keyboardType="numeric" placeholder="0" />
          </View>
        </View>

        <View className="gap-2">
          <AppText variant="label">Dificuldade</AppText>
          <View className="flex-row gap-2">
            {DIFICULDADES.map((d) => (
              <CategoriaChip key={d} label={d} ativo={form.dificuldade === d} onPress={() => setForm((f) => ({ ...f, dificuldade: d }))} />
            ))}
          </View>
        </View>

        <View className="gap-3" onLayout={(e) => { ingSecaoY.current = e.nativeEvent.layout.y; }}>
          <AppText variant="heading" className="text-[18px]">Ingredientes</AppText>
          {form.ingredientes.map((ing, i) =>
            editandoIngIndex === i ? (
              <View key={i} className="bg-primary/10 border border-primary/30 rounded-card px-3 py-2 gap-2">
                <View className="flex-row gap-2">
                  <View className="flex-1"><Input placeholder="Nome" value={novoIng.nome} onChangeText={(v) => setNovoIng((n) => ({ ...n, nome: v }))} /></View>
                  {!semQuantidade(novoIng.unidade) && (
                    <View className="w-20"><Input placeholder="Qtd" value={novoIng.quantidade} onChangeText={(v) => setNovoIng((n) => ({ ...n, quantidade: v }))} keyboardType="numeric" /></View>
                  )}
                  <Pressable
                    onPress={() => setModalUnidade(true)}
                    className="border border-border rounded-card bg-surface px-2 justify-center"
                    style={{ height: 44, minWidth: 72, maxWidth: 100 }}
                  >
                    <View className="flex-row items-center justify-between">
                      <AppText className="text-[12px]" numberOfLines={1}>{novoIng.unidade || 'Unid.'}</AppText>
                      <ChevronDown size={14} color="#8C7B6B" />
                    </View>
                  </Pressable>
                </View>
                <View className="flex-row gap-2">
                  <View className="flex-1"><Button label="Salvar" onPress={adicionarIngrediente} /></View>
                  <View className="flex-1"><Button label="Cancelar" variant="secondary" onPress={() => { setEditandoIngIndex(null); setNovoIng({ nome: '', quantidade: '', unidade: 'g' }); Keyboard.dismiss(); }} /></View>
                </View>
              </View>
            ) : (
              <Pressable key={i} onPress={() => editarIngrediente(i)}
                className="flex-row items-center gap-2 bg-surface rounded-card px-3 py-2">
                <AppText className="flex-1">{ing.nome}</AppText>
                <AppText variant="muted">{semQuantidade(ing.unidade) ? ing.unidade : `${ing.quantidade} ${ing.unidade}`}</AppText>
                <Pressable onPress={() => removerIngrediente(i)}>
                  <Trash2 size={16} color="#8C7B6B" />
                </Pressable>
              </Pressable>
            )
          )}
          {editandoIngIndex === null && (
            <View className="gap-2">
              <View className="flex-row gap-2">
                <View className="flex-1"><Input ref={nomeIngRef} placeholder="Nome" value={novoIng.nome} onChangeText={(v) => setNovoIng((n) => ({ ...n, nome: v }))} /></View>
                {!semQuantidade(novoIng.unidade) && (
                  <View className="w-20"><Input placeholder="Qtd" value={novoIng.quantidade} onChangeText={(v) => setNovoIng((n) => ({ ...n, quantidade: v }))} keyboardType="numeric" /></View>
                )}
                <Pressable
                  onPress={() => setModalUnidade(true)}
                  className="border border-border rounded-card bg-surface px-2 justify-center"
                  style={{ height: 44, minWidth: 72, maxWidth: 100 }}
                >
                  <View className="flex-row items-center justify-between">
                    <AppText className="text-[12px]" numberOfLines={1}>{novoIng.unidade || 'Unid.'}</AppText>
                    <ChevronDown size={14} color="#8C7B6B" />
                  </View>
                </Pressable>
              </View>
              <View onLayout={(e) => { adicionarBtnLocalY.current = e.nativeEvent.layout.y; }}>
                <Button label="Adicionar ingrediente" variant="secondary" onPress={adicionarIngrediente} />
              </View>
            </View>
          )}
        </View>

        <View className="gap-3">
          <AppText variant="heading" className="text-[18px]">Modo de Preparo</AppText>
          {form.instrucoes.map((inst, i) => (
            <View key={i} className="flex-row items-start gap-2 bg-surface rounded-card px-3 py-2">
              <AppText className="text-primary font-sans-bold w-5">{i + 1}.</AppText>
              <AppText className="flex-1">{inst}</AppText>
              <Pressable onPress={() => removerInstrucao(i)}>
                <Trash2 size={16} color="#8C7B6B" />
              </Pressable>
            </View>
          ))}
          <View className="gap-2">
            <Input placeholder="Descreva o passo..." value={novaInst} onChangeText={setNovaInst} multiline />
            <Button label="Adicionar passo" variant="secondary" onPress={adicionarInstrucao} />
          </View>
        </View>

        <View className="pb-8">
          <Button label="Salvar receita" onPress={salvar} fullWidth />
        </View>
      </ScrollView>

      <Modal visible={modalUnidade} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalUnidade(false)}>
        <SafeAreaView className="flex-1 bg-background">
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
            <AppText variant="heading">Unidade</AppText>
            <Pressable onPress={() => setModalUnidade(false)}>
              <X size={22} color="#8C7B6B" />
            </Pressable>
          </View>
          <FlatList
            data={UNIDADES}
            keyExtractor={(u) => u}
            contentContainerStyle={{ padding: 8 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => { setNovoIng((n) => ({ ...n, unidade: item })); setModalUnidade(false); }}
                className={`px-4 py-4 rounded-card mb-1 ${novoIng.unidade === item ? 'bg-primary/10' : ''}`}
              >
                <AppText className={novoIng.unidade === item ? 'text-primary font-sans-bold' : ''}>{UNIDADES_NOMES[item] ?? item}</AppText>
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
