import { Tabs } from 'expo-router';
import { UtensilsCrossed, CalendarDays, ShoppingCart } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
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
          title: 'Receitas',
          tabBarIcon: ({ color }) => <UtensilsCrossed size={22} color={color} />,
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
        name="compras"
        options={{
          title: 'Compras',
          tabBarIcon: ({ color }) => <ShoppingCart size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
