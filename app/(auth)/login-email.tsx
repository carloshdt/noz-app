import { View, Alert, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { AppText } from '../../components/ui/AppText';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginEmailScreen() {
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !senha.trim()) {
      Alert.alert('Atenção', 'Preencha email e senha.');
      return;
    }
    try {
      setLoading(true);
      await signInWithEmail(email.trim(), senha);
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Email ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background px-6 pt-8">
      <Pressable onPress={() => router.back()} className="mb-8">
        <AppText className="text-primary">← Voltar</AppText>
      </Pressable>

      <AppText variant="title" className="mb-8">Entrar</AppText>

      <View className="gap-4">
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="seu@email.com"
        />

        <Input
          label="Senha"
          value={senha}
          onChangeText={setSenha}
          secureTextEntry
          placeholder="••••••••"
        />

        <Pressable onPress={() => router.push('/(auth)/esqueci-senha')} className="self-end">
          <AppText className="text-primary text-sm">Esqueci minha senha</AppText>
        </Pressable>

        <Button
          label={loading ? 'Entrando...' : 'Entrar'}
          onPress={handleLogin}
          disabled={loading}
          fullWidth
          className="mt-2"
        />
      </View>
    </SafeAreaView>
  );
}
