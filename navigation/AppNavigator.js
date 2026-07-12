import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import HopitauxScreen from '../screens/HopitauxScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Accueil">
        <Stack.Screen
          name="Accueil"
          component={HomeScreen}
          options={{ title: 'Pharmacie+ Global' }}
        />
        <Stack.Screen
          name="Hopitaux"
          component={HopitauxScreen}
          options={{ title: 'Hôpitaux à proximité' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
