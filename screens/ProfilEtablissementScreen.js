import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { signOut } from 'firebase/auth';
import QRCode from 'react-native-qrcode-svg';
import * as Location from 'expo-location';

export default function ProfilEtablissementScreen() {
  const [nom, setNom] = useState('');
  const [adresse, setAdresse] = useState('');
  const [telephone, setTelephone] = useState('');
  const [horaires, setHoraires] = useState('');
  const [modeAccueil, setModeAccueil] = useState('fiche');
  const [role, setRole] = useState('');
  const [numeroAgrement, setNumeroAgrement] = useState('');
  const [loading, setLoading] = useState(true);
  const [enregistrementEnCours, setEnregistrementEnCours] = useState(false);
  const [modeEdition, setModeEdition] = useState(false);
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [captureEnCours, setCaptureEnCours] = useState(false);

  useEffect(() => {
    chargerProfil();
  }, []);

  const chargerProfil = async () => {
    try {
      const userSnap = await getDoc(doc(db, 'utilisateurs', auth.currentUser.uid));
      if (userSnap.exists()) setRole(userSnap.data().role || '');
      const docRef = doc(db, 'profils_etablissements', auth.currentUser.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setNom(data.nom || '');
        setAdresse(data.adresse || '');
        setTelephone(data.telephone || '');
        setHoraires(data.horaires || '');
        setModeAccueil(data.modeAccueil || 'fiche');
        setNumeroAgrement(data.numeroAgrement || '');
        setLatitude(data.latitude || null);
        setLongitude(data.longitude || null);
      } else {
        setModeEdition(true);
      }
    } catch (error) {
      console.log('Erreur chargement profil etablissement:', error);
    } finally {
      setLoading(false);
    }
  };

  const enregistrerProfil = async () => {
    setEnregistrementEnCours(true);
    try {
      await setDoc(doc(db, 'profils_etablissements', auth.currentUser.uid), {
        nom,
        adresse,
        telephone,
        horaires,
        modeAccueil,
        numeroAgrement,
        latitude,
        longitude,
        maj_le: new Date().toISOString(),
      });
      Alert.alert('Succes', 'Votre profil a ete enregistre');
      setModeEdition(false);
    } catch (error) {
      Alert.alert('Erreur', "Impossible d'enregistrer: " + error.message);
    } finally {
      setEnregistrementEnCours(false);
    }
  };

  const handleDeconnexion = () => {
    Alert.alert('Deconnexion', 'Voulez-vous vraiment vous deconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se deconnecter', style: 'destructive', onPress: () => signOut(auth) },
    ]);
  };


  const capturerPosition = async () => {
    setCaptureEnCours(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusee', 'Active la localisation pour enregistrer ta position.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      setLatitude(pos.coords.latitude);
      setLongitude(pos.coords.longitude);
      Alert.alert('Position capturee', "Ta position a ete enregistree. N'oublie pas de sauvegarder.");
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de recuperer la position: ' + error.message);
    } finally {
      setCaptureEnCours(false);
    }
  };
  const modeAccueilLabel = (m) => {
    if (m === 'rdv') return 'Prise de RDV / Commande directe';
    if (m === 'contact') return 'Juste les coordonnees';
    return 'Fiche complete';
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>🏢</Text>
        <Text style={styles.headerTitle}>Profil de l'etablissement</Text>
        <Text style={styles.headerSubtitle}>
          Vos informations professionnelles
        </Text>
      </View>

      {!modeEdition ? (
        <View style={styles.viewMode}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Nom</Text>
            <Text style={styles.infoValue}>{nom || 'Non renseigne'}</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Adresse</Text>
            <Text style={styles.infoValue}>{adresse || 'Non renseignee'}</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Telephone</Text>
            <Text style={styles.infoValue}>{telephone || 'Non renseigne'}</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Horaires</Text>
            <Text style={styles.infoValue}>{horaires || 'Non renseignes'}</Text>
          </View>

          {role === 'pharmacie' && (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Numero d'agrement / licence professionnelle</Text>
              <Text style={styles.infoValue}>{numeroAgrement || 'Non renseigne'}</Text>
              {!numeroAgrement && (
                <Text style={styles.avertissement}>
                  ⚠️ Requis pour la conformite reglementaire dans votre pays
                </Text>
              )}
            </View>
          )}

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Mode d'accueil du QR code</Text>
            <Text style={styles.infoValue}>{modeAccueilLabel(modeAccueil)}</Text>
          </View>

          {nom ? (
            <View style={styles.qrCard}>
              <QRCode
                value={JSON.stringify({
                  etablissementId: auth.currentUser.uid,
                  nom,
                  mode: modeAccueil,
                })}
                size={180}
              />
              <Text style={styles.qrLabel}>Mon QR code etablissement</Text>
            </View>
          ) : null}

          <TouchableOpacity style={styles.editBtn} onPress={() => setModeEdition(true)}>
            <Text style={styles.editBtnText}>Modifier mes informations</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.editMode}>
          <Text style={styles.label}>Nom de l'etablissement</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Pharmacie Centrale Bertoua"
            value={nom}
            onChangeText={setNom}
          />

          <Text style={styles.label}>Adresse</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Avenue de l'Independance, Bertoua"
            value={adresse}
            onChangeText={setAdresse}
          />

          <Text style={styles.label}>Telephone</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: +237699887766"
            value={telephone}
            onChangeText={setTelephone}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Horaires d'ouverture</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Lun-Sam 8h-19h"
            value={horaires}
            onChangeText={setHoraires}
          />

          {role === 'pharmacie' && (
            <>
              <Text style={styles.label}>Numero d'agrement / licence professionnelle</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: numero delivre par l'ordre des pharmaciens"
                value={numeroAgrement}
                onChangeText={setNumeroAgrement}
              />
            </>
          )}

          <Text style={styles.label}>Position GPS (pour te faire trouver sur la carte)</Text>
          <TouchableOpacity
            style={styles.gpsBtn}
            onPress={capturerPosition}
            disabled={captureEnCours}
          >
            {captureEnCours ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.gpsBtnText}>
                {latitude ? '📍 Position enregistree - Recapturer' : '📍 Capturer ma position actuelle'}
              </Text>
            )}
          </TouchableOpacity>

          <Text style={styles.label}>Quand un client scanne mon QR code</Text>
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeBtn, modeAccueil === 'fiche' && styles.modeBtnActive]}
              onPress={() => setModeAccueil('fiche')}
            >
              <Text style={[styles.modeBtnText, modeAccueil === 'fiche' && styles.modeBtnTextActive]}>
                Fiche complete
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, modeAccueil === 'rdv' && styles.modeBtnActive]}
              onPress={() => setModeAccueil('rdv')}
            >
              <Text style={[styles.modeBtnText, modeAccueil === 'rdv' && styles.modeBtnTextActive]}>
                RDV / Commande
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, modeAccueil === 'contact' && styles.modeBtnActive]}
              onPress={() => setModeAccueil('contact')}
            >
              <Text style={[styles.modeBtnText, modeAccueil === 'contact' && styles.modeBtnTextActive]}>
                Juste contact
              </Text>
            </TouchableOpacity>
          </View>

          {enregistrementEnCours ? (
            <ActivityIndicator size="large" color="#3498db" style={{ marginTop: 20 }} />
          ) : (
            <TouchableOpacity style={styles.saveBtn} onPress={enregistrerProfil}>
              <Text style={styles.saveBtnText}>Enregistrer</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <TouchableOpacity style={styles.logoutBtn} onPress={handleDeconnexion}>
        <Text style={styles.logoutBtnText}>Se deconnecter</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7f8' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { alignItems: 'center', padding: 25, backgroundColor: '#fff' },
  headerEmoji: { fontSize: 40, marginBottom: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1a2b34' },
  headerSubtitle: { fontSize: 13, color: '#6b7b82', textAlign: 'center', marginTop: 6 },
  viewMode: { padding: 15 },
  infoCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10,
  },
  infoLabel: { fontSize: 12, fontWeight: '600', color: '#6b7b82', marginBottom: 4 },
  infoValue: { fontSize: 15, color: '#1a2b34', fontWeight: '600' },
  avertissement: { fontSize: 12, color: '#e67e22', marginTop: 6, fontWeight: '600' },
  qrCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 10, alignItems: 'center',
  },
  qrLabel: { marginTop: 10, fontSize: 13, color: '#6b7b82', fontWeight: '600' },
  editBtn: {
    backgroundColor: '#3498db', borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginTop: 15,
  },
  editBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  gpsBtn: { backgroundColor: '#3498db', padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 20 },
  gpsBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  editMode: { padding: 15 },
  label: { fontSize: 14, fontWeight: '700', color: '#2c3e50', marginTop: 15, marginBottom: 8 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
  },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center',
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd',
  },
  modeBtnActive: { backgroundColor: '#3498db', borderColor: '#3498db' },
  modeBtnText: { fontSize: 12, fontWeight: '700', color: '#6b7b82', textAlign: 'center' },
  modeBtnTextActive: { color: '#fff' },
  saveBtn: {
    backgroundColor: '#3498db', borderRadius: 10, paddingVertical: 15,
    alignItems: 'center', marginTop: 25,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  logoutBtn: { alignItems: 'center', padding: 20, marginBottom: 20 },
  logoutBtnText: { color: '#3498db', fontSize: 14, fontWeight: '600' },
});
