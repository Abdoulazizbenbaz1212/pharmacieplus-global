import React, { useState, useEffect } from 'react';
import { alertCompatible } from '../utils/alertCompatible';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { doc, getDoc, setDoc, collection } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { signOut } from 'firebase/auth';
import DocumentsMedicaux from '../components/DocumentsMedicaux';

const GROUPES_SANGUINS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

export default function ProfilScreen() {
  const [groupeSanguin, setGroupeSanguin] = useState('');
  const [allergies, setAllergies] = useState('');
  const [maladiesChroniques, setMaladiesChroniques] = useState('');
  const [contactNom, setContactNom] = useState('');
  const [contactTel, setContactTel] = useState('');
  const [loading, setLoading] = useState(true);
  const [enregistrementEnCours, setEnregistrementEnCours] = useState(false);
  const [modeEdition, setModeEdition] = useState(false);
  const [documentsVisible, setDocumentsVisible] = useState(false);

  useEffect(() => {
    chargerProfil();
  }, []);

  const chargerProfil = async () => {
    try {
      const docRef = doc(db, 'profils_medicaux', auth.currentUser.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setGroupeSanguin(data.groupe_sanguin || '');
        setAllergies(data.allergies || '');
        setMaladiesChroniques(data.maladies_chroniques || '');
        setContactNom(data.contact_urgence_nom || '');
        setContactTel(data.contact_urgence_tel || '');
      } else {
        setModeEdition(true);
      }
    } catch (error) {
      console.log('Erreur chargement profil:', error);
    } finally {
      setLoading(false);
    }
  };

  const enregistrerProfil = async () => {
    setEnregistrementEnCours(true);
    try {
      await setDoc(doc(db, 'profils_medicaux', auth.currentUser.uid), {
        groupe_sanguin: groupeSanguin,
        allergies,
        maladies_chroniques: maladiesChroniques,
        contact_urgence_nom: contactNom,
        contact_urgence_tel: contactTel,
        maj_le: new Date().toISOString(),
      });
      alertCompatible('Succes', 'Votre profil medical a ete enregistre');
      setModeEdition(false);
    } catch (error) {
      alertCompatible('Erreur', "Impossible d'enregistrer: " + error.message);
    } finally {
      setEnregistrementEnCours(false);
    }
  };

  const handleDeconnexion = () => {
    alertCompatible('Deconnexion', 'Voulez-vous vraiment vous deconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se deconnecter', style: 'destructive', onPress: () => signOut(auth) },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e74c3c" />
      </View>
    );
  }

  const documentsCollectionRef = collection(db, 'profils_medicaux', auth.currentUser.uid, 'documents');

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>🗂️</Text>
        <Text style={styles.headerTitle}>Coffre-fort medical</Text>
        <Text style={styles.headerSubtitle}>
          Vos informations vitales, accessibles en cas d'urgence
        </Text>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.documentsBtn} onPress={() => setDocumentsVisible(true)}>
          <Text style={styles.documentsBtnText}>📄 Mes documents médicaux</Text>
        </TouchableOpacity>
      </View>

      {!modeEdition ? (
        <View style={styles.viewMode}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Groupe sanguin</Text>
            <Text style={styles.infoValue}>{groupeSanguin || 'Non renseigne'}</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Allergies</Text>
            <Text style={styles.infoValue}>{allergies || 'Aucune renseignee'}</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Maladies chroniques</Text>
            <Text style={styles.infoValue}>{maladiesChroniques || 'Aucune renseignee'}</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Contact d'urgence</Text>
            <Text style={styles.infoValue}>
              {contactNom ? `${contactNom} - ${contactTel}` : 'Non renseigne'}
            </Text>
          </View>

          <TouchableOpacity style={styles.editBtn} onPress={() => setModeEdition(true)}>
            <Text style={styles.editBtnText}>Modifier mes informations</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.editMode}>
          <Text style={styles.label}>Groupe sanguin</Text>
          <View style={styles.groupesRow}>
            {GROUPES_SANGUINS.map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.groupeBtn, groupeSanguin === g && styles.groupeBtnActive]}
                onPress={() => setGroupeSanguin(g)}
              >
                <Text style={[styles.groupeBtnText, groupeSanguin === g && styles.groupeBtnTextActive]}>
                  {g}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Allergies</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Penicilline, arachides"
            value={allergies}
            onChangeText={setAllergies}
            multiline
          />

          <Text style={styles.label}>Maladies chroniques</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Diabete type 2, hypertension"
            value={maladiesChroniques}
            onChangeText={setMaladiesChroniques}
            multiline
          />

          <Text style={styles.label}>Nom du contact d'urgence</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Marie Mballa"
            value={contactNom}
            onChangeText={setContactNom}
          />

          <Text style={styles.label}>Telephone du contact d'urgence</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: +237699887766"
            value={contactTel}
            onChangeText={setContactTel}
            keyboardType="phone-pad"
          />

          {enregistrementEnCours ? (
            <ActivityIndicator size="large" color="#e74c3c" style={{ marginTop: 20 }} />
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

      <DocumentsMedicaux
        visible={documentsVisible}
        onClose={() => setDocumentsVisible(false)}
        collectionRef={documentsCollectionRef}
        titre="Mes documents médicaux"
      />
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
  section: { paddingHorizontal: 15, paddingTop: 15 },
  documentsBtn: {
    backgroundColor: '#3498db', borderRadius: 10, paddingVertical: 14, alignItems: 'center',
  },
  documentsBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  viewMode: { padding: 15 },
  infoCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10,
  },
  infoLabel: { fontSize: 12, fontWeight: '600', color: '#6b7b82', marginBottom: 4 },
  infoValue: { fontSize: 15, color: '#1a2b34', fontWeight: '600' },
  editBtn: {
    backgroundColor: '#16a085', borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginTop: 15,
  },
  editBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  editMode: { padding: 15 },
  label: { fontSize: 14, fontWeight: '700', color: '#2c3e50', marginTop: 15, marginBottom: 8 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
  },
  groupesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  groupeBtn: {
    borderWidth: 1.5, borderColor: '#ddd', borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 16, marginRight: 8, marginBottom: 8,
  },
  groupeBtnActive: { borderColor: '#e74c3c', backgroundColor: '#fdf2f2' },
  groupeBtnText: { fontSize: 14, color: '#2c3e50', fontWeight: '600' },
  groupeBtnTextActive: { color: '#e74c3c' },
  saveBtn: {
    backgroundColor: '#e74c3c', borderRadius: 10, paddingVertical: 15,
    alignItems: 'center', marginTop: 25,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  logoutBtn: { alignItems: 'center', padding: 20, marginBottom: 20 },
  logoutBtnText: { color: '#e74c3c', fontSize: 14, fontWeight: '600' },
});
