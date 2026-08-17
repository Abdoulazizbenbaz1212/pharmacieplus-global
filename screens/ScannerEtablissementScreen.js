import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function ScannerEtablissementScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanEnCours, setScanEnCours] = useState(true);
  const [chargement, setChargement] = useState(false);
  const [etablissement, setEtablissement] = useState(null);
  const [erreur, setErreur] = useState('');

  const relancerScan = () => {
    setEtablissement(null);
    setErreur('');
    setScanEnCours(true);
  };

  const onScan = async ({ data }) => {
    if (!scanEnCours) return;
    setScanEnCours(false);
    setChargement(true);
    setErreur('');
    try {
      const info = JSON.parse(data);
      if (!info.etablissementId) {
        setErreur("Ce QR code n'est pas reconnu par Pharmacie+ Global.");
        setChargement(false);
        return;
      }
      const docSnap = await getDoc(doc(db, 'profils_etablissements', info.etablissementId));
      if (!docSnap.exists()) {
        setErreur('Etablissement introuvable.');
        setChargement(false);
        return;
      }
      setEtablissement({ id: info.etablissementId, ...docSnap.data() });
    } catch (e) {
      setErreur("Ce QR code n'est pas reconnu par Pharmacie+ Global.");
    } finally {
      setChargement(false);
    }
  };

  if (!permission) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#e74c3c" /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>Autorise l'acces a la camera pour scanner un QR code.</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Autoriser la camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (chargement) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e74c3c" />
        <Text style={{ marginTop: 10, color: '#6b7b82' }}>Recherche de l'etablissement...</Text>
      </View>
    );
  }

  if (erreur) {
    return (
      <View style={styles.center}>
        <Text style={styles.erreurText}>{erreur}</Text>
        <TouchableOpacity style={styles.permBtn} onPress={relancerScan}>
          <Text style={styles.permBtnText}>Scanner a nouveau</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (etablissement) {
    const mode = etablissement.modeAccueil || 'fiche';
    return (
      <View style={styles.container}>
        <View style={styles.resultHeader}>
          <Text style={styles.resultEmoji}>🏢</Text>
          <Text style={styles.resultNom}>{etablissement.nom}</Text>
        </View>

        {(mode === 'fiche' || mode === 'rdv') && (
          <>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Adresse</Text>
              <Text style={styles.infoValue}>{etablissement.adresse || 'Non renseignee'}</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Horaires</Text>
              <Text style={styles.infoValue}>{etablissement.horaires || 'Non renseignes'}</Text>
            </View>
          </>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Telephone</Text>
          <Text style={styles.infoValue}>{etablissement.telephone || 'Non renseigne'}</Text>
        </View>

        {mode === 'rdv' && (
          <View style={styles.rdvNote}>
            <Text style={styles.rdvNoteText}>
              Pour prendre rendez-vous ou passer commande, va dans l'onglet RDV ou Marketplace et selectionne cet etablissement.
            </Text>
          </View>
        )}

        {etablissement.telephone ? (
          <TouchableOpacity
            style={styles.callBtn}
            onPress={() => Linking.openURL(`tel:${etablissement.telephone}`)}
          >
            <Text style={styles.callBtnText}>📞 Appeler</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity style={styles.permBtn} onPress={relancerScan}>
          <Text style={styles.permBtnText}>Scanner un autre QR code</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={onScan}
      />
      <View style={styles.overlay}>
        <View style={styles.cadre} />
        <Text style={styles.overlayText}>Vise le QR code de l'etablissement</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
  permText: { textAlign: 'center', color: '#6b7b82', fontSize: 15, marginBottom: 20 },
  permBtn: { backgroundColor: '#e74c3c', borderRadius: 10, paddingVertical: 14, paddingHorizontal: 25, marginTop: 15 },
  permBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  erreurText: { textAlign: 'center', color: '#e74c3c', fontSize: 15, marginBottom: 10 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cadre: { width: 240, height: 240, borderWidth: 3, borderColor: '#fff', borderRadius: 16 },
  overlayText: { color: '#fff', marginTop: 20, fontSize: 14, fontWeight: '600' },
  resultHeader: { alignItems: 'center', backgroundColor: '#fff', padding: 25 },
  resultEmoji: { fontSize: 40, marginBottom: 8 },
  resultNom: { fontSize: 20, fontWeight: '700', color: '#1a2b34' },
  infoCard: { backgroundColor: '#f4f7f8', margin: 10, marginBottom: 0, borderRadius: 12, padding: 16 },
  infoLabel: { fontSize: 12, fontWeight: '600', color: '#6b7b82', marginBottom: 4 },
  infoValue: { fontSize: 15, color: '#1a2b34', fontWeight: '600' },
  rdvNote: { backgroundColor: '#eaf2fd', margin: 10, borderRadius: 12, padding: 14 },
  rdvNoteText: { color: '#3498db', fontSize: 13, fontWeight: '600' },
  callBtn: { backgroundColor: '#27ae60', margin: 10, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  callBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
