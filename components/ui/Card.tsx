import { View, ViewProps } from 'react-native';

type Props = ViewProps & { elevated?: boolean };

export function Card({ elevated = false, className = '', children, ...props }: Props) {
  return (
    <View
      className={`bg-surface rounded-card p-4 ${elevated ? 'shadow-sm' : ''} ${className}`}
      {...props}
    >
      {children}
    </View>
  );
}
