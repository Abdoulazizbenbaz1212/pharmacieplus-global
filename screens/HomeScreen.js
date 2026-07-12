import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Linking } from 'react-native';
import * as Location from 'expo-location';
import { getNumeroUrgence } from '../utils/urgencePays';

const TIMEOUT_GPS_MS = 8000;

export default function HomeScreen({ navigation }) {
  const [pays, setPays] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const detecterPositionEtPays = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setStatusMsg('Localisation refusée — numéro par défaut utilisé');
        setLoading(false);
        return;
      }

      const positionPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), TIMEOUT_GPS_MS)
      );

      const position = await Promise.race([positionPromise, timeoutPromise]);

      const geocode = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      if (geocode.length > 0 && geocode[0].isoCountryCode) {
        setPays(geocode[0].isoCountryCode);
        setStatusMsg(null);
      } else {
        setStatusMsg('Pays non détecté — numéro par défaut utilisé');
      }
    } catch (error) {
      setStatusMsg('Position indisponible — numéro par défaut utilisé');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    detecterPositionEtPays();
  }, []);

  const handleSOS = () => {
    const numeroUrgence = getNumeroUrgence(pays);

    Alert.alert(
      '🆘 Appel d\'urgence',
      `Numéro: ${numeroUrgence}${pays ? `\nPays détecté: ${pays}` : '\n(pays non détecté, numéro par défaut)'}`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Appeler maintenant',
          style: 'destructive',
          onPress: () => lancerAppel(numeroUrgence),
        },
      ]
    );
  };

  const lancerAppel = async (numero) => {
    const url = `tel:${numero}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Erreur', `Impossible de lancer l'appel. Composez manuellement le ${numero}.`);
      }
    } catch (error) {
      Alert.alert('Erreur', `Impossible de lancer l'appel. Composez manuellement le ${numero}.`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pharmacie+ Global</Text>

      {loading && (
        <View style={styles.statusRow}>
          <ActivityIndicator size="small" color="#e74c3c" />
          <Text style={styles.statusText}>Localisation en cours...</Text>
        </View>
      )}

      {!loading && statusMsg && <Text style={styles.warning}>{statusMsg}</Text>}
      {!loading && pays && <Text style={styles.info}>Pays détecté: {pays}</Text>}

      <TouchableOpacity style={styles.sosButton} onPress={handleSOS} activeOpacity={0.7}>
        <Text style={styles.sosText}>SOS</Text>
      </TouchableOpacity>

      <Text style={styles.subtitle}>Appuyez en cas d'urgence</Text>

      <TouchableOpacity
        style={styles.hopitauxButton}
        onPress={() => navigation.navigate('Hopitaux')}
      >
        <Text style={styles.hopitauxButtonText}>🏥 Hôpitaux à proximité</Text>
      </TouchableOpacity>

      {!loading && (
        <TouchableOpacity onPress={detecterPositionEtPays} style={styles.retryButton}>
          <Text style={styles.retryText}>🔄 Actualiser ma position</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#2c3e50',
  },
  sosButton: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#e74c3c',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  sosText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  subtitle: {
    marginTop: 20,
    fontSize: 14,
    color: '#7f8c8d',
  },
  info: {
    fontSize: 14,
    color: '#27ae60',
    marginBottom: 10,
  },
  warning: {
    fontSize: 13,
    color: '#e67e22',
    marginBottom: 10,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#7f8c8d',
  },
  hopitauxButton: {
    marginTop: 25,
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  hopitauxButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  retryButton: {
    marginTop: 20,
    padding: 10,
  },
  retryText: {
    color: '#3498db',
    fontSize: 13,
  },
});
