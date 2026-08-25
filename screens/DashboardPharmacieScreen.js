import React, { useState, useEffect } from 'react';
import { alertCompatible } from '../utils/alertCompatible';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal,
} from 'react-native';
import {
  collection, query, where, getDocs, doc, updateDoc, addDoc,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export default function DashboardPharmacieScreen() {
  const [nomPharmacie, setNomPharmacie] = useState('');
  const [mesProduits, setMesProduits] = useState([]);
  const [medicamentsDisponibles, setMedicamentsDisponibles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [medicamentChoisi, setMedicamentChoisi] = useState(null);
  const [nouveauPrix, setNouveauPrix] = useState('');
  const [ville, setVille] = useState('');

  useEffect(() => {
    chargerDonnees();
  }, []);

  const chargerDonnees = async () => {
    setLoading(true);
    try {
      const userQuery = query(
        collection(db, 'utilisateurs'),
        where('__name__', '==', auth.currentUser.uid)
      );
      const userSnap = await getDocs(userQuery);
      let nom = '';
      userSnap.forEach((d) => { nom = d.data().nom; });
      setNomPharmacie(nom);

      if (nom) {
        const q = query(
          collection(db, 'prix_pharmacie'),
          where('pharmacie_nom', '==', nom)
        );
        const snapshot = await getDocs(q);
        const liste = [];
        snapshot.forEach((d) => liste.push({ id: d.id, ...d.data() }));
        setMesProduits(liste);
      }

      const medsSnapshot = await getDocs(collection(db, 'medicaments'));
      const medsListe = [];
      medsSnapshot.forEach((d) => medsListe.push({ id: d.id, ...d.data() }));
      setMedicamentsDisponibles(medsListe);
    } catch (error) {
      console.log('Erreur chargement dashboard pharmacie:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStock = async (produitId, statutActuel) => {
    try {
      await updateDoc(doc(db, 'prix_pharmacie', produitId), {
        en_stock: !statutActuel,
      });
      chargerDonnees();
    } catch (error) {
      alertCompatible('Erreur', error.message);
    }
  };

  const ajouterProduit = async () => {
    if (!medicamentChoisi || !nouveauPrix.trim() || !ville.trim()) {
      alertCompatible('Erreur', 'Merci de remplir tous les champs');
      return;
    }
    try {
      await addDoc(collection(db, 'prix_pharmacie'), {
        medicament_nom: medicamentChoisi.nom,
        pharmacie_nom: nomPharmacie,
        proprietaire_id: auth.currentUser.uid,
        prix: parseFloat(nouveauPrix),
        en_stock: true,
        ville: ville.trim(),
      });
      setModalVisible(false);
      setMedicamentChoisi(null);
      setNouveauPrix('');
      setVille('');
      chargerDonnees();
      alertCompatible('Succes', 'Produit ajoute a votre catalogue');
    } catch (error) {
      alertCompatible('Erreur', error.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#9b59b6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerNom}>{nomPharmacie || 'Ma pharmacie'}</Text>
        <Text style={styles.headerCount}>{mesProduits.length} produits en catalogue</Text>
      </View>

      <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
        <Text style={styles.addBtnText}>+ Ajouter un medicament</Text>
      </TouchableOpacity>

      <FlatList
        data={mesProduits}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 15 }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Aucun produit dans votre catalogue</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.produitCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.produitNom}>{item.medicament_nom}</Text>
              <Text style={styles.produitPrix}>{item.prix} FCFA - {item.ville}</Text>
            </View>
            <TouchableOpacity
              style={[styles.stockToggle, item.en_stock ? styles.enStockBg : styles.rupturBg]}
              onPress={() => toggleStock(item.id, item.en_stock)}
            >
              <Text style={[styles.stockToggleText, { color: item.en_stock ? '#27ae60' : '#e74c3c' }]}>
                {item.en_stock ? 'En stock' : 'Rupture'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ajouter un medicament</Text>

            <Text style={styles.modalLabel}>Choisir un medicament</Text>
            <FlatList
              style={{ maxHeight: 150 }}
              data={medicamentsDisponibles}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.medOption,
                    medicamentChoisi?.id === item.id && styles.medOptionActive,
                  ]}
                  onPress={() => setMedicamentChoisi(item)}
                >
                  <Text style={styles.medOptionText}>{item.nom}</Text>
                </TouchableOpacity>
              )}
            />

            <Text style={styles.modalLabel}>Prix (FCFA)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: 500"
              value={nouveauPrix}
              onChangeText={setNouveauPrix}
              keyboardType="numeric"
            />

            <Text style={styles.modalLabel}>Ville</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Bertoua"
              value={ville}
              onChangeText={setVille}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={ajouterProduit}>
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
  addBtn: {
    backgroundColor: '#9b59b6', margin: 15, marginBottom: 0,
    borderRadius: 10, paddingVertical: 14, alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  emptyText: { textAlign: 'center', color: '#7f8c8d', marginTop: 40 },
  produitCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 12, padding: 15, marginBottom: 10,
  },
  produitNom: { fontSize: 14, fontWeight: '700', color: '#1a2b34' },
  produitPrix: { fontSize: 13, color: '#6b7b82', marginTop: 4 },
  stockToggle: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  enStockBg: { backgroundColor: '#eafaf1' },
  rupturBg: { backgroundColor: '#fdedec' },
  stockToggleText: { fontSize: 12, fontWeight: '700' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1a2b34', marginBottom: 15 },
  modalLabel: { fontSize: 13, fontWeight: '700', color: '#2c3e50', marginTop: 10, marginBottom: 6 },
  medOption: {
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8,
    borderWidth: 1, borderColor: '#eee', marginBottom: 6,
  },
  medOptionActive: { borderColor: '#9b59b6', backgroundColor: '#f4ecf7' },
  medOptionText: { fontSize: 14, color: '#2c3e50' },
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
    backgroundColor: '#9b59b6',
  },
  modalSaveText: { color: '#fff', fontWeight: '700' },
});
