import { View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { X, Trash2 } from 'lucide-react-native';
import { router } from 'expo-router';
import { Receita, Ingrediente, Dificuldade } from '../types';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { AppText } from './ui/AppText';
import { CATEGORIAS } from '../constants/categorias';
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
  categoria: 'Carnes',
  tempoPreparo: 30,
  porcoes: 4,
  dificuldade: 'Fácil',
  ingredientes: [],
  instrucoes: [],
});

export function ReceitaForm({ inicial, onSalvar, titulo }: Props) {
  const [form, setForm] = useState<FormData>(inicial ?? formVazio());
  const [novoIng, setNovoIng] = useState({ nome: '', quantidade: '', unidade: '' });
  const [novaInst, setNovaInst] = useState('');

  function adicionarIngrediente() {
    if (!novoIng.nome || !novoIng.quantidade) return;
    const ing: Ingrediente = {
      nome: novoIng.nome,
      quantidade: parseFloat(novoIng.quantidade),
      unidade: novoIng.unidade || 'un',
    };
    setForm((f) => ({ ...f, ingredientes: [...f.ingredientes, ing] }));
    setNovoIng({ nome: '', quantidade: '', unidade: '' });
  }

  function removerIngrediente(index: number) {
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
    if (!form.nome.trim()) return;
    onSalvar(form);
    router.back();
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <AppText variant="heading">{titulo}</AppText>
        <Pressable onPress={() => router.back()}>
          <X size={22} color="#8C7B6B" />
        </Pressable>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingVertical: 16, gap: 20 }}>
        <Input label="Nome da receita" value={form.nome} onChangeText={(v) => setForm((f) => ({ ...f, nome: v }))} placeholder="Ex: Frango ao curry" />

        <View className="gap-2">
          <AppText variant="label">Categoria</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {CATEGORIAS.filter((c) => c !== 'Todas').map((cat) => (
              <CategoriaChip key={cat} label={cat} ativo={form.categoria === cat} onPress={() => setForm((f) => ({ ...f, categoria: cat }))} />
            ))}
          </ScrollView>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Input label="Tempo (min)" value={String(form.tempoPreparo)} onChangeText={(v) => setForm((f) => ({ ...f, tempoPreparo: parseInt(v) || 0 }))} keyboardType="numeric" />
          </View>
          <View className="flex-1">
            <Input label="Porções" value={String(form.porcoes)} onChangeText={(v) => setForm((f) => ({ ...f, porcoes: parseInt(v) || 1 }))} keyboardType="numeric" />
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

        <View className="gap-3">
          <AppText variant="heading" className="text-[18px]">Ingredientes</AppText>
          {form.ingredientes.map((ing, i) => (
            <View key={i} className="flex-row items-center gap-2 bg-surface rounded-card px-3 py-2">
              <AppText className="flex-1">{ing.nome}</AppText>
              <AppText variant="muted">{ing.quantidade} {ing.unidade}</AppText>
              <Pressable onPress={() => removerIngrediente(i)}>
                <Trash2 size={16} color="#8C7B6B" />
              </Pressable>
            </View>
          ))}
          <View className="gap-2">
            <View className="flex-row gap-2">
              <View className="flex-1"><Input placeholder="Nome" value={novoIng.nome} onChangeText={(v) => setNovoIng((n) => ({ ...n, nome: v }))} /></View>
              <View className="w-20"><Input placeholder="Qtd" value={novoIng.quantidade} onChangeText={(v) => setNovoIng((n) => ({ ...n, quantidade: v }))} keyboardType="numeric" /></View>
              <View className="w-20"><Input placeholder="Un" value={novoIng.unidade} onChangeText={(v) => setNovoIng((n) => ({ ...n, unidade: v }))} /></View>
            </View>
            <Button label="Adicionar ingrediente" variant="secondary" onPress={adicionarIngrediente} />
          </View>
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
    </SafeAreaView>
  );
}
