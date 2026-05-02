import { View, Pressable, Alert, Image, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProfile } from '../../hooks/useProfile';
import { useAuth } from '../../hooks/useAuth';
import { AppText } from '../../components/ui/AppText';
import { Input } from '../../components/ui/Input';

export default function EditarPerfil() {
  const { profile, updateProfile } = useProfile();
  const { user } = useAuth();
  const [nome, setNome] = useState(profile?.nome ?? '');

  useEffect(() => {
    if (profile?.nome && !nome) setNome(profile.nome);
  }, [profile?.nome]);
  const [fotoUri, setFotoUri] = useState<string | undefined>(undefined);
  const [salvando, setSalvando] = useState(false);

  const handleEscolherFoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setFotoUri(result.assets[0].uri);
    }
  };

  const handleSalvar = async () => {
    if (!nome.trim()) {
      Alert.alert('Atenção', 'O nome não pode ficar vazio.');
      return;
    }
    try {
      setSalvando(true);
      await updateProfile(nome.trim(), fotoUri);
      router.back();
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? JSON.stringify(e) ?? 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  };

  const avatarUri = fotoUri ?? profile?.foto_url;
  const inicial = (profile?.nome ?? user?.email ?? 'U')[0].toUpperCase();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom', 'left', 'right']}>
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <Pressable onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <AppText className="text-muted text-[15px]">Cancelar</AppText>
        </Pressable>
        <AppText variant="heading" className="text-[17px]">Editar perfil</AppText>
        <Pressable
          onPress={handleSalvar}
          disabled={salvando}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {salvando ? (
            <ActivityIndicator size="small" color="#8B4513" />
          ) : (
            <AppText className="text-primary font-sans-medium text-[15px]">Salvar</AppText>
          )}
        </Pressable>
      </View>

      <View className="items-center pt-8 pb-6">
        <Pressable onPress={handleEscolherFoto}>
          {avatarUri ? (
            <Image
              source={{ uri: avatarUri }}
              className="w-20 h-20 rounded-full"
            />
          ) : (
            <View className="w-20 h-20 rounded-full bg-surface items-center justify-center">
              <AppText className="font-serif text-[32px] text-primary">{inicial}</AppText>
            </View>
          )}
          <View className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary items-center justify-center">
            <AppText className="text-white text-[14px]">📷</AppText>
          </View>
        </Pressable>
        <AppText className="text-muted text-[13px] mt-2">Toque para alterar</AppText>
      </View>

      <View className="px-6 gap-5">
        <Input
          label="Nome"
          value={nome}
          onChangeText={setNome}
          autoCapitalize="words"
          autoCorrect={false}
          placeholder="Seu nome"
        />

        <View className="gap-1">
          <AppText variant="label">Email</AppText>
          <View className="bg-surface border border-border rounded-card px-4 py-3">
            <AppText className="text-muted text-[16px]">{user?.email}</AppText>
          </View>
          <AppText className="text-muted text-[12px]">Email não pode ser alterado</AppText>
        </View>
      </View>
    </SafeAreaView>
  );
}
