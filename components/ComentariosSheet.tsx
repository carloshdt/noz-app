import { useEffect, useState } from 'react';
import { FlatList, Image, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { Heart, Send, X } from 'lucide-react-native';
import { AppText } from './ui/AppText';
import { Comentario, useComentarios } from '../hooks/useComentarios';
import { useAuth } from '../hooks/useAuth';

type Props = {
  receitaId: string;
  receitaUserId: string;
  onClose: () => void;
};

function Avatar({ nome, foto_url, size = 28 }: { nome: string; foto_url?: string; size?: number }) {
  const inicial = nome.trim()[0]?.toUpperCase() ?? '?';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#E8DDD4',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {foto_url ? (
        <Image source={{ uri: foto_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      ) : (
        <AppText style={{ fontSize: size * 0.38, fontWeight: '700', color: '#8B4513' }}>
          {inicial}
        </AppText>
      )}
    </View>
  );
}

function tempoRelativo(dateString: string) {
  const diff = Math.max(0, Date.now() - new Date(dateString).getTime());
  const minutos = Math.floor(diff / 60000);
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `${minutos}min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `${horas}h`;
  return `${Math.floor(horas / 24)}d`;
}

function ComentarioItem({
  comentario,
  receitaUserId,
  onReply,
  onToggleCoracao,
  onDeletar,
  isReply = false,
}: {
  comentario: Comentario;
  receitaUserId: string;
  onReply: (rootId: string, nome: string) => void;
  onToggleCoracao: (id: string) => void;
  onDeletar: (id: string) => void;
  isReply?: boolean;
}) {
  const { user } = useAuth();
  const podeDeletar = user?.id === comentario.user_id || user?.id === receitaUserId;

  return (
    <View style={{ marginLeft: isReply ? 36 : 0, marginTop: isReply ? 8 : 0, marginBottom: isReply ? 0 : 12 }}>
      <View
        style={{
          flexDirection: 'row',
          gap: 8,
          alignItems: 'flex-start',
          backgroundColor: isReply ? '#FAF6F1' : 'transparent',
          borderRadius: 12,
          padding: isReply ? 8 : 0,
        }}
      >
        <Avatar nome={comentario.autor.nome} foto_url={comentario.autor.foto_url} size={isReply ? 22 : 28} />
        <View style={{ flex: 1 }}>
          <AppText style={{ fontSize: 13, color: '#2C1810', lineHeight: 18 }}>
            <AppText style={{ fontWeight: '700' }}>{comentario.autor.nome} </AppText>
            {comentario.texto}
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <AppText style={{ fontSize: 11, color: '#8C7B6B' }}>{tempoRelativo(comentario.created_at)}</AppText>
            <Pressable
              onPress={() => onToggleCoracao(comentario.id)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
            >
              <Heart
                size={13}
                color={comentario.meu_coracao ? '#8B4513' : '#8C7B6B'}
                fill={comentario.meu_coracao ? '#8B4513' : 'none'}
              />
              <AppText style={{ fontSize: 11, color: '#8C7B6B' }}>{comentario.total_coracoes}</AppText>
            </Pressable>
            <Pressable
              onPress={() => onReply(comentario.parent_id ?? comentario.id, comentario.autor.nome)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <AppText style={{ fontSize: 11, color: '#8B4513', fontWeight: '700' }}>Responder</AppText>
            </Pressable>
            {podeDeletar ? (
              <Pressable onPress={() => onDeletar(comentario.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <AppText style={{ fontSize: 11, color: '#DC2626' }}>Excluir</AppText>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
      {(comentario.replies ?? []).map((reply) => (
        <ComentarioItem
          key={reply.id}
          comentario={reply}
          receitaUserId={receitaUserId}
          onReply={onReply}
          onToggleCoracao={onToggleCoracao}
          onDeletar={onDeletar}
          isReply
        />
      ))}
    </View>
  );
}

export function ComentariosSheet({ receitaId, receitaUserId, onClose }: Props) {
  const { user } = useAuth();
  const { comentarios, total, carregar, addComentario, toggleCoracaoComentario, deletarComentario } =
    useComentarios(receitaId);
  const [texto, setTexto] = useState('');
  const [respondendoId, setRespondendoId] = useState<string | null>(null);
  const [respondendoNome, setRespondendoNome] = useState<string | null>(null);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function handleEnviar() {
    if (!texto.trim()) return;
    await addComentario(texto, respondendoId ?? undefined);
    setTexto('');
    setRespondendoId(null);
    setRespondendoNome(null);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
      style={{ flex: 1, backgroundColor: 'white' }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F0EB' }}>
        <AppText style={{ fontSize: 13, fontWeight: '700', color: '#2C1810' }}>
          {total} comentarios
        </AppText>
        <Pressable onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <X size={18} color="#8C7B6B" />
        </Pressable>
      </View>

      <FlatList
        data={comentarios}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ padding: 14, paddingBottom: 24, flexGrow: 1 }}
        renderItem={({ item }) => (
          <ComentarioItem
            comentario={item}
            receitaUserId={receitaUserId}
            onReply={(rootId, nome) => {
              setRespondendoId(rootId);
              setRespondendoNome(nome);
            }}
            onToggleCoracao={toggleCoracaoComentario}
            onDeletar={deletarComentario}
          />
        )}
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 28 }}>
            <AppText style={{ fontSize: 13, color: '#8C7B6B' }}>Seja o primeiro a comentar.</AppText>
          </View>
        }
      />

      <View style={{ borderTopWidth: 1, borderTopColor: '#F5F0EB', paddingHorizontal: 14, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 14 : 10, backgroundColor: 'white' }}>
        {respondendoNome ? (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <AppText style={{ fontSize: 11, color: '#8C7B6B' }}>
              Respondendo a <AppText style={{ fontWeight: '700' }}>{respondendoNome}</AppText>
            </AppText>
            <Pressable
              onPress={() => {
                setRespondendoId(null);
                setRespondendoNome(null);
              }}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <X size={14} color="#8C7B6B" />
            </Pressable>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Avatar nome={user?.email ?? '?'} size={28} />
          <TextInput
            value={texto}
            onChangeText={setTexto}
            placeholder="Adicionar comentario..."
            placeholderTextColor="#8C7B6B"
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={handleEnviar}
            style={{ flex: 1, backgroundColor: '#F5F0EB', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, fontSize: 13, color: '#2C1810' }}
          />
          <Pressable
            onPress={handleEnviar}
            disabled={!texto.trim()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Send size={20} color={texto.trim() ? '#8B4513' : '#D4C4B0'} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
