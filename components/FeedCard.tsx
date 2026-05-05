import { View, Image, Pressable, Alert } from 'react-native';
import { Clock, Users, Bookmark, Check, Plus, Heart, MessageCircle } from 'lucide-react-native';
import { ReceitaFeed } from '../types';
import { AppText } from './ui/AppText';

type Props = {
  receita: ReceitaFeed;
  altura: number;
  onSalvar: () => void;
  onRemover: () => void;
  onVerPerfil: (userId: string) => void;
  onVerReceita: (receitaId: string) => void;
  onVerComentarios: (receitaId: string, receitaUserId: string) => void;
  salvada: boolean;
  coracaoTotal?: number;
  coracaoMeu?: boolean;
  onToggleCoracao?: () => void;
  totalComentarios?: number;
};

export function FeedCard({
  receita,
  altura,
  onSalvar,
  onRemover,
  onVerPerfil,
  onVerReceita,
  onVerComentarios,
  salvada,
  coracaoTotal = 0,
  coracaoMeu = false,
  onToggleCoracao,
  totalComentarios = 0,
}: Props) {
  const iniciais = receita.criador.nome
    .trim()
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const dataCriacao = formatarDataCriacao(receita.criadaEm);

  function handleBookmark() {
    if (salvada) {
      Alert.alert(
        'Remover receita',
        `Remover "${receita.nome}" das suas receitas?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Remover', style: 'destructive', onPress: onRemover },
        ]
      );
    } else {
      onSalvar();
    }
  }

  return (
    <View style={{ height: altura }}>
      {/* Imagem: ~80% superior */}
      <Pressable onPress={() => onVerReceita(receita.id)} style={{ flex: 4, backgroundColor: '#E8DDD4' }}>
        {receita.imagem ? (
          <Image
            source={{ uri: receita.imagem }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <AppText style={{ fontSize: 72 }}>🍽</AppText>
          </View>
        )}

        {/* Nome do criador — canto superior esquerdo */}
        <Pressable
          onPress={() => onVerPerfil(receita.user_id)}
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {receita.criador.foto_url ? (
            <Image
              source={{ uri: receita.criador.foto_url }}
              style={{ width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: '#8B4513' }}
            />
          ) : (
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: '#8B4513',
                borderWidth: 2,
                borderColor: '#8B4513',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppText style={{ fontSize: 13, color: 'white', fontWeight: '700' }}>{iniciais}</AppText>
            </View>
          )}
          <AppText
            style={{
              fontSize: 15,
              color: 'white',
              fontWeight: '600',
              textShadowColor: 'rgba(0,0,0,0.6)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 3,
            }}
          >
            {receita.criador.nome}
          </AppText>
        </Pressable>

        {/* Bookmark — topo direito, saindo para baixo da borda superior */}
        <Pressable
          onPress={handleBookmark}
          style={{ position: 'absolute', top: -6, right: 8 }}
        >
          <Bookmark
            size={52}
            color="#8B4513"
            fill="#8B4513"
          />
          <View style={{ position: 'absolute', top: 14, left: 0, width: 52, alignItems: 'center' }}>
            {salvada
              ? <Check size={20} color="white" strokeWidth={3.5} />
              : <Plus size={20} color="white" strokeWidth={3.5} />
            }
          </View>
        </Pressable>
      </Pressable>

      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: 'white' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Pressable
            onPress={onToggleCoracao}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Heart
              size={22}
              color="#8B4513"
              fill={coracaoMeu ? '#8B4513' : 'none'}
            />
            <AppText style={{ fontSize: 13, fontWeight: '700', color: '#2C1810' }}>
              {coracaoTotal}
            </AppText>
          </Pressable>
          <Pressable
            onPress={() => onVerComentarios(receita.id, receita.user_id)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MessageCircle size={22} color="#8B4513" />
            <AppText style={{ fontSize: 13, fontWeight: '700', color: '#2C1810' }}>
              {totalComentarios}
            </AppText>
          </Pressable>
        </View>
        <AppText
          variant="muted"
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{ flex: 1, marginLeft: 12, textAlign: 'right', fontSize: 12 }}
        >
          {dataCriacao}
        </AppText>
      </View>

      {/* Área branca inferior: ~20% */}
      <Pressable
        onPress={() => onVerReceita(receita.id)}
        style={{ flex: 1, backgroundColor: 'white', paddingHorizontal: 16, paddingTop: 0, paddingBottom: 10, gap: 2 }}
      >
        <AppText
          variant="heading"
          style={{ fontSize: 20, lineHeight: 22 }}
          numberOfLines={2}
        >
          {receita.nome}
        </AppText>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Clock size={14} color="#8C7B6B" />
            <AppText variant="muted" style={{ fontSize: 13 }}>{receita.tempoPreparo} min</AppText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Users size={14} color="#8C7B6B" />
            <AppText variant="muted" style={{ fontSize: 13 }}>{receita.porcoes} porções</AppText>
          </View>
          <View
            style={{
              borderRadius: 999,
              paddingHorizontal: 8,
              paddingVertical: 2,
              backgroundColor: receita.dificuldade === 'Fácil' ? '#EEF4D8' : '#F5F0EB',
              alignSelf: 'center',
            }}
          >
            <AppText
              numberOfLines={1}
              style={{
                fontSize: 11,
                lineHeight: 14,
                color: receita.dificuldade === 'Fácil' ? '#6B8E23' : '#8C7B6B',
              }}
            >
              {receita.dificuldade}
            </AppText>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

function formatarDataCriacao(value: string) {
  const data = new Date(value);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
