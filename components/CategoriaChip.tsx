import { Pressable } from 'react-native';
import { AppText } from './ui/AppText';

type Props = {
  label: string;
  ativo: boolean;
  onPress: () => void;
};

export function CategoriaChip({ label, ativo, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className={`px-2.5 py-0.5 rounded-full mr-1.5 ${ativo ? 'bg-primary' : 'bg-surface border border-border'}`}
    >
      <AppText className={`text-[11px] font-sans-medium ${ativo ? 'text-white' : 'text-text'}`}>
        {label}
      </AppText>
    </Pressable>
  );
}
