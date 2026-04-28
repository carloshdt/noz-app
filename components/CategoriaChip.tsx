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
      className={`px-4 py-2 rounded-full mr-2 ${ativo ? 'bg-primary' : 'bg-surface border border-border'}`}
    >
      <AppText className={`text-[14px] font-sans-medium ${ativo ? 'text-white' : 'text-text'}`}>
        {label}
      </AppText>
    </Pressable>
  );
}
