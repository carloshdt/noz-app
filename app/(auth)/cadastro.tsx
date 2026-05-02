import { View, Alert, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { AppText } from '../../components/ui/AppText';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CadastroScreen() {
  const { signUp } = useAuth();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCadastro = async () => {
    if (!nome.trim() || !email.trim() || !senha.trim()) {
      Alert.alert('Atenção', 'Preencha todos os campos.');
      return;
    }
    if (senha.length < 6) {
      Alert.alert('Atenção', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    try {
      setLoading(true);
      await signUp(nome.trim(), email.trim(), senha);
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível criar a conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background px-6 pt-8">
      <Pressable onPress={() => router.back()} className="mb-8">
        <AppText className="text-primary">← Voltar</AppText>
      </Pressable>

      <AppText variant="title" className="mb-8">Criar conta</AppText>

      <View className="gap-4">
        <Input
          label="Nome"
          value={nome}
          onChangeText={setNome}
          autoCapitalize="words"
          autoCorrect={false}
          placeholder="Seu nome"
        />

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
          placeholder="Mínimo 6 caracteres"
        />

        <Button
          label={loading ? 'Criando conta...' : 'Criar conta'}
          onPress={handleCadastro}
          disabled={loading}
          fullWidth
          className="mt-2"
        />

        <Pressable onPress={() => router.back()} className="mt-2">
          <AppText className="text-center text-muted">
            Já tem conta?{' '}
            <AppText className="text-primary font-medium">Entrar</AppText>
          </AppText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
