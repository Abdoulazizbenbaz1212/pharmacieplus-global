import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

function calculerDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(1);
}

export default function HopitauxScreen() {
  const [position, setPosition] = useState(null);
  const [hopitaux, setHopitaux] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        // 1. Récupérer la position de l'utilisateur
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({});
          setPosition(pos.coords);
        }

        // 2. Récupérer les hôpitaux depuis Firestore
        const querySnapshot = await getDocs(collection(db, 'hopitaux'));
        const liste = [];
        querySnapshot.forEach((doc) => {
          liste.push({ id: doc.id, ...doc.data() });
        });
        setHopitaux(liste);

        if (liste.length === 0) {
          setErrorMsg('Aucun hôpital enregistré pour le moment.');
        }
      } catch (error) {
        setErrorMsg('Erreur de chargement: ' + error.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const appelerHopital = (telephone) => {
    Linking.openURL(`tel:${telephone}`);
  };

  const hopitauxAvecDistance = hopitaux
    .map((h) => ({
      ...h,
      distance: position ? calculerDistance(position.latitude, position.longitude, h.lat, h.lng) : null,
    }))
    .sort((a, b) => (a.distance || 0) - (b.distance || 0));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e74c3c" />
        <Text>Chargement des hôpitaux...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: position ? position.latitude : 4.0511,
          longitude: position ? position.longitude : 9.7679,
          latitudeDelta: 0.5,
          longitudeDelta: 0.5,
        }}
      >
        {position && (
          <Marker
            coordinate={{ latitude: position.latitude, longitude: position.longitude }}
            title="Vous êtes ici"
            pinColor="blue"
          />
        )}
        {hopitauxAvecDistance.map((h) => (
          <Marker
            key={h.id}
            coordinate={{ latitude: h.lat, longitude: h.lng }}
            title={h.nom}
            description={h.urgence24h ? 'Urgences 24h/24' : 'Horaires normaux'}
            pinColor={h.urgence24h ? 'red' : 'orange'}
          />
        ))}
      </MapView>

      {errorMsg && <Text style={styles.warning}>{errorMsg}</Text>}

      <FlatList
        style={styles.list}
        data={hopitauxAvecDistance}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.nom}>{item.nom}</Text>
              <Text style={styles.details}>
                {item.distance ? `${item.distance} km` : 'Distance inconnue'}
                {item.urgence24h ? ' • Urgences 24h/24' : ''}
              </Text>
            </View>
            <TouchableOpacity style={styles.callBtn} onPress={() => appelerHopital(item.telephone)}>
              <Text style={styles.callBtnText}>📞 Appeler</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  map: { flex: 1 },
  list: { flex: 1, backgroundColor: '#fff' },
  warning: {
    padding: 10,
    textAlign: 'center',
    color: '#e67e22',
    backgroundColor: '#fff',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  nom: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50' },
  details: { fontSize: 13, color: '#7f8c8d', marginTop: 4 },
  callBtn: {
    backgroundColor: '#27ae60',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  callBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
});
