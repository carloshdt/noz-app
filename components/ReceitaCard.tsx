import { Pressable, View, Image } from 'react-native';
import { AppText } from './ui/AppText';
import { Clock, Users, Heart, MessageCircle } from 'lucide-react-native';
import { Receita } from '../types';

type Props = {
  receita: Receita;
  onPress: () => void;
  criadorNome?: string;
  totalCoracoes?: number;
  totalComentarios?: number;
};

export function ReceitaCard({ receita, onPress, criadorNome, totalCoracoes = 0, totalComentarios = 0 }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-surface rounded-card overflow-hidden mb-3 flex-row"
      style={{ shadowColor: '#2C1810', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}
    >
      <View className="bg-border" style={{ width: 100, height: 100 }}>
        {receita.imagem ? (
          <Image source={{ uri: receita.imagem }} style={{ width: 100, height: 100 }} resizeMode="cover" />
        ) : (
          <View className="w-full h-full items-center justify-center">
            <AppText className="text-[32px]">🍽</AppText>
          </View>
        )}
      </View>
      <View className="flex-1" style={{ paddingTop: 4, paddingBottom: 4, paddingLeft: 8, paddingRight: 12 }}>
        <View>
          <AppText variant="heading" className="text-[12px]" numberOfLines={2}>
            {receita.nome}
          </AppText>
          <View className="flex-row items-center gap-3 mt-1">
            <View className="flex-row items-center gap-1">
              <Clock size={9} color="#8C7B6B" />
              <AppText variant="muted" className="text-[10px]">{receita.tempoPreparo} min</AppText>
            </View>
            <View className="flex-row items-center gap-1">
              <Users size={9} color="#8C7B6B" />
              <AppText variant="muted" className="text-[10px]">{receita.porcoes} porç.</AppText>
            </View>
          </View>
        </View>
        <View style={{ position: 'absolute', bottom: 4, left: 8, right: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Heart size={15} color="#8C7B6B" />
              <AppText variant="muted" style={{ fontSize: 10 }}>{totalCoracoes}</AppText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <MessageCircle size={15} color="#8C7B6B" />
              <AppText variant="muted" style={{ fontSize: 10 }}>{totalComentarios}</AppText>
            </View>
          </View>
          {criadorNome ? (
            <AppText variant="muted" style={{ fontSize: 10 }}>
              Salva de {criadorNome}
            </AppText>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
