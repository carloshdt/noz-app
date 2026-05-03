import { View, Alert, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { useURL } from 'expo-linking';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { AppText } from '../../components/ui/AppText';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export default function NovaSenhaScreen() {
  const url = useURL();
  const [pronto, setPronto] = useState(false);
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!url) return;
    const hash = url.split('#')[1];
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const type = params.get('type');
    if (type === 'recovery' && accessToken && refreshToken) {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(() => setPronto(true))
        .catch(() => Alert.alert('Erro', 'Link inválido ou expirado.'));
    }
  }, [url]);

  const handleSalvar = async () => {
    if (senha.length < 6) {
      Alert.alert('Atenção', 'Senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (senha !== confirmar) {
      Alert.alert('Atenção', 'As senhas não coincidem.');
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password: senha });
      if (error) throw error;
      Alert.alert('Sucesso', 'Senha alterada com sucesso!', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível alterar a senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background px-6 pt-8">
      <Pressable onPress={() => router.replace('/(auth)/login')} className="mb-8">
        <AppText className="text-primary">← Voltar ao login</AppText>
      </Pressable>

      <AppText variant="title" className="mb-4">Nova senha</AppText>

      {!pronto ? (
        <AppText variant="muted">
          Aguardando link de redefinição... Abra o link enviado para o seu email.
        </AppText>
      ) : (
        <View className="gap-4">
          <AppText variant="muted">Digite sua nova senha abaixo.</AppText>
          <Input
            label="Nova senha"
            value={senha}
            onChangeText={setSenha}
            secureTextEntry
            placeholder="Mínimo 6 caracteres"
          />
          <Input
            label="Confirmar senha"
            value={confirmar}
            onChangeText={setConfirmar}
            secureTextEntry
            placeholder="Repita a senha"
          />
          <Button
            label={loading ? 'Salvando...' : 'Salvar nova senha'}
            onPress={handleSalvar}
            disabled={loading}
            fullWidth
          />
        </View>
      )}
    </SafeAreaView>
  );
}
