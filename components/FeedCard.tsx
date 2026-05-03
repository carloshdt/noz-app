import { View, Image, Pressable } from 'react-native';
import { Clock, Users } from 'lucide-react-native';
import { ReceitaFeed } from '../types';
import { AppText } from './ui/AppText';
import { Badge } from './ui/Badge';

type Props = {
  receita: ReceitaFeed;
  altura: number;
  onSalvar: () => void;
  onVerPerfil: (userId: string) => void;
  salvada: boolean;
};

export function FeedCard({ receita, altura, onSalvar, onVerPerfil, salvada }: Props) {
  const iniciais = receita.criador.nome
    .trim()
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <View style={{ height: altura }}>
      {/* Imagem: ~60% superior */}
      <View style={{ flex: 6, backgroundColor: '#E8DDD4', position: 'relative' }}>
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
              style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: 'white' }}
            />
          ) : (
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: '#8B4513',
                borderWidth: 2,
                borderColor: 'white',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppText style={{ fontSize: 10, color: 'white', fontWeight: '700' }}>{iniciais}</AppText>
            </View>
          )}
          <AppText
            style={{
              fontSize: 13,
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

        <Pressable
          onPress={salvada ? undefined : onSalvar}
          style={{
            backgroundColor: salvada ? '#E8DDD4' : '#8B4513',
            borderRadius: 8,
            paddingVertical: 14,
            alignItems: 'center',
            marginTop: 'auto' as any,
          }}
        >
          <AppText
            style={{
              color: salvada ? '#8C7B6B' : 'white',
              fontWeight: '600',
              fontSize: 15,
            }}
          >
            {salvada ? '✓ Salva nas suas receitas' : '+ Salvar nas minhas receitas'}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}
