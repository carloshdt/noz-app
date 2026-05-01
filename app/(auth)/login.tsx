import { View, Pressable, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { AppText } from '../../components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const { signInWithGoogle, signInWithApple } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const handleGoogle = async () => {
    try {
      setLoading('google');
      await signInWithGoogle();
    } catch {
      Alert.alert('Erro', 'Não foi possível entrar com Google. Tente novamente.');
    } finally {
      setLoading(null);
    }
  };

  const handleApple = async () => {
    try {
      setLoading('apple');
      await signInWithApple();
    } catch {
      Alert.alert('Erro', 'Não foi possível entrar com Apple. Tente novamente.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background items-center justify-center px-8">
      <View className="items-center mb-12">
        <AppText className="text-5xl mb-2">🌰</AppText>
        <AppText variant="title" className="text-4xl">Noz</AppText>
        <AppText variant="muted" className="text-center mt-2">
          Suas receitas, do seu jeito
        </AppText>
      </View>

      <View className="w-full gap-3">
        <Pressable
          onPress={handleGoogle}
          disabled={loading !== null}
          className="flex-row items-center justify-center bg-white border border-border rounded-xl p-4 gap-3"
        >
          {loading === 'google' ? (
            <ActivityIndicator size="small" color="#8B4513" />
          ) : (
            <AppText className="text-base font-medium text-text">
              G  Entrar com Google
            </AppText>
          )}
        </Pressable>

        <Pressable
          onPress={handleApple}
          disabled={loading !== null}
          className="flex-row items-center justify-center bg-black rounded-xl p-4 gap-3"
        >
          {loading === 'apple' ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <AppText className="text-base font-medium text-white">
              🍎  Entrar com Apple
            </AppText>
          )}
        </Pressable>

        <View className="flex-row items-center gap-3 my-2">
          <View className="flex-1 h-px bg-border" />
          <AppText variant="muted" className="text-xs">ou use seu email</AppText>
          <View className="flex-1 h-px bg-border" />
        </View>

        <Pressable onPress={() => router.push('/(auth)/login-email')}>
          <AppText className="text-center text-primary font-medium">
            Entrar com email
          </AppText>
        </Pressable>

        <Pressable onPress={() => router.push('/(auth)/cadastro')} className="mt-2">
          <AppText className="text-center text-muted">
            Não tem conta?{' '}
            <AppText className="text-primary font-medium">Criar conta</AppText>
          </AppText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
