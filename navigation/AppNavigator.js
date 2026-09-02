import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useSafeAreaInsets, SafeAreaProvider } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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
import ScannerEtablissementScreen from '../screens/ScannerEtablissementScreen';
import CommandesScreen from '../screens/CommandesScreen';
import PlusScreen from '../screens/PlusScreen';
import AssistantScreen from '../screens/AssistantScreen';
import VisioScreen from '../screens/VisioScreen';
import AuthScreen from '../screens/AuthScreen';
import DashboardHopitalScreen from '../screens/DashboardHopitalScreen';
import DashboardPharmacieScreen from '../screens/DashboardPharmacieScreen';
import DashboardFournisseurScreen from '../screens/DashboardFournisseurScreen';
import AdminScreen from '../screens/AdminScreen';

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
const Stack = createNativeStackNavigator();

const ADMIN_EMAILS = ['abdoulazizbenbaz0@gmail.com', 'abdoulazizbenbaz00@gmail.com'];

function TabIcon({ emoji }) {
  return <Text style={{ fontSize: 19 }}>{emoji}</Text>;
}

function TabsPatient({ isAdmin }) {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#e74c3c',
        tabBarInactiveTintColor: '#7f8c8d',
        tabBarStyle: { height: 56 + insets.bottom, paddingBottom: insets.bottom + 6, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 10 },
      }}
    >
      <Tab.Screen name="Hopitaux" component={HopitauxScreen}
        options={{ title: 'Hopitaux a proximite', tabBarLabel: 'Hopitaux', tabBarIcon: () => <TabIcon emoji="🏥" /> }} />
      <Tab.Screen name="Marketplace" component={MarketplaceScreen}
        options={{ title: 'Marketplace', tabBarLabel: 'Marketplace', tabBarIcon: () => <TabIcon emoji="🛒" /> }} />
      <Tab.Screen name="Messages" component={MessagesScreen}
        options={{ title: 'Messages', tabBarLabel: 'Messages', tabBarIcon: () => <TabIcon emoji=" 💬" /> }} />
      <Tab.Screen name="Famille" component={FamilleScreen}
        options={{ title: 'Ma famille', tabBarLabel: 'Famille', tabBarIcon: () => <TabIcon emoji="👨‍👩‍👧‍👦" /> }} />
      <Tab.Screen name="SOS" component={HomeScreen}
        options={{ title: 'Pharmacie+ Global', tabBarLabel: 'SOS', tabBarIcon: () => <TabIcon emoji="🆘" /> }} />
      <Tab.Screen name="Plus" component={PlusScreen}
        options={{ title: 'Plus', tabBarLabel: 'Plus', tabBarIcon: () => <TabIcon emoji="☰" /> }} />
      {isAdmin && (
        <Tab.Screen name="Admin" component={AdminScreen}
          options={{ title: 'Administration', tabBarLabel: 'Admin', tabBarIcon: () => <TabIcon emoji="🛠️" /> }} />
      )}
    </Tab.Navigator>
  );
}

function TabsHopital({ isAdmin }) {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#3498db',
        tabBarInactiveTintColor: '#7f8c8d',
        tabBarStyle: { height: 56 + insets.bottom, paddingBottom: insets.bottom + 6, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 10 },
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardHopitalScreen}
        options={{ title: 'Mon Hopital', tabBarLabel: 'Dashboard', tabBarIcon: () => <TabIcon emoji="🏥" /> }} />
      <Tab.Screen name="Commandes" component={CommandesScreen}
        options={{ title: 'Mes commandes', tabBarLabel: 'Commandes', tabBarIcon: () => <TabIcon emoji="📦" /> }} />
      <Tab.Screen name="Marketplace" component={MarketplaceScreen}
        options={{ title: 'Marketplace', tabBarLabel: 'Marketplace', tabBarIcon: () => <TabIcon emoji="🛒" /> }} />
      <Tab.Screen name="Messages" component={MessagesScreen}
        options={{ title: 'Messages', tabBarLabel: 'Messages', tabBarIcon: () => <TabIcon emoji="💬" /> }} />
      <Tab.Screen name="Profil" component={ProfilEtablissementScreen}
        options={{ title: 'Mon profil', tabBarLabel: 'Profil', tabBarIcon: () => <TabIcon emoji="🗂️" /> }} />
      {isAdmin && (
        <Tab.Screen name="Admin" component={AdminScreen}
          options={{ title: 'Administration', tabBarLabel: 'Admin', tabBarIcon: () => <TabIcon emoji="🛠️" /> }} />
      )}
    </Tab.Navigator>
  );
}

function TabsPharmacie({ isAdmin }) {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#9b59b6',
        tabBarInactiveTintColor: '#7f8c8d',
        tabBarStyle: { height: 56 + insets.bottom, paddingBottom: insets.bottom + 6, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 10 },
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardPharmacieScreen}
        options={{ title: 'Ma Pharmacie', tabBarLabel: 'Dashboard', tabBarIcon: () => <TabIcon emoji="💊" /> }} />
      <Tab.Screen name="Commandes" component={CommandesScreen}
        options={{ title: 'Mes commandes', tabBarLabel: 'Commandes', tabBarIcon: () => <TabIcon emoji="📦" /> }} />
      <Tab.Screen name="Marketplace" component={MarketplaceScreen}
        options={{ title: 'Marketplace', tabBarLabel: 'Marketplace', tabBarIcon: () => <TabIcon emoji="🛒" /> }} />
      <Tab.Screen name="Messages" component={MessagesScreen}
        options={{ title: 'Messages', tabBarLabel: 'Messages', tabBarIcon: () => <TabIcon emoji="💬" /> }} />
      <Tab.Screen name="Profil" component={ProfilEtablissementScreen}
        options={{ title: 'Mon profil', tabBarLabel: 'Profil', tabBarIcon: () => <TabIcon emoji="🗂️" /> }} />
      {isAdmin && (
        <Tab.Screen name="Admin" component={AdminScreen}
          options={{ title: 'Administration', tabBarLabel: 'Admin', tabBarIcon: () => <TabIcon emoji="🛠️" /> }} />
      )}
    </Tab.Navigator>
  );
}

function TabsFournisseur({ isAdmin }) {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#f39c12',
        tabBarInactiveTintColor: '#7f8c8d',
        tabBarStyle: { height: 56 + insets.bottom, paddingBottom: insets.bottom + 6, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 10 },
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardFournisseurScreen}
        options={{ title: 'Mon entreprise', tabBarLabel: 'Dashboard', tabBarIcon: () => <TabIcon emoji="📦" /> }} />
      <Tab.Screen name="Commandes" component={CommandesScreen}
        options={{ title: 'Mes commandes', tabBarLabel: 'Commandes', tabBarIcon: () => <TabIcon emoji="📦" /> }} />
      <Tab.Screen name="Marketplace" component={MarketplaceScreen}
        options={{ title: 'Marketplace', tabBarLabel: 'Marketplace', tabBarIcon: () => <TabIcon emoji="🛒" /> }} />
      <Tab.Screen name="Messages" component={MessagesScreen}
        options={{ title: 'Messages', tabBarLabel: 'Messages', tabBarIcon: () => <TabIcon emoji="💬" /> }} />
      <Tab.Screen name="Profil" component={ProfilEtablissementScreen}
        options={{ title: 'Mon profil', tabBarLabel: 'Profil', tabBarIcon: () => <TabIcon emoji="🗂️" /> }} />
      {isAdmin && (
        <Tab.Screen name="Admin" component={AdminScreen}
          options={{ title: 'Administration', tabBarLabel: 'Admin', tabBarIcon: () => <TabIcon emoji="🛠️" /> }} />
      )}
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

  const isAdmin = utilisateur && ADMIN_EMAILS.includes(utilisateur.email);

  const renderTabs = () => {
    if (role === 'hopital') return <TabsHopital isAdmin={isAdmin} />;
    if (role === 'pharmacie') return <TabsPharmacie isAdmin={isAdmin} />;
    if (role === 'fournisseur') return <TabsFournisseur isAdmin={isAdmin} />;
    return <TabsPatient isAdmin={isAdmin} />;
  };

  return (
    <SafeAreaProvider>
    <NavigationContainer>
      {utilisateur ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Tabs">
            {() => renderTabs()}
          </Stack.Screen>
          <Stack.Screen
            name="Visio"
            component={VisioScreen}
            options={{ headerShown: true, title: 'Teleconsultation' }}
          />
          <Stack.Screen
            name="Medicaments"
            component={MedicamentsScreen}
            options={{ headerShown: true, title: 'Medicaments' }}
          />
          <Stack.Screen
            name="Rdv"
            component={RdvScreen}
            options={{ headerShown: true, title: 'Rendez-vous' }}
          />
          <Stack.Screen
            name="Commandes"
            component={CommandesScreen}
            options={{ headerShown: true, title: 'Mes commandes' }}
          />
          <Stack.Screen
            name="Profil"
            component={ProfilScreen}
            options={{ headerShown: true, title: 'Coffre-fort medical' }}
          />
          <Stack.Screen
            name="Scanner"
            component={ScannerEtablissementScreen}
            options={{ headerShown: true, title: 'Scanner un etablissement' }}
          />
          <Stack.Screen
            name="Assistant"
            component={AssistantScreen}
            options={{ headerShown: true, title: 'Assistant sante IA' }}
          />
        </Stack.Navigator>
      ) : (
        <AuthScreen />
      )}
    </NavigationContainer>
    </SafeAreaProvider>
  );
}
