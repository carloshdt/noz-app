import { Text, TextProps } from 'react-native';

type Variant = 'title' | 'heading' | 'body' | 'label' | 'muted';

const styles: Record<Variant, string> = {
  title: 'font-serif text-[28px] text-text leading-tight',
  heading: 'font-serif text-[20px] text-text leading-snug',
  body: 'font-sans text-[16px] text-text leading-relaxed',
  label: 'font-sans text-[13px] text-muted uppercase tracking-wide',
  muted: 'font-sans text-[14px] text-muted',
};

type Props = TextProps & { variant?: Variant };

export function AppText({ variant = 'body', className = '', ...props }: Props) {
  return <Text className={`${styles[variant]} ${className}`} {...props} />;
}
