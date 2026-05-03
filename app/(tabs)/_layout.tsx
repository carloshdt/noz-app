import { View, Pressable } from 'react-native';
import { Tabs, usePathname } from 'expo-router';
import { useState, useEffect } from 'react';
import { Menu, UtensilsCrossed, Rss, CalendarDays, ShoppingCart } from 'lucide-react-native';
import { Drawer } from '../../components/Drawer';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';

export default function TabLayout() {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const { user } = useAuth();
  const { profile, refreshProfile } = useProfile();
  const pathname = usePathname();

  useEffect(() => {
    refreshProfile();
  }, [pathname]);

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
          headerLeft: () => (
            <Pressable
              onPress={() => setDrawerVisible(true)}
              style={{ paddingLeft: 16, paddingRight: 8 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Menu size={22} color="#2C1810" />
            </Pressable>
          ),
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
          name="feed"
          options={{
            title: 'Feed',
            tabBarIcon: ({ color }) => <Rss size={22} color={color} />,
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

      {user && (
        <Drawer
          visible={drawerVisible}
          onClose={() => setDrawerVisible(false)}
          user={user}
          profile={profile}
        />
      )}
    </View>
  );
}
