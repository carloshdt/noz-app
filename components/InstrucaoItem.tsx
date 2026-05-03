import { View, Image } from 'react-native';
import { AppText } from './ui/AppText';
import { Instrucao } from '../types';

type Props = { numero: number; instrucao: Instrucao };

export function InstrucaoItem({ numero, instrucao }: Props) {
  return (
    <View className="gap-2 py-4 border-b border-border">
      <View className="flex-row gap-4">
        <View className="w-8 h-8 rounded-full bg-primary items-center justify-center shrink-0">
          <AppText className="text-white font-sans-bold text-[14px]">{numero}</AppText>
        </View>
        <AppText className="flex-1 leading-relaxed">{instrucao.texto}</AppText>
      </View>
      {instrucao.imagem ? (
        <Image
          source={{ uri: instrucao.imagem }}
          className="w-full rounded-card"
          style={{ height: 180 }}
          resizeMode="cover"
        />
      ) : null}
    </View>
  );
}
