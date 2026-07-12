import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

// Données d'exemple - à remplacer par Firestore plus tard
const HOPITAUX_EXEMPLE = [
  { id: '1', nom: 'Hôpital Laquintinie', lat: 4.0611, lng: 9.7043, telephone: '+237233421234', urgence24h: true },
  { id: '2', nom: 'Hôpital Général de Douala', lat: 4.0483, lng: 9.7370, telephone: '+237233422345', urgence24h: true },
  { id: '3', nom: 'Clinique des Cocotiers', lat: 4.0435, lng: 9.7050, telephone: '+237233423456', urgence24h: false },
];

function calculerDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Rayon Terre en km
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({});
          setPosition(pos.coords);
        }
      } catch (error) {
        console.log('Erreur position:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const appelerHopital = (telephone) => {
    Linking.openURL(`tel:${telephone}`);
  };

  const hopitauxAvecDistance = HOPITAUX_EXEMPLE.map((h) => ({
    ...h,
    distance: position ? calculerDistance(position.latitude, position.longitude, h.lat, h.lng) : null,
  })).sort((a, b) => (a.distance || 0) - (b.distance || 0));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e74c3c" />
        <Text>Localisation en cours...</Text>
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
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
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
