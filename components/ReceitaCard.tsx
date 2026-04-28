import { Pressable, View, Image } from 'react-native';
import { AppText } from './ui/AppText';
import { Badge } from './ui/Badge';
import { Clock } from 'lucide-react-native';
import { Receita } from '../types';

type Props = {
  receita: Receita;
  onPress: () => void;
};

export function ReceitaCard({ receita, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-surface rounded-card overflow-hidden flex-1 mx-1 mb-3"
      style={{ shadowColor: '#2C1810', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}
    >
      <View className="aspect-[4/3] bg-border w-full">
        {receita.imagem ? (
          <Image source={{ uri: receita.imagem }} className="w-full h-full" resizeMode="cover" />
        ) : (
          <View className="w-full h-full items-center justify-center">
            <AppText className="text-[32px]">🍽</AppText>
          </View>
        )}
      </View>
      <View className="p-3 gap-2">
        <AppText variant="heading" className="text-[16px]" numberOfLines={2}>
          {receita.nome}
        </AppText>
        <View className="flex-row items-center gap-1">
          <Clock size={12} color="#8C7B6B" />
          <AppText variant="muted" className="text-[12px]">{receita.tempoPreparo} min</AppText>
        </View>
        <Badge label={receita.dificuldade} variant={receita.dificuldade === 'Fácil' ? 'accent' : 'default'} />
      </View>
    </Pressable>
  );
}
