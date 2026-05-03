import { View, Image, Pressable, Alert } from 'react-native';
import { Clock, Users, Bookmark, Check, Plus } from 'lucide-react-native';
import { ReceitaFeed } from '../types';
import { AppText } from './ui/AppText';
import { Badge } from './ui/Badge';

type Props = {
  receita: ReceitaFeed;
  altura: number;
  onSalvar: () => void;
  onRemover: () => void;
  onVerPerfil: (userId: string) => void;
  salvada: boolean;
};

export function FeedCard({ receita, altura, onSalvar, onRemover, onVerPerfil, salvada }: Props) {
  const iniciais = receita.criador.nome
    .trim()
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

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
      {/* Imagem: ~60% superior */}
      <View style={{ flex: 6, backgroundColor: '#E8DDD4' }}>
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
              style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'white' }}
            />
          ) : (
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: '#8B4513',
                borderWidth: 2,
                borderColor: 'white',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppText style={{ fontSize: 12, color: 'white', fontWeight: '700' }}>{iniciais}</AppText>
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
      </View>

      {/* Área branca inferior: ~40% */}
      <View style={{ flex: 4, backgroundColor: 'white', padding: 16, gap: 8 }}>
        <AppText
          variant="heading"
          style={{ fontSize: 20, lineHeight: 26 }}
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
          <Badge
            label={receita.dificuldade}
            variant={receita.dificuldade === 'Fácil' ? 'accent' : 'default'}
          />
        </View>
      </View>
    </View>
  );
}
