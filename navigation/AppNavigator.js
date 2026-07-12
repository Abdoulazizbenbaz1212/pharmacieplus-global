import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import HomeScreen from '../screens/HomeScreen';
import HopitauxScreen from '../screens/HopitauxScreen';
import RdvScreen from '../screens/RdvScreen';
import MedicamentsScreen from '../screens/MedicamentsScreen';
import ProfilScreen from '../screens/ProfilScreen';
import MarketplaceScreen from '../screens/MarketplaceScreen';

const Tab = createBottomTabNavigator();

function TabIcon({ emoji }) {
  return <Text style={{ fontSize: 22 }}>{emoji}</Text>;
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: true,
          tabBarActiveTintColor: '#e74c3c',
          tabBarInactiveTintColor: '#7f8c8d',
        }}
      >
        <Tab.Screen
          name="Hopitaux"
          component={HopitauxScreen}
          options={{
            title: 'Hôpitaux à proximité',
            tabBarLabel: 'Hôpitaux',
            tabBarIcon: () => <TabIcon emoji="🏥" />,
          }}
        />
        <Tab.Screen
          name="Medicaments"
          component={MedicamentsScreen}
          options={{
            title: 'Médicaments',
            tabBarLabel: 'Médicaments',
            tabBarIcon: () => <TabIcon emoji="💊" />,
          }}
        />
        <Tab.Screen
          name="Rdv"
          component={RdvScreen}
          options={{
            title: 'Rendez-vous',
            tabBarLabel: 'RDV',
            tabBarIcon: () => <TabIcon emoji="📅" />,
          }}
        />
        <Tab.Screen
          name="Profil"
          component={ProfilScreen}
          options={{
            title: 'Coffre-fort médical',
            tabBarLabel: 'Profil',
            tabBarIcon: () => <TabIcon emoji="🗂️" />,
          }}
        />
        <Tab.Screen
          name="Marketplace"
          component={MarketplaceScreen}
          options={{
            title: 'Marketplace',
            tabBarLabel: 'Marketplace',
            tabBarIcon: () => <TabIcon emoji="🛒" />,
          }}
        />
        <Tab.Screen
          name="SOS"
          component={HomeScreen}
          options={{
            title: 'Pharmacie+ Global',
            tabBarLabel: 'SOS',
            tabBarIcon: () => <TabIcon emoji="🆘" />,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
