import { View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
import { useLayoutEffect } from 'react';
import { X, Check } from 'lucide-react-native';
import { useConfiguracao, DiaInicio } from '../../hooks/useConfiguracao';
import { PeriodoPlanejamento } from '../../types';
import { AppText } from '../../components/ui/AppText';

type Opcao<T> = { valor: T; label: string; descricao?: string };

const PERIODOS: Opcao<PeriodoPlanejamento>[] = [
  { valor: 'semanal',   label: 'Semanal',   descricao: '7 dias'  },
  { valor: 'quinzenal', label: 'Quinzenal', descricao: '14 dias' },
  { valor: 'mensal',    label: 'Mensal',    descricao: '30 dias' },
];

const DIAS_INICIO: Opcao<DiaInicio>[] = [
  { valor: 'seg', label: 'Segunda-feira' },
  { valor: 'dom', label: 'Domingo'       },
];

function Secao<T extends string>({
  titulo,
  opcoes,
  valorAtual,
  onSelecionar,
}: {
  titulo: string;
  opcoes: Opcao<T>[];
  valorAtual: T;
  onSelecionar: (v: T) => void;
}) {
  return (
    <View className="mb-6">
      <AppText variant="muted" className="text-[12px] uppercase tracking-wider px-4 mb-2">
        {titulo}
      </AppText>
      <View className="bg-surface rounded-card mx-4 overflow-hidden border border-border">
        {opcoes.map((op, idx) => (
          <Pressable
            key={op.valor}
            onPress={() => onSelecionar(op.valor)}
            className={`flex-row items-center px-4 py-4 ${idx < opcoes.length - 1 ? 'border-b border-border' : ''}`}
          >
            <View className="flex-1">
              <AppText className={valorAtual === op.valor ? 'font-sans-bold text-primary' : ''}>
                {op.label}
              </AppText>
              {op.descricao && (
                <AppText variant="muted" className="text-[12px]">{op.descricao}</AppText>
              )}
            </View>
            {valorAtual === op.valor && <Check size={18} color="#8B4513" />}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function PlanejamentoScreen() {
  const navigation = useNavigation();
  const { periodo, setPeriodo, diaInicio, setDiaInicio } = useConfiguracao();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Planejamento',
      headerShown: true,
      headerStyle: { backgroundColor: '#FAF6F1' },
      headerShadowVisible: false,
      headerTitleStyle: {
        fontFamily: 'PlayfairDisplay_700Bold',
        fontSize: 20,
        color: '#2C1810',
      },
      headerRight: () => (
        <Pressable onPress={() => navigation.goBack()} style={{ paddingRight: 16 }}>
          <X size={22} color="#8C7B6B" />
        </Pressable>
      ),
    });
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom', 'left', 'right']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}>
        <Secao
          titulo="Período do cardápio"
          opcoes={PERIODOS}
          valorAtual={periodo}
          onSelecionar={setPeriodo}
        />
        <Secao
          titulo="Início da semana"
          opcoes={DIAS_INICIO}
          valorAtual={diaInicio}
          onSelecionar={setDiaInicio}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
