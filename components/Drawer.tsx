import { View, Pressable, Animated, StyleSheet, Image, Modal } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { User } from '@supabase/supabase-js';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Profile } from '../types';
import { AppText } from './ui/AppText';
import { useAuth } from '../hooks/useAuth';
import { useConfiguracao, DiaInicio } from '../hooks/useConfiguracao';

type Props = {
  visible: boolean;
  onClose: () => void;
  user: User;
  profile: Profile | null;
};

const DRAWER_WIDTH = 280;

export function Drawer({ visible, onClose, user, profile }: Props) {
  const { signOut } = useAuth();
  const { diaInicio, setDiaInicio } = useConfiguracao();
  const [modalDia, setModalDia] = useState(false);
  const insets = useSafeAreaInsets();
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateX, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, { toValue: -DRAWER_WIDTH, duration: 200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleSignOut = async () => {
    onClose();
    await signOut();
    router.replace('/(auth)/login');
  };

  const nome = profile?.nome ?? user.email?.split('@')[0] ?? 'Usuário';
  const inicial = nome[0].toUpperCase();

  return (
    <View
      style={[StyleSheet.absoluteFill, styles.container]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.overlay, { opacity }]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <Pressable testID="drawer-overlay" style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[styles.panel, { paddingTop: insets.top + 24, transform: [{ translateX }] }]}
      >
        <View style={styles.profileHeader}>
          {profile?.foto_url ? (
            <Image source={{ uri: profile.foto_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <AppText style={styles.avatarLetter}>{inicial}</AppText>
            </View>
          )}
          <AppText style={styles.nome}>{nome}</AppText>
          <AppText style={styles.email}>{user.email}</AppText>
        </View>

        <Pressable
          style={styles.menuItem}
          onPress={() => { onClose(); router.push('/perfil/editar'); }}
        >
          <AppText>✏️ Editar perfil</AppText>
        </Pressable>

        <Pressable style={styles.menuItem} onPress={() => setModalDia(true)}>
          <AppText>📅 Início da semana</AppText>
          <AppText style={styles.textMuted}>{diaInicio === 'seg' ? 'Segunda-feira' : 'Domingo'}</AppText>
        </Pressable>

        <Pressable disabled style={[styles.menuItem, styles.itemDisabled]}>
          <AppText style={styles.textMuted}>⚙️ Configurações</AppText>
        </Pressable>

        <Pressable disabled style={[styles.menuItem, styles.itemDisabled]}>
          <AppText style={styles.textMuted}>❓ Ajuda</AppText>
        </Pressable>

        <View style={[styles.footer, { paddingBottom: insets.bottom }]}>
          <Pressable style={styles.menuItem} onPress={handleSignOut}>
            <AppText style={styles.textLogout}>⬅ Sair</AppText>
          </Pressable>
        </View>
      </Animated.View>

      <Modal visible={modalDia} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setModalDia(false)}>
          <View style={styles.modalBox}>
            <AppText style={styles.modalTitulo}>Início da semana</AppText>
            {(['seg', 'dom'] as DiaInicio[]).map((d) => (
              <Pressable
                key={d}
                style={[styles.modalOpcao, diaInicio === d && styles.modalOpcaoAtiva]}
                onPress={() => { setDiaInicio(d); setModalDia(false); }}
              >
                <AppText style={diaInicio === d ? styles.modalOpcaoTextoAtivo : undefined}>
                  {d === 'seg' ? 'Segunda-feira' : 'Domingo'}
                </AppText>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { zIndex: 999 },
  overlay: { backgroundColor: 'rgba(0,0,0,0.4)' },
  panel: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  profileHeader: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 8,
    alignItems: 'center',
  },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  avatarFallback: {
    backgroundColor: '#F3EDE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 24,
    fontFamily: 'PlayfairDisplay_700Bold',
    color: '#8B4513',
  },
  nome: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#2C1810', marginBottom: 2 },
  email: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#8C7B6B' },
  menuItem: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F9F5F0',
  },
  itemDisabled: { opacity: 0.45 },
  textMuted: { color: '#8C7B6B' },
  textLogout: { color: '#EF4444' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: 260, gap: 4 },
  modalTitulo: { fontFamily: 'Inter_700Bold', fontSize: 15, color: '#2C1810', marginBottom: 8 },
  modalOpcao: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: '#F3EDE8' },
  modalOpcaoAtiva: { backgroundColor: '#F3EDE8', borderColor: '#8B4513' },
  modalOpcaoTextoAtivo: { fontFamily: 'Inter_700Bold', color: '#8B4513' },
});
