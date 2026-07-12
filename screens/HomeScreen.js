import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, Linking, ScrollView,
} from 'react-native';
import * as Location from 'expo-location';
import { getNumeroUrgence } from '../utils/urgencePays';
import { auth } from '../config/firebase';
import { signOut } from 'firebase/auth';

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
        { text: 'Appeler maintenant', style: 'destructive', onPress: () => lancerAppel(numeroUrgence) },
      ]
    );
  };

  const lancerAppel = async (numero) => {
    const url = `tel:${numero}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else Alert.alert('Erreur', `Composez manuellement le ${numero}.`);
    } catch (error) {
      Alert.alert('Erreur', `Composez manuellement le ${numero}.`);
    }
  };

  const handleDeconnexion = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: () => signOut(auth) },
    ]);
  };

  const raccourcis = [
    { label: 'Hôpitaux', emoji: '🏥', screen: 'Hopitaux', color: '#3498db' },
    { label: 'Médicaments', emoji: '💊', screen: 'Medicaments', color: '#9b59b6' },
    { label: 'Rendez-vous', emoji: '📅', screen: 'Rdv', color: '#f39c12' },
    { label: 'Mon coffre-fort', emoji: '🗂️', screen: 'Profil', color: '#16a085' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
      <View style={styles.header}>
        <View>
          <Text style={styles.bienvenue}>Bienvenue 👋</Text>
          <Text style={styles.appName}>Pharmacie+ Global</Text>
        </View>
        <TouchableOpacity onPress={handleDeconnexion} style={styles.logoutBtn}>
          <Text style={styles.logoutBtnText}>Déconnexion</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sosSection}>
        {loading && (
          <View style={styles.statusRow}>
            <ActivityIndicator size="small" color="#e74c3c" />
            <Text style={styles.statusText}>Localisation en cours...</Text>
          </View>
        )}
        {!loading && statusMsg && <Text style={styles.warning}>{statusMsg}</Text>}
        {!loading && pays && <Text style={styles.info}>Pays détecté : {pays}</Text>}

        <TouchableOpacity style={styles.sosButton} onPress={handleSOS} activeOpacity={0.7}>
          <Text style={styles.sosText}>SOS</Text>
        </TouchableOpacity>
        <Text style={styles.sosSubtitle}>Appuyez en cas d'urgence médicale</Text>
      </View>

      <Text style={styles.sectionTitle}>Accès rapide</Text>
      <View style={styles.grid}>
        {raccourcis.map((item) => (
          <TouchableOpacity
            key={item.screen}
            style={[styles.gridItem, { borderColor: item.color }]}
            onPress={() => navigation.navigate(item.screen)}
            activeOpacity={0.8}
          >
            <Text style={styles.gridEmoji}>{item.emoji}</Text>
            <Text style={styles.gridLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7f8' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, paddingTop: 10,
  },
  bienvenue: { fontSize: 14, color: '#6b7b82' },
  appName: { fontSize: 20, fontWeight: '700', color: '#1a2b34' },
  logoutBtn: { paddingVertical: 6, paddingHorizontal: 12 },
  logoutBtnText: { color: '#e74c3c', fontSize: 12, fontWeight: '600' },
  sosSection: {
    alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16,
    borderRadius: 16, paddingVertical: 24, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  sosButton: {
    width: 130, height: 130, borderRadius: 65, backgroundColor: '#e74c3c',
    alignItems: 'center', justifyContent: 'center', elevation: 5,
    shadowColor: '#e74c3c', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, marginTop: 10,
  },
  sosText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  sosSubtitle: { marginTop: 14, fontSize: 13, color: '#6b7b82' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  statusText: { marginLeft: 8, fontSize: 13, color: '#7f8c8d' },
  warning: { fontSize: 12, color: '#e67e22', marginBottom: 8, textAlign: 'center', paddingHorizontal: 20 },
  info: { fontSize: 13, color: '#27ae60', marginBottom: 8, fontWeight: '600' },
  sectionTitle: {
    fontSize: 15, fontWeight: '700', color: '#1a2b34',
    marginHorizontal: 20, marginBottom: 12,
  },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  gridItem: {
    width: '47%', backgroundColor: '#fff', borderRadius: 14,
    paddingVertical: 20, alignItems: 'center', marginBottom: 14,
    borderWidth: 1.5,
  },
  gridEmoji: { fontSize: 30, marginBottom: 8 },
  gridLabel: { fontSize: 13, fontWeight: '600', color: '#1a2b34' },
});
