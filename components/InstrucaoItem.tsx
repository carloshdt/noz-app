import { View } from 'react-native';
import { AppText } from './ui/AppText';

type Props = { numero: number; texto: string };

export function InstrucaoItem({ numero, texto }: Props) {
  return (
    <View className="flex-row gap-4 py-4 border-b border-border">
      <View className="w-8 h-8 rounded-full bg-primary items-center justify-center shrink-0">
        <AppText className="text-white font-sans-bold text-[14px]">{numero}</AppText>
      </View>
      <AppText className="flex-1 leading-relaxed">{texto}</AppText>
    </View>
  );
}
