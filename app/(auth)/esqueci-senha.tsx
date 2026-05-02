import { View, Alert, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { AppText } from '../../components/ui/AppText';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { SafeAreaView } from 'react-native-safe-area-context';
import { traduzirErroAuth } from '../../utils/authErrors';

export default function EsqueciSenhaScreen() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      Alert.alert('Atenção', 'Digite seu email.');
      return;
    }
    try {
      setLoading(true);
      await resetPassword(email.trim());
      setEnviado(true);
    } catch (e: any) {
      Alert.alert('Erro', traduzirErroAuth(e.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background px-6 pt-8">
      <Pressable onPress={() => router.back()} className="mb-8">
        <AppText className="text-primary">← Voltar</AppText>
      </Pressable>

      <AppText variant="title" className="mb-4">Esqueci minha senha</AppText>

      {enviado ? (
        <View className="gap-4">
          <AppText variant="muted">
            Email enviado para <AppText className="font-medium">{email}</AppText>.
            Verifique sua caixa de entrada e siga as instruções.
          </AppText>
          <Button label="Voltar ao login" onPress={() => router.replace('/(auth)/login')} fullWidth />
        </View>
      ) : (
        <View className="gap-4">
          <AppText variant="muted">
            Digite seu email e enviaremos um link para redefinir sua senha.
          </AppText>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="seu@email.com"
          />
          <Button
            label={loading ? 'Enviando...' : 'Enviar link'}
            onPress={handleReset}
            disabled={loading}
            fullWidth
          />
        </View>
      )}
    </SafeAreaView>
  );
}
