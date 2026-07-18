import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function enregistrerPourNotifications(userId) {
  if (!Device.isDevice) {
    console.log('Notifications push necessitent un appareil physique.');
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const { status: statutExistant } = await Notifications.getPermissionsAsync();
  let statutFinal = statutExistant;
  if (statutExistant !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    statutFinal = status;
  }
  if (statutFinal !== 'granted') {
    console.log('Permission notification refusee.');
    return;
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;

    if (userId && token) {
      await setDoc(doc(db, 'utilisateurs', userId), { expoPushToken: token }, { merge: true });
    }
  } catch (error) {
    console.log('Erreur recuperation token push:', error);
  }
}
