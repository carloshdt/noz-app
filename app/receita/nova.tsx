import { useReceitas } from '../../hooks/useReceitas';
import { ReceitaForm } from '../../components/ReceitaForm';

export default function NovaReceitaScreen() {
  const { adicionar } = useReceitas();
  return <ReceitaForm titulo="Nova Receita" onSalvar={adicionar} />;
}
