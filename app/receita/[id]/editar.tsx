import { useLocalSearchParams } from 'expo-router';
import { useReceitas } from '../../../hooks/useReceitas';
import { ReceitaForm } from '../../../components/ReceitaForm';
import { View } from 'react-native';
import { AppText } from '../../../components/ui/AppText';

export default function EditarReceitaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { receitas, editar } = useReceitas();
  const receita = receitas.find((r) => r.id === id);

  if (!receita) return <View className="flex-1 bg-background items-center justify-center"><AppText>Não encontrada</AppText></View>;

  const { id: _, criadaEm: __, ...dadosIniciais } = receita;

  return (
    <ReceitaForm
      titulo="Editar Receita"
      inicial={dadosIniciais}
      onSalvar={(dados) => editar(id, dados)}
    />
  );
}
