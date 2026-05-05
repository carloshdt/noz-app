import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ComentariosSheet } from '../../components/ComentariosSheet';

export default function ComentariosScreen() {
  const { id, receitaUserId } = useLocalSearchParams<{ id: string; receitaUserId?: string }>();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }} edges={['top', 'left', 'right', 'bottom']}>
      <ComentariosSheet
        receitaId={id}
        receitaUserId={receitaUserId ?? ''}
        onClose={() => router.back()}
      />
    </SafeAreaView>
  );
}
