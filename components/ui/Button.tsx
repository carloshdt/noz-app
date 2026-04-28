import { Pressable, PressableProps } from 'react-native';
import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'ghost';

type Props = PressableProps & {
  label: string;
  variant?: Variant;
  fullWidth?: boolean;
};

const base = 'rounded-card px-6 py-3 items-center justify-center';
const variants: Record<Variant, string> = {
  primary: 'bg-primary',
  secondary: 'bg-surface border border-border',
  ghost: 'bg-transparent',
};
const textVariants: Record<Variant, string> = {
  primary: 'text-white font-sans-bold',
  secondary: 'text-text font-sans-medium',
  ghost: 'text-primary font-sans-medium',
};

export function Button({ label, variant = 'primary', fullWidth, className = '', ...props }: Props) {
  return (
    <Pressable
      className={`${base} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      <AppText className={`text-[16px] ${textVariants[variant]}`}>{label}</AppText>
    </Pressable>
  );
}
