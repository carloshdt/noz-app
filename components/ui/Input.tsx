import { TextInput, TextInputProps, View } from 'react-native';
import { AppText } from './AppText';

type Props = TextInputProps & { label?: string };

export function Input({ label, className = '', ...props }: Props) {
  return (
    <View className="gap-1">
      {label && <AppText variant="label">{label}</AppText>}
      <TextInput
        className={`bg-surface border border-border rounded-card px-4 py-3 font-sans text-[16px] text-text ${className}`}
        placeholderTextColor="#8C7B6B"
        {...props}
      />
    </View>
  );
}
