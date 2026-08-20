import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { collection, getDocs, query, where } from 'firebase/firestore';
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

const SERVEURS_OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
];

async function chercherEtablissementsProches(latitude, longitude, rayonMetres = 10000) {
  const requete = `
    [out:json][timeout:25];
    (
      node["amenity"="hospital"](around:${rayonMetres},${latitude},${longitude});
      node["amenity"="clinic"](around:${rayonMetres},${latitude},${longitude});
      node["amenity"="pharmacy"](around:${rayonMetres},${latitude},${longitude});
      way["amenity"="hospital"](around:${rayonMetres},${latitude},${longitude});
      way["amenity"="clinic"](around:${rayonMetres},${latitude},${longitude});
    );
    out center;
  `;

  let derniereErreur = null;

  for (const url of SERVEURS_OVERPASS) {
    try {
      const controleur = new AbortController();
      const minuteur = setTimeout(() => controleur.abort(), 20000);

      const reponse = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: 'data=' + encodeURIComponent(requete),
        signal: controleur.signal,
      });
      clearTimeout(minuteur);

      if (!reponse.ok) {
        derniereErreur = new Error(`Serveur a repondu avec le code ${reponse.status}`);
        continue;
      }

      const texteReponse = await reponse.text();
      let data;
      try {
        data = JSON.parse(texteReponse);
      } catch {
        derniereErreur = new Error('Reponse invalide (surcharge probable)');
        continue;
      }

      return data.elements
        .map((el) => {
          const lat = el.lat || (el.center && el.center.lat);
          const lng = el.lon || (el.center && el.center.lon);
          if (!lat || !lng) return null;
          return {
            id: String(el.id),
            nom: (el.tags && el.tags.name) || 'Établissement de santé',
            type: (el.tags && el.tags.amenity) || 'hospital',
            telephone: (el.tags && (el.tags.phone || el.tags['contact:phone'])) || null,
            lat,
            lng,
          };
        })
        .filter(Boolean);
    } catch (erreur) {
      derniereErreur = erreur;
    }
  }

  throw derniereErreur || new Error('Impossible de contacter les serveurs de recherche.');
}

async function chercherEtablissementsFirestore(latitude, longitude, rayonKm = 10) {
  try {
    const q = query(
      collection(db, 'profils_etablissements'),
      where('latitude', '!=', null)
    );
    const snap = await getDocs(q);
    const resultats = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (!data.latitude || !data.longitude) return;
      const distance = parseFloat(
        calculerDistance(latitude, longitude, data.latitude, data.longitude)
      );
      if (distance <= rayonKm) {
        resultats.push({
          id: 'app_' + docSnap.id,
          nom: data.nom || 'Etablissement',
          type: data.role === 'pharmacie' ? 'pharmacy' : data.role === 'hopital' ? 'hospital' : 'clinic',
          telephone: data.telephone || null,
          lat: data.latitude,
          lng: data.longitude,
          source: 'app',
        });
      }
    });
    return resultats;
  } catch (erreur) {
    return [];
  }
}

function construireHtmlCarte(centreLat, centreLng, position, etablissements) {
  const couleurParType = {
    hospital: '#e74c3c',
    clinic: '#f39c12',
    pharmacy: '#27ae60',
  };

  const marqueursCorriges = etablissements.map(e => `
    L.marker([${e.lat}, ${e.lng}], {
      icon: L.divIcon({
        html: '<div style="background:${couleurParType[e.type] || "#7f8c8d"};width:14px;height:14px;border-radius:7px;border:3px solid ${e.source === "app" ? "#f1c40f" : "white"};"></div>',
        iconSize: [14, 14],
        className: ''
      })
    }).addTo(map).bindPopup(${JSON.stringify(e.nom)});
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
    var map = L.map('map').setView([${centreLat}, ${centreLng}], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    ${marqueurPosition}
    ${marqueursCorriges}
  </script>
</body>
</html>
  `;
}

export default function HopitauxScreen() {
  const [position, setPosition] = useState(null);
  const [etablissements, setEtablissements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recherche, setRecherche] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const lancerRecherche = useCallback(async (coords) => {
    setRecherche(true);
    setErrorMsg(null);
    try {
      const [listeOsm, listeApp] = await Promise.all([
        chercherEtablissementsProches(coords.latitude, coords.longitude).catch(() => []),
        chercherEtablissementsFirestore(coords.latitude, coords.longitude),
      ]);
      const listeCombinee = [...listeApp, ...listeOsm];
      setEtablissements(listeCombinee);
      if (listeCombinee.length === 0) {
        setErrorMsg('Aucun établissement de santé trouvé dans un rayon de 10 km.');
      }
    } catch (erreurRecherche) {
      setErrorMsg('Le service de recherche est momentanément indisponible.');
    } finally {
      setRecherche(false);
    }
  }, []);


  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Active la localisation pour voir les établissements autour de toi.');
          setLoading(false);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({});
        setPosition(pos.coords);
        await lancerRecherche(pos.coords);
      } catch (error) {
        setErrorMsg('Erreur de localisation: ' + error.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [lancerRecherche]);

  const appelerEtablissement = (telephone) => {
    if (!telephone) return;
    Linking.openURL(`tel:${telephone}`);
  };

  const etablissementsAvecDistance = etablissements
    .map((e) => ({
      ...e,
      distance: position ? calculerDistance(position.latitude, position.longitude, e.lat, e.lng) : null,
    }))
    .sort((a, b) => (a.distance || 0) - (b.distance || 0));

  const labelType = { hospital: 'Hôpital', clinic: 'Clinique', pharmacy: 'Pharmacie' };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e74c3c" />
        <Text>Recherche des établissements autour de toi...</Text>
      </View>
    );
  }

  const centreLat = position ? position.latitude : 4.0511;
  const centreLng = position ? position.longitude : 9.7679;
  const htmlCarte = construireHtmlCarte(centreLat, centreLng, position, etablissementsAvecDistance);

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

      {errorMsg && (
        <View style={styles.warningBox}>
          <Text style={styles.warning}>{errorMsg}</Text>
          {position && (
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => lancerRecherche(position)}
              disabled={recherche}
            >
              {recherche ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.retryBtnText}>🔄 Réessayer</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      <FlatList
        style={styles.list}
        data={etablissementsAvecDistance}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.nom}>{item.nom}</Text>
              <Text style={styles.details}>
                {labelType[item.type] || 'Établissement'}
                {item.distance ? ` • ${item.distance} km` : ''}
              </Text>
            </View>
            {item.telephone && (
              <TouchableOpacity style={styles.callBtn} onPress={() => appelerEtablissement(item.telephone)}>
                <Text style={styles.callBtnText}>📞 Appeler</Text>
              </TouchableOpacity>
            )}
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
  warningBox: {
    padding: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  warning: {
    textAlign: 'center',
    color: '#e67e22',
    marginBottom: 8,
  },
  retryBtn: {
    backgroundColor: '#3498db',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
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
