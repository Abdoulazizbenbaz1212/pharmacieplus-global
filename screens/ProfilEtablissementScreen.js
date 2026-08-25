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
import * as MediaLibrary from 'expo-media-library';
import ViewShot from 'react-native-view-shot';
import { useRef } from 'react';

export default function ProfilEtablissementScreen() {
  const [nom, setNom] = useState('');
  const [adresse, setAdresse] = useState('');
  const [telephone, setTelephone] = useState('');
  const [horairesParJour, setHorairesParJour] = useState({
    lundi: { ouvert: true, debut: '08:00', fin: '18:00' },
    mardi: { ouvert: true, debut: '08:00', fin: '18:00' },
    mercredi: { ouvert: true, debut: '08:00', fin: '18:00' },
    jeudi: { ouvert: true, debut: '08:00', fin: '18:00' },
    vendredi: { ouvert: true, debut: '08:00', fin: '18:00' },
    samedi: { ouvert: true, debut: '08:00', fin: '13:00' },
    dimanche: { ouvert: false, debut: '08:00', fin: '18:00' },
  });
  const [modeAccueil, setModeAccueil] = useState('fiche');
  const [role, setRole] = useState('');
  const [numeroAgrement, setNumeroAgrement] = useState('');
  const [loading, setLoading] = useState(true);
  const [enregistrementEnCours, setEnregistrementEnCours] = useState(false);
  const [modeEdition, setModeEdition] = useState(false);
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [captureEnCours, setCaptureEnCours] = useState(false);
  const qrRef = useRef(null);
  const [telechargementEnCours, setTelechargementEnCours] = useState(false);

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
        if (data.horairesParJour) { setHorairesParJour(data.horairesParJour); }
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
    if (!nom.trim() || !telephone.trim()) {
      Alert.alert('Champs manquants', 'Merci de remplir le nom et le telephone.');
      return;
    }
    if (!latitude || !longitude) {
      Alert.alert('Position requise', 'Merci de capturer ta position GPS avant d\'enregistrer, pour que les patients puissent te trouver sur la carte.');
      return;
    }
    setEnregistrementEnCours(true);
    try {
      await setDoc(doc(db, 'profils_etablissements', auth.currentUser.uid), {
        nom,
        adresse,
        telephone,
        horairesParJour,
        modeAccueil,
        numeroAgrement,
        role,
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

  const telechargerQrCode = async () => {
    setTelechargementEnCours(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusee', "Autorise l'acces aux photos pour enregistrer le QR code.");
        return;
      }
      const uri = await qrRef.current.capture();
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Succes', 'Le QR code a ete enregistre dans ta galerie.');
    } catch (error) {
      Alert.alert('Erreur', "Impossible d'enregistrer le QR code: " + error.message);
    } finally {
      setTelechargementEnCours(false);
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
            {['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'].map((jour) => (
              <Text key={jour} style={styles.infoValue}>
                {jour.charAt(0).toUpperCase() + jour.slice(1)} : {horairesParJour[jour] && horairesParJour[jour].ouvert ? `${horairesParJour[jour].debut} - ${horairesParJour[jour].fin}` : 'Ferme'}
              </Text>
            ))}
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
              <ViewShot ref={qrRef} options={{ format: 'png', quality: 1 }}>
                <View style={{ backgroundColor: '#fff', padding: 15, alignItems: 'center' }}>
                  <QRCode
                    value={JSON.stringify({
                      etablissementId: auth.currentUser.uid,
                      nom,
                      mode: modeAccueil,
                    })}
                    size={180}
                  />
                  <Text style={styles.qrLabel}>{nom}</Text>
                </View>
              </ViewShot>
              <TouchableOpacity
                style={styles.telechargerBtn}
                onPress={telechargerQrCode}
                disabled={telechargementEnCours}
              >
                {telechargementEnCours ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.telechargerBtnText}>Telecharger le QR code</Text>
                )}
              </TouchableOpacity>
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
          {['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'].map((jour) => (
            <View key={jour} style={{ marginBottom: 10, padding: 10, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontWeight: 'bold' }}>{jour.charAt(0).toUpperCase() + jour.slice(1)}</Text>
                <TouchableOpacity
                  onPress={() => setHorairesParJour({
                    ...horairesParJour,
                    [jour]: { ...horairesParJour[jour], ouvert: !horairesParJour[jour].ouvert },
                  })}
                  style={{
                    paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6,
                    backgroundColor: horairesParJour[jour].ouvert ? '#1a7f5a' : '#c0392b',
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 12 }}>{horairesParJour[jour].ouvert ? 'Ouvert' : 'Ferme'}</Text>
                </TouchableOpacity>
              </View>
              {horairesParJour[jour].ouvert && (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    placeholder="08:00"
                    value={horairesParJour[jour].debut}
                    onChangeText={(v) => setHorairesParJour({
                      ...horairesParJour,
                      [jour]: { ...horairesParJour[jour], debut: v },
                    })}
                  />
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    placeholder="18:00"
                    value={horairesParJour[jour].fin}
                    onChangeText={(v) => setHorairesParJour({
                      ...horairesParJour,
                      [jour]: { ...horairesParJour[jour], fin: v },
                    })}
                  />
                </View>
              )}
            </View>
          ))}
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
  telechargerBtn: { backgroundColor: '#9b59b6', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 20, marginTop: 12, alignItems: 'center' },
  telechargerBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
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
