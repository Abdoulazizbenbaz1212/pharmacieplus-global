import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, ActivityIndicator, Platform } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { auth, db } from '../config/firebase';

import HomeScreen from '../screens/HomeScreen';
import HopitauxScreen from '../screens/HopitauxScreen';
import RdvScreen from '../screens/RdvScreen';
import MedicamentsScreen from '../screens/MedicamentsScreen';
import ProfilScreen from '../screens/ProfilScreen';
import ProfilEtablissementScreen from '../screens/ProfilEtablissementScreen';
import MarketplaceScreen from '../screens/MarketplaceScreen';
import MessagesScreen from '../screens/MessagesScreen';
import FamilleScreen from '../screens/FamilleScreen';
import AuthScreen from '../screens/AuthScreen';
import DashboardHopitalScreen from '../screens/DashboardHopitalScreen';
import DashboardPharmacieScreen from '../screens/DashboardPharmacieScreen';
import DashboardFournisseurScreen from '../screens/DashboardFournisseurScreen';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function enregistrerTokenNotification(uid) {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }
    if (!Device.isDevice) {
      console.log('Notifications push necessitent un appareil physique');
      return;
    }
    const { status: statutExistant } = await Notifications.getPermissionsAsync();
    let statutFinal = statutExistant;
    if (statutExistant !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      statutFinal = status;
    }
    if (statutFinal !== 'granted') {
      console.log('Permission de notification refusee');
      return;
    }
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    await setDoc(doc(db, 'utilisateurs', uid), {
      expoPushToken: tokenData.data,
    }, { merge: true });
  } catch (error) {
    console.log('Erreur enregistrement token notification:', error);
  }
}

const Tab = createBottomTabNavigator();

function TabIcon({ emoji }) {
  return <Text style={{ fontSize: 22 }}>{emoji}</Text>;
}

function TabsPatient() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#e74c3c',
        tabBarInactiveTintColor: '#7f8c8d',
      }}
    >
      <Tab.Screen name="Hopitaux" component={HopitauxScreen}
        options={{ title: 'Hopitaux a proximite', tabBarLabel: 'Hopitaux', tabBarIcon: () => <TabIcon emoji="🏥" /> }} />
      <Tab.Screen name="Medicaments" component={MedicamentsScreen}
        options={{ title: 'Medicaments', tabBarLabel: 'Medicaments', tabBarIcon: () => <TabIcon emoji="💊" /> }} />
      <Tab.Screen name="Rdv" component={RdvScreen}
        options={{ title: 'Rendez-vous', tabBarLabel: 'RDV', tabBarIcon: () => <TabIcon emoji="📅" /> }} />
      <Tab.Screen name="Marketplace" component={MarketplaceScreen}
        options={{ title: 'Marketplace', tabBarLabel: 'Marketplace', tabBarIcon: () => <TabIcon emoji="🛒" /> }} />
      <Tab.Screen name="Messages" component={MessagesScreen}
        options={{ title: 'Messages', tabBarLabel: 'Messages', tabBarIcon: () => <TabIcon emoji="💬" /> }} />
      <Tab.Screen name="Famille" component={FamilleScreen}
        options={{ title: 'Ma famille', tabBarLabel: 'Famille', tabBarIcon: () => <TabIcon emoji="👨‍👩‍👧‍👦" /> }} />
      <Tab.Screen name="Profil" component={ProfilScreen}
        options={{ title: 'Coffre-fort medical', tabBarLabel: 'Profil', tabBarIcon: () => <TabIcon emoji="🗂️" /> }} />
      <Tab.Screen name="SOS" component={HomeScreen}
        options={{ title: 'Pharmacie+ Global', tabBarLabel: 'SOS', tabBarIcon: () => <TabIcon emoji="🆘" /> }} />
    </Tab.Navigator>
  );
}

function TabsHopital() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#3498db',
        tabBarInactiveTintColor: '#7f8c8d',
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardHopitalScreen}
        options={{ title: 'Mon Hopital', tabBarLabel: 'Dashboard', tabBarIcon: () => <TabIcon emoji="🏥" /> }} />
      <Tab.Screen name="Marketplace" component={MarketplaceScreen}
        options={{ title: 'Marketplace', tabBarLabel: 'Marketplace', tabBarIcon: () => <TabIcon emoji="🛒" /> }} />
      <Tab.Screen name="Messages" component={MessagesScreen}
        options={{ title: 'Messages', tabBarLabel: 'Messages', tabBarIcon: () => <TabIcon emoji="💬" /> }} />
      <Tab.Screen name="Profil" component={ProfilEtablissementScreen}
        options={{ title: 'Mon profil', tabBarLabel: 'Profil', tabBarIcon: () => <TabIcon emoji="🗂️" /> }} />
    </Tab.Navigator>
  );
}

function TabsPharmacie() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#9b59b6',
        tabBarInactiveTintColor: '#7f8c8d',
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardPharmacieScreen}
        options={{ title: 'Ma Pharmacie', tabBarLabel: 'Dashboard', tabBarIcon: () => <TabIcon emoji="💊" /> }} />
      <Tab.Screen name="Marketplace" component={MarketplaceScreen}
        options={{ title: 'Marketplace', tabBarLabel: 'Marketplace', tabBarIcon: () => <TabIcon emoji="🛒" /> }} />
      <Tab.Screen name="Messages" component={MessagesScreen}
        options={{ title: 'Messages', tabBarLabel: 'Messages', tabBarIcon: () => <TabIcon emoji="💬" /> }} />
      <Tab.Screen name="Profil" component={ProfilEtablissementScreen}
        options={{ title: 'Mon profil', tabBarLabel: 'Profil', tabBarIcon: () => <TabIcon emoji="🗂️" /> }} />
    </Tab.Navigator>
  );
}

function TabsFournisseur() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#f39c12',
        tabBarInactiveTintColor: '#7f8c8d',
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardFournisseurScreen}
        options={{ title: 'Mon entreprise', tabBarLabel: 'Dashboard', tabBarIcon: () => <TabIcon emoji="📦" /> }} />
      <Tab.Screen name="Marketplace" component={MarketplaceScreen}
        options={{ title: 'Marketplace', tabBarLabel: 'Marketplace', tabBarIcon: () => <TabIcon emoji="🛒" /> }} />
      <Tab.Screen name="Messages" component={MessagesScreen}
        options={{ title: 'Messages', tabBarLabel: 'Messages', tabBarIcon: () => <TabIcon emoji="💬" /> }} />
      <Tab.Screen name="Profil" component={ProfilEtablissementScreen}
        options={{ title: 'Mon profil', tabBarLabel: 'Profil', tabBarIcon: () => <TabIcon emoji="🗂️" /> }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const [utilisateur, setUtilisateur] = useState(null);
  const [role, setRole] = useState(null);
  const [chargementAuth, setChargementAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUtilisateur(user);
      if (user) {
        try {
          const docSnap = await getDoc(doc(db, 'utilisateurs', user.uid));
          if (docSnap.exists()) {
            setRole(docSnap.data().role || 'patient');
          } else {
            setRole('patient');
          }
        } catch (error) {
          console.log('Erreur chargement role:', error);
          setRole('patient');
        }
        enregistrerTokenNotification(user.uid);
      } else {
        setRole(null);
      }
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

  const renderTabs = () => {
    if (role === 'hopital') return <TabsHopital />;
    if (role === 'pharmacie') return <TabsPharmacie />;
    if (role === 'fournisseur') return <TabsFournisseur />;
    return <TabsPatient />;
  };

  return (
    <NavigationContainer>
      {utilisateur ? renderTabs() : <AuthScreen />}
    </NavigationContainer>
  );
}
