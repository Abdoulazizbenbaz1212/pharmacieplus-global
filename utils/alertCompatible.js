import { Alert, Platform } from 'react-native';

export function alertCompatible(titre, message, boutons) {
  if (Platform.OS === 'web') {
    if (boutons && boutons.length > 1) {
      const confirme = window.confirm(`${titre}\n\n${message || ''}`);
      const bouton = confirme
        ? boutons.find((b) => b.style !== 'cancel')
        : boutons.find((b) => b.style === 'cancel');
      if (bouton && bouton.onPress) bouton.onPress();
    } else {
      window.alert(`${titre}\n\n${message || ''}`);
      if (boutons && boutons[0] && boutons[0].onPress) boutons[0].onPress();
    }
  } else {
    Alert.alert(titre, message, boutons);
  }
}
