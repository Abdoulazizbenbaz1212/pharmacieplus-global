import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
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

function construireHtmlCarte(centreLat, centreLng, position, hopitaux) {
  const marqueursHopitaux = hopitaux.map(h => `
    L.marker([${h.lat}, ${h.lng}], {
      icon: L.divIcon({
        html: '<div style="background:${h.urgence24h ? '#e74c3c' : '#f39c12'};width:14px;height:14px;border-radius:7px;border:2px solid white;"></div>',
        iconSize: [14, 14],
        className: ''
      })
    }).addTo(map).bindPopup(${JSON.stringify(h.nom)} + '${h.urgence24h ? " (Urgences 24h/24)" : ""}');
  `).join('\n');

  const marqueurPosition = position ? `
    L.marker([${position.latitude}, ${position.longitude}], {
      icon: L.divIcon({
        html: '<div style="background:#3498db;width:16px;height:16px;border-radius:8px;border:2px solid white;"></div>',
        iconSize: [16, 16],
        className: ''
      })
    }).addTo(map).bindPopup('Vous etes ici');
  ` : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style> body { margin: 0; padding: 0; } #map { width: 100vw; height: 100vh; } </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map').setView([${centreLat}, ${centreLng}], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    ${marqueurPosition}
    ${marqueursHopitaux}
  </script>
</body>
</html>
  `;
}

export default function HopitauxScreen() {
  const [position, setPosition] = useState(null);
  const [hopitaux, setHopitaux] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({});
          setPosition(pos.coords);
        }

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

  const centreLat = position ? position.latitude : 4.0511;
  const centreLng = position ? position.longitude : 9.7679;
  const htmlCarte = construireHtmlCarte(centreLat, centreLng, position, hopitauxAvecDistance);

  return (
    <View style={styles.container}>
      <View style={styles.map}>
        <WebView
          source={{ html: htmlCarte }}
          style={{ flex: 1 }}
          javaScriptEnabled
          domStorageEnabled
        />
      </View>

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
