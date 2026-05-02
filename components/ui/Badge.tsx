import { View } from 'react-native';
import { AppText } from './AppText';

type Variant = 'default' | 'accent' | 'primary';

const variants: Record<Variant, { bg: string; text: string }> = {
  default: { bg: 'bg-border', text: 'text-muted' },
  accent: { bg: 'bg-accent/20', text: 'text-accent' },
  primary: { bg: 'bg-primary/15', text: 'text-primary' },
};

type Props = { label: string; variant?: Variant };

export function Badge({ label, variant = 'default' }: Props) {
  const { bg, text } = variants[variant];
  return (
    <View className={`${bg} rounded-full px-2 py-0.5`}>
      <AppText className={`font-sans text-[11px] ${text}`}>{label}</AppText>
    </View>
  );
}
