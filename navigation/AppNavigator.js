import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, ActivityIndicator } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';

import HomeScreen from '../screens/HomeScreen';
import HopitauxScreen from '../screens/HopitauxScreen';
import RdvScreen from '../screens/RdvScreen';
import MedicamentsScreen from '../screens/MedicamentsScreen';
import ProfilScreen from '../screens/ProfilScreen';
import MarketplaceScreen from '../screens/MarketplaceScreen';
import AuthScreen from '../screens/AuthScreen';

const Tab = createBottomTabNavigator();

function TabIcon({ emoji }) {
  return <Text style={{ fontSize: 22 }}>{emoji}</Text>;
}

function TabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#e74c3c',
        tabBarInactiveTintColor: '#7f8c8d',
      }}
    >
      <Tab.Screen name="Hopitaux" component={HopitauxScreen}
        options={{ title: 'Hôpitaux à proximité', tabBarLabel: 'Hôpitaux', tabBarIcon: () => <TabIcon emoji="🏥" /> }} />
      <Tab.Screen name="Medicaments" component={MedicamentsScreen}
        options={{ title: 'Médicaments', tabBarLabel: 'Médicaments', tabBarIcon: () => <TabIcon emoji="💊" /> }} />
      <Tab.Screen name="Rdv" component={RdvScreen}
        options={{ title: 'Rendez-vous', tabBarLabel: 'RDV', tabBarIcon: () => <TabIcon emoji="📅" /> }} />
      <Tab.Screen name="Profil" component={ProfilScreen}
        options={{ title: 'Coffre-fort médical', tabBarLabel: 'Profil', tabBarIcon: () => <TabIcon emoji="🗂️" /> }} />
      <Tab.Screen name="Marketplace" component={MarketplaceScreen}
        options={{ title: 'Marketplace', tabBarLabel: 'Marketplace', tabBarIcon: () => <TabIcon emoji="🛒" /> }} />
      <Tab.Screen name="SOS" component={HomeScreen}
        options={{ title: 'Pharmacie+ Global', tabBarLabel: 'SOS', tabBarIcon: () => <TabIcon emoji="🆘" /> }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const [utilisateur, setUtilisateur] = useState(null);
  const [chargementAuth, setChargementAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUtilisateur(user);
      setChargementAuth(false);
    });
    return unsubscribe;
  }, []);

  if (chargementAuth) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#e74c3c" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {utilisateur ? <TabsNavigator /> : <AuthScreen />}
    </NavigationContainer>
  );
}
