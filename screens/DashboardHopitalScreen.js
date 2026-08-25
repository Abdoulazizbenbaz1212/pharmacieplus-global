import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal,
} from 'react-native';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export default function DashboardHopitalScreen({ navigation }) {
  const [rdvListe, setRdvListe] = useState([]);
  const [mesServices, setMesServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nomHopital, setNomHopital] = useState('');
  const [onglet, setOnglet] = useState('rdv');
  const [modalVisible, setModalVisible] = useState(false);
  const [nomService, setNomService] = useState('');
  const [prixService, setPrixService] = useState('');

  useEffect(() => {
    chargerDonnees();
  }, []);

  const chargerDonnees = async () => {
    setLoading(true);
    try {
      const userDoc = await getDocs(query(
        collection(db, 'utilisateurs'),
        where('__name__', '==', auth.currentUser.uid)
      ));
      let nom = '';
      userDoc.forEach((d) => { nom = d.data().nom; });
      setNomHopital(nom);

      if (nom) {
        const q = query(
          collection(db, 'rendez_vous'),
          where('hopital_nom', '==', nom)
        );
        const snapshot = await getDocs(q);
        const liste = [];
        snapshot.forEach((d) => liste.push({ id: d.id, ...d.data() }));
        liste.sort((a, b) => (a.date + a.heure).localeCompare(b.date + b.heure));
        setRdvListe(liste);

        const qs = query(
          collection(db, 'services_hopital'),
          where('hopital_nom', '==', nom)
        );
        const snapshotS = await getDocs(qs);
        const listeS = [];
        snapshotS.forEach((d) => listeS.push({ id: d.id, ...d.data() }));
        setMesServices(listeS);
      }
    } catch (error) {
      console.log('Erreur chargement dashboard hopital:', error);
    } finally {
      setLoading(false);
    }
  };

  const changerStatut = async (rdvId, nouveauStatut) => {
    try {
      await updateDoc(doc(db, 'rendez_vous', rdvId), { statut: nouveauStatut });
      chargerDonnees();
    } catch (error) {
      Alert.alert('Erreur', "Impossible de mettre a jour: " + error.message);
    }
  };

  const confirmerAction = (rdvId, action, label) => {
    Alert.alert('Confirmation', `Voulez-vous ${label} ce rendez-vous ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Confirmer', onPress: () => changerStatut(rdvId, action) },
    ]);
  };

  const ajouterService = async () => {
    if (!nomService.trim() || !prixService.trim()) {
      Alert.alert('Erreur', 'Merci de remplir le nom et le prix');
      return;
    }
    try {
      await addDoc(collection(db, 'services_hopital'), {
        nom_service: nomService.trim(),
        hopital_nom: nomHopital,
        proprietaire_id: auth.currentUser.uid,
        prix: parseFloat(prixService),
      });
      setModalVisible(false);
      setNomService('');
      setPrixService('');
      chargerDonnees();
      Alert.alert('Succes', 'Service ajoute');
    } catch (error) {
      Alert.alert('Erreur', error.message);
    }
  };

  const supprimerService = async (id) => {
    Alert.alert('Confirmer', 'Retirer ce service ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Retirer', style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'services_hopital', id));
            chargerDonnees();
          } catch (error) {
            Alert.alert('Erreur', error.message);
          }
        },
      },
    ]);
  };

  const statutInfo = (statut) => {
    if (statut === 'confirme') return { text: 'Confirme', color: '#27ae60', bg: '#eafaf1' };
    if (statut === 'annule') return { text: 'Annule', color: '#e74c3c', bg: '#fdedec' };
    return { text: 'En attente', color: '#f39c12', bg: '#fef5e7' };
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerNom}>{nomHopital || 'Mon etablissement'}</Text>
        <Text style={styles.headerCount}>
          {onglet === 'rdv' ? `${rdvListe.length} rendez-vous` : `${mesServices.length} services`}
        </Text>
      </View>

      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, onglet === 'rdv' && styles.tabBtnActive]}
          onPress={() => setOnglet('rdv')}
        >
          <Text style={[styles.tabBtnText, onglet === 'rdv' && styles.tabBtnTextActive]}>Rendez-vous</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, onglet === 'services' && styles.tabBtnActive]}
          onPress={() => setOnglet('services')}
        >
          <Text style={[styles.tabBtnText, onglet === 'services' && styles.tabBtnTextActive]}>Services</Text>
        </TouchableOpacity>
      </View>

      {onglet === 'rdv' ? (
        <FlatList
          data={rdvListe}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 15 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Aucun rendez-vous pour le moment</Text>
          }
          renderItem={({ item }) => {
            const statut = statutInfo(item.statut);
            return (
              <View style={styles.rdvCard}>
                <View style={styles.rdvCardHeader}>
                  <Text style={styles.rdvPatient}>{item.utilisateur_email}</Text>
                  <View style={[styles.statutBadge, { backgroundColor: statut.bg }]}>
                    <Text style={[styles.statutBadgeText, { color: statut.color }]}>
                      {statut.text}
                    </Text>
                  </View>
                </View>
                <Text style={styles.rdvDate}>{item.date} a {item.heure}</Text>
                {item.statut === 'confirme' && (
                  <TouchableOpacity
                    style={styles.visioBtnHop}
                    onPress={() => navigation.navigate('Visio', { roomName: 'pharmacieplus_rdv_' + item.id })}
                  >
                    <Text style={styles.visioBtnHopText}>🎥 Rejoindre la teleconsultation</Text>
                  </TouchableOpacity>
                )}

                {item.statut !== 'annule' && (
                  <View style={styles.actionsRow}>
                    {item.statut !== 'confirme' && (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.confirmBtn]}
                        onPress={() => confirmerAction(item.id, 'confirme', 'confirmer')}
                      >
                        <Text style={styles.actionBtnText}>Confirmer</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.annulerBtn]}
                      onPress={() => confirmerAction(item.id, 'annule', 'annuler')}
                    >
                      <Text style={[styles.actionBtnText, { color: '#e74c3c' }]}>Annuler</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
        />
      ) : (
        <>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.addBtnText}>+ Ajouter un service</Text>
          </TouchableOpacity>
          <FlatList
            data={mesServices}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 15 }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Aucun service dans votre catalogue</Text>
            }
            renderItem={({ item }) => (
              <View style={styles.produitCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.produitNom}>{item.nom_service}</Text>
                  <Text style={styles.produitPrix}>{item.prix} FCFA</Text>
                </View>
                <TouchableOpacity onPress={() => supprimerService(item.id)}>
                  <Text style={{ fontSize: 18 }}>🗑️</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </>
      )}

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ajouter un service</Text>

            <Text style={styles.modalLabel}>Nom du service</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Consultation generale"
              value={nomService}
              onChangeText={setNomService}
            />

            <Text style={styles.modalLabel}>Prix (FCFA)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: 5000"
              value={prixService}
              onChangeText={setPrixService}
              keyboardType="numeric"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={ajouterService}>
                <Text style={styles.modalSaveText}>Ajouter</Text>
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
  headerBar: {
    backgroundColor: '#fff', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  headerNom: { fontSize: 18, fontWeight: '700', color: '#1a2b34' },
  headerCount: { fontSize: 13, color: '#6b7b82', marginTop: 4 },
  tabsRow: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 15, paddingBottom: 10, gap: 10 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', backgroundColor: '#f4f7f8' },
  tabBtnActive: { backgroundColor: '#3498db' },
  tabBtnText: { fontWeight: '700', color: '#6b7b82', fontSize: 13 },
  tabBtnTextActive: { color: '#fff' },
  emptyText: { textAlign: 'center', color: '#7f8c8d', marginTop: 40 },
  rdvCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 10,
  },
  rdvCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  rdvPatient: { fontSize: 14, fontWeight: '700', color: '#1a2b34', flex: 1 },
  statutBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statutBadgeText: { fontSize: 11, fontWeight: '700' },
  visioBtnHop: { backgroundColor: '#27ae60', borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 10 },
  visioBtnHopText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  rdvDate: { fontSize: 13, color: '#6b7b82', marginTop: 6 },
  actionsRow: { flexDirection: 'row', marginTop: 12, gap: 8 },
  actionBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center',
  },
  confirmBtn: { backgroundColor: '#eafaf1' },
  annulerBtn: { backgroundColor: '#fdedec' },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: '#27ae60' },
  addBtn: {
    backgroundColor: '#3498db', marginHorizontal: 15, marginTop: 5,
    borderRadius: 10, paddingVertical: 14, alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  produitCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 12, padding: 15, marginBottom: 10,
  },
  produitNom: { fontSize: 14, fontWeight: '700', color: '#1a2b34' },
  produitPrix: { fontSize: 13, color: '#6b7b82', marginTop: 4 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1a2b34', marginBottom: 15 },
  modalLabel: { fontSize: 13, fontWeight: '700', color: '#2c3e50', marginTop: 10, marginBottom: 6 },
  modalInput: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
  },
  modalActions: { flexDirection: 'row', marginTop: 20, gap: 10 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center',
    backgroundColor: '#f4f7f8',
  },
  modalCancelText: { color: '#6b7b82', fontWeight: '700' },
  modalSaveBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center',
    backgroundColor: '#3498db',
  },
  modalSaveText: { color: '#fff', fontWeight: '700' },
});
