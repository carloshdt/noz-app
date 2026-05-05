import { Stack, router } from 'expo-router';
import { useFonts, Lora_600SemiBold, Lora_700Bold } from '@expo-google-fonts/lora';
import { Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import '../global.css';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(auth)/login');
    }
  }, [user, loading]);

  if (loading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="receita/nova" options={{ presentation: 'modal' }} />
      <Stack.Screen name="receita/[id]/index" />
      <Stack.Screen name="receita/[id]/editar" options={{ presentation: 'modal' }} />
      <Stack.Screen name="perfil/editar" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="planejamento/index" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="perfil/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="comentarios/[id]" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Lora_600SemiBold,
    Lora_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <AuthProvider>
      <SafeAreaProvider>
        <StatusBar style="dark" backgroundColor="#FAF6F1" translucent={false} />
        <RootNavigator />
      </SafeAreaProvider>
    </AuthProvider>
  );
}
