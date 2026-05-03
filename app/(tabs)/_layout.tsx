import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { UtensilsCrossed, Rss, CalendarDays, ShoppingCart, UserCircle } from 'lucide-react-native';
import { AppText } from '../../components/ui/AppText';

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: '#FAF6F1' },
          headerShadowVisible: false,
          headerTitleStyle: {
            fontFamily: 'PlayfairDisplay_700Bold',
            fontSize: 20,
            color: '#2C1810',
          },
          tabBarActiveTintColor: '#8B4513',
          tabBarInactiveTintColor: '#8C7B6B',
          tabBarStyle: {
            backgroundColor: '#FAF6F1',
            borderTopColor: '#D4C4B0',
            paddingBottom: 8,
          },
          tabBarLabelStyle: {
            fontFamily: 'Inter_500Medium',
            fontSize: 12,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            headerShown: false,
            tabBarIcon: ({ color }) => <UtensilsCrossed size={22} color={color} />,
            title: 'Receitas',
          }}
        />
        <Tabs.Screen
          name="cardapio"
          options={{
            title: 'Cardápio',
            tabBarIcon: ({ color }) => <CalendarDays size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="feed"
          options={{
            title: 'Feed',
            headerTitle: () => (
              <AppText style={{ fontSize: 32 }}>🌰</AppText>
            ),
            tabBarIcon: ({ color }) => <Rss size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="compras"
          options={{
            title: 'Mercado',
            tabBarIcon: ({ color }) => <ShoppingCart size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="perfil"
          options={{
            title: 'Perfil',
            tabBarIcon: ({ color }) => <UserCircle size={22} color={color} />,
          }}
        />
      </Tabs>
    </View>
  );
}
