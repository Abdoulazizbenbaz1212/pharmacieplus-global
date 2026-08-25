import React, { useState, useEffect } from 'react';
import { alertCompatible } from '../utils/alertCompatible';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal,
} from 'react-native';
import {
  collection, query, where, getDocs, doc, updateDoc, addDoc, deleteDoc,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export default function DashboardFournisseurScreen() {
  const [nomFournisseur, setNomFournisseur] = useState('');
  const [mesProduits, setMesProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [nomProduit, setNomProduit] = useState('');
  const [prixProduit, setPrixProduit] = useState('');
  const [quantiteProduit, setQuantiteProduit] = useState('');

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
      setNomFournisseur(nom);

      if (nom) {
        const q = query(
          collection(db, 'produits_fournisseur'),
          where('fournisseur_nom', '==', nom)
        );
        const snapshot = await getDocs(q);
        const liste = [];
        snapshot.forEach((d) => liste.push({ id: d.id, ...d.data() }));
        setMesProduits(liste);
      }
    } catch (error) {
      console.log('Erreur chargement dashboard fournisseur:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDisponibilite = async (produitId, statutActuel) => {
    try {
      await updateDoc(doc(db, 'produits_fournisseur', produitId), {
        disponible: !statutActuel,
      });
      chargerDonnees();
    } catch (error) {
      alertCompatible('Erreur', error.message);
    }
  };

  const supprimerProduit = async (produitId) => {
    alertCompatible('Confirmer', 'Retirer ce produit du catalogue ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Retirer', style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'produits_fournisseur', produitId));
            chargerDonnees();
          } catch (error) {
            alertCompatible('Erreur', error.message);
          }
        },
      },
    ]);
  };

  const ajouterProduit = async () => {
    if (!nomProduit.trim() || !prixProduit.trim()) {
      alertCompatible('Erreur', 'Merci de remplir au moins le nom et le prix');
      return;
    }
    try {
      await addDoc(collection(db, 'produits_fournisseur'), {
        nom_produit: nomProduit.trim(),
        fournisseur_nom: nomFournisseur,
        proprietaire_id: auth.currentUser.uid,
        prix: parseFloat(prixProduit),
        quantite: quantiteProduit.trim() ? parseInt(quantiteProduit, 10) : null,
        disponible: true,
      });
      setModalVisible(false);
      setNomProduit('');
      setPrixProduit('');
      setQuantiteProduit('');
      chargerDonnees();
      alertCompatible('Succes', 'Produit ajoute a votre catalogue');
    } catch (error) {
      alertCompatible('Erreur', error.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e67e22" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerNom}>{nomFournisseur || 'Mon entreprise'}</Text>
        <Text style={styles.headerCount}>{mesProduits.length} produits en catalogue</Text>
      </View>

      <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
        <Text style={styles.addBtnText}>+ Ajouter un produit</Text>
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
              <Text style={styles.produitNom}>{item.nom_produit}</Text>
              <Text style={styles.produitPrix}>
                {item.prix} FCFA{item.quantite ? ` - Qte: ${item.quantite}` : ''}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.stockToggle, item.disponible ? styles.enStockBg : styles.rupturBg]}
              onPress={() => toggleDisponibilite(item.id, item.disponible)}
            >
              <Text style={[styles.stockToggleText, { color: item.disponible ? '#27ae60' : '#e74c3c' }]}>
                {item.disponible ? 'Disponible' : 'Indisponible'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => supprimerProduit(item.id)} style={{ marginLeft: 10 }}>
              <Text style={{ fontSize: 18 }}>🗑️</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ajouter un produit</Text>

            <Text style={styles.modalLabel}>Nom du produit</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Gants latex (boite de 100)"
              value={nomProduit}
              onChangeText={setNomProduit}
            />

            <Text style={styles.modalLabel}>Prix (FCFA)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: 5000"
              value={prixProduit}
              onChangeText={setPrixProduit}
              keyboardType="numeric"
            />

            <Text style={styles.modalLabel}>Quantite disponible (optionnel)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: 200"
              value={quantiteProduit}
              onChangeText={setQuantiteProduit}
              keyboardType="numeric"
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
    backgroundColor: '#e67e22', margin: 15, marginBottom: 0,
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
    backgroundColor: '#e67e22',
  },
  modalSaveText: { color: '#fff', fontWeight: '700' },
});
