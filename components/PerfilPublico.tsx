import { View, Image } from 'react-native';
import { AppText } from './ui/AppText';

type Props = {
  nome: string;
  foto_url?: string;
  totalReceitas: number;
  totalImportacoes: number;
};

export function PerfilPublico({ nome, foto_url, totalReceitas, totalImportacoes }: Props) {
  const iniciais = nome
    .trim()
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <View style={{ alignItems: 'center', paddingVertical: 32, paddingHorizontal: 16 }}>
      {foto_url ? (
        <Image
          source={{ uri: foto_url }}
          style={{ width: 88, height: 88, borderRadius: 44 }}
        />
      ) : (
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: 44,
            backgroundColor: '#E8DDD4',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText style={{ fontSize: 28, color: '#8B4513', fontWeight: '700' }}>{iniciais}</AppText>
        </View>
      )}

      <AppText variant="title" style={{ marginTop: 12, fontSize: 22 }}>{nome}</AppText>

      <View style={{ flexDirection: 'row', gap: 48, marginTop: 16 }}>
        <View style={{ alignItems: 'center' }}>
          <AppText style={{ fontSize: 22, fontWeight: '700', color: '#8B4513' }}>
            {totalReceitas}
          </AppText>
          <AppText variant="muted" style={{ fontSize: 12 }}>receitas</AppText>
        </View>
        <View style={{ alignItems: 'center' }}>
          <AppText style={{ fontSize: 22, fontWeight: '700', color: '#8B4513' }}>
            {totalImportacoes}
          </AppText>
          <AppText variant="muted" style={{ fontSize: 12 }}>importações</AppText>
        </View>
      </View>
    </View>
  );
}
