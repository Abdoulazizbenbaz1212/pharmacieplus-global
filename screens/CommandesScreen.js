import React, { useState, useEffect, useCallback } from 'react';
import { alertCompatible } from '../utils/alertCompatible';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal, Keyboard, Platform,
} from 'react-native';
import {
  collection, query, where, getDocs, doc, addDoc, updateDoc, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';

const ETAPES = [
  { id: 'preparee', label: 'Preparee', emoji: '📦' },
  { id: 'en_livraison', label: 'En livraison', emoji: '🚴' },
  { id: 'livree', label: 'Livree', emoji: '✅' },
];

function etapeInfo(statut) {
  return ETAPES.find(e => e.id === statut) || ETAPES[0];
}

export default function CommandesScreen() {
  const [role, setRole] = useState('');
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [hauteurClavier, setHauteurClavier] = useState(0);

  useEffect(() => {
    const evtShow = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const evtHide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const subShow = Keyboard.addListener(evtShow, (e) => {
      setHauteurClavier(e.endCoordinates.height);
    });
    const subHide = Keyboard.addListener(evtHide, () => {
      setHauteurClavier(0);
    });

    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);
  const [emailClient, setEmailClient] = useState('');
  const [telephoneClient, setTelephoneClient] = useState('');
  const [description, setDescription] = useState('');
  const [creation, setCreation] = useState(false);

  const chargerCommandes = useCallback(async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDocs(query(
        collection(db, 'utilisateurs'),
        where('__name__', '==', user.uid)
      ));
      let monRole = 'patient';
      userDoc.forEach((d) => { monRole = d.data().role || 'patient'; });
      setRole(monRole);

      const champ = monRole === 'patient' ? 'clientId' : 'vendeurId';
      const q = query(collection(db, 'commandes'), where(champ, '==', user.uid));
      const snap = await getDocs(q);
      const liste = [];
      snap.forEach((d) => liste.push({ id: d.id, ...d.data() }));
      liste.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
      setCommandes(liste);
    } catch (error) {
      console.log('Erreur chargement commandes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    chargerCommandes();
  }, [chargerCommandes]);

  async function creerCommande() {
    if (!emailClient.trim() || !description.trim()) {
      alertCompatible('Champs manquants', "Merci de remplir l'email du client et la description.");
      return;
    }
    setCreation(true);
    try {
      const user = auth.currentUser;
      const clientSnap = await getDocs(query(
        collection(db, 'utilisateurs'),
        where('email', '==', emailClient.trim())
      ));
      if (clientSnap.empty) {
        alertCompatible('Client introuvable', "Aucun utilisateur n'a cet email.");
        setCreation(false);
        return;
      }
      let clientId = '';
      clientSnap.forEach((d) => { clientId = d.id; });

      const vendeurDoc = await getDocs(query(
        collection(db, 'utilisateurs'),
        where('__name__', '==', user.uid)
      ));
      let vendeurNom = '';
      vendeurDoc.forEach((d) => { vendeurNom = d.data().nom || ''; });

      await addDoc(collection(db, 'commandes'), {
        clientId,
        clientEmail: emailClient.trim(),
        clientTelephone: telephoneClient.trim(),
        vendeurId: user.uid,
        vendeurNom,
        description: description.trim(),
        statut: 'preparee',
        createdAtMs: Date.now(),
        createdAt: serverTimestamp(),
      });
      setModalVisible(false);
      setEmailClient('');
      setTelephoneClient('');
      setDescription('');
      chargerCommandes();
      alertCompatible('Succes', 'Commande creee.');
    } catch (error) {
      alertCompatible('Erreur', error.message);
    } finally {
      setCreation(false);
    }
  }

  async function changerStatut(commandeId, nouveauStatut) {
    try {
      await updateDoc(doc(db, 'commandes', commandeId), { statut: nouveauStatut });
      chargerCommandes();
    } catch (error) {
      alertCompatible('Erreur', error.message);
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#16a085" /></View>;
  }

  return (
    <View style={styles.container}>
      {role !== 'patient' && (
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.addBtnText}>+ Nouvelle commande</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={commandes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 15 }}
        ListEmptyComponent={<Text style={styles.emptyText}>Aucune commande pour le moment</Text>}
        renderItem={({ item }) => {
          const etape = etapeInfo(item.statut);
          return (
            <View style={styles.card}>
              <Text style={styles.cardDesc}>{item.description}</Text>
              <Text style={styles.cardSousTitre}>
                {role === 'patient' ? `Vendeur: ${item.vendeurNom}` : `Client: ${item.clientEmail}`}
              </Text>

              <View style={styles.etapesRow}>
                {ETAPES.map((e, idx) => {
                  const atteinte = ETAPES.findIndex(x => x.id === item.statut) >= idx;
                  return (
                    <View key={e.id} style={styles.etapeItem}>
                      <View style={[styles.etapePoint, atteinte && styles.etapePointActive]}>
                        <Text style={{ fontSize: 14 }}>{e.emoji}</Text>
                      </View>
                      <Text style={[styles.etapeLabel, atteinte && styles.etapeLabelActive]}>{e.label}</Text>
                    </View>
                  );
                })}
              </View>

              {role !== 'patient' && item.statut !== 'livree' && (
                <TouchableOpacity
                  style={styles.avancerBtn}
                  onPress={() => {
                    const idxActuel = ETAPES.findIndex(e => e.id === item.statut);
                    const suivante = ETAPES[idxActuel + 1];
                    if (suivante) changerStatut(item.id, suivante.id);
                  }}
                >
                  <Text style={styles.avancerBtnText}>Passer a l'etape suivante</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { marginBottom: hauteurClavier }]}>
            <Text style={styles.modalTitle}>Nouvelle commande</Text>

            <Text style={styles.modalLabel}>Email du client</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="client@email.com"
              value={emailClient}
              onChangeText={setEmailClient}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.modalLabel}>Telephone du client (optionnel)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: 699887766"
              value={telephoneClient}
              onChangeText={setTelephoneClient}
              keyboardType="phone-pad"
            />

            <Text style={styles.modalLabel}>Description</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Paracetamol x2, Vitamine C"
              value={description}
              onChangeText={setDescription}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={creerCommande} disabled={creation}>
                {creation ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSaveText}>Creer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7f8' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  addBtn: {
    backgroundColor: '#16a085', margin: 15, marginBottom: 0,
    borderRadius: 10, paddingVertical: 14, alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  emptyText: { textAlign: 'center', color: '#7f8c8d', marginTop: 40 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  cardDesc: { fontSize: 14, fontWeight: '700', color: '#1a2b34' },
  cardSousTitre: { fontSize: 12, color: '#6b7b82', marginTop: 4, marginBottom: 12 },
  etapesRow: { flexDirection: 'row', justifyContent: 'space-between' },
  etapeItem: { alignItems: 'center', flex: 1 },
  etapePoint: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: '#eee',
    alignItems: 'center', justifyContent: 'center',
  },
  etapePointActive: { backgroundColor: '#d4efdf' },
  etapeLabel: { fontSize: 10, color: '#a0a8b0', marginTop: 4, textAlign: 'center' },
  etapeLabelActive: { color: '#16a085', fontWeight: '700' },
  avancerBtn: {
    backgroundColor: '#eafaf1', borderRadius: 8, paddingVertical: 10,
    alignItems: 'center', marginTop: 14,
  },
  avancerBtnText: { color: '#16a085', fontWeight: '700', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1a2b34', marginBottom: 15 },
  modalLabel: { fontSize: 13, fontWeight: '700', color: '#2c3e50', marginTop: 10, marginBottom: 6 },
  modalInput: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
  },
  modalActions: { flexDirection: 'row', marginTop: 20, gap: 10 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: '#f4f7f8',
  },
  modalCancelText: { color: '#6b7b82', fontWeight: '700' },
  modalSaveBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: '#16a085',
  },
  modalSaveText: { color: '#fff', fontWeight: '700' },
});
