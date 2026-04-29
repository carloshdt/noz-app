import { View } from 'react-native';
import { AppText } from './ui/AppText';
import { Ingrediente } from '../types';

export function IngredienteItem({ ingrediente }: { ingrediente: Ingrediente }) {
  return (
    <View className="flex-row items-center py-3 border-b border-border">
      <View className="w-2 h-2 rounded-full bg-accent mr-3" />
      <AppText className="flex-1">{ingrediente.nome}</AppText>
      <AppText variant="muted">{ingrediente.quantidade} {ingrediente.unidade}</AppText>
    </View>
  );
}
