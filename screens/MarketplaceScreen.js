import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ActivityIndicator, ScrollView, FlatList, Image, Alert, Modal, Linking,
} from 'react-native';
import {
  collection, addDoc, getDocs, getDoc, doc, query, orderBy,
  deleteDoc, serverTimestamp,
} from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { db, auth } from '../config/firebase';
import ChatModal from '../components/ChatModal';

const CATEGORIES = ['Tous', 'Médicaments', 'Matériel médical', 'Services', 'Autre'];
const ROLES_VENDEURS = ['hopital', 'pharmacie', 'fournisseur'];

function normaliser(texte) {
  return texte.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function roleLabel(role) {
  switch (role) {
    case 'hopital': return 'Hôpital';
    case 'pharmacie': return 'Pharmacie';
    case 'fournisseur': return 'Fournisseur';
    default: return 'Particulier';
  }
}

function AnnonceCard({ item, currentUserId, onDeleted, onOpenChat }) {
  const [ouvert, setOuvert] = useState(false);
  const [suppression, setSuppression] = useState(false);
  const estProprietaire = item.vendeurId === currentUserId;

  function confirmerSuppression() {
    Alert.alert(
      'Supprimer cette annonce ?',
      'Cette action est définitive.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: supprimer },
      ]
    );
  }

  async function supprimer() {
    setSuppression(true);
    try {
      await deleteDoc(doc(db, 'marketplace_items', item.id));
      onDeleted();
    } catch (error) {
      console.log('Erreur suppression:', error);
      Alert.alert('Erreur', "La suppression a échoué. Réessaie.");
    }
    setSuppression(false);
  }

  function appelerVendeur() {
    if (!item.vendeurTelephone) {
      Alert.alert('Indisponible', "Ce vendeur n'a pas renseigné de numéro de téléphone.");
      return;
    }
    Linking.openURL(`tel:${item.vendeurTelephone}`);
  }

  return (
    <TouchableOpacity style={styles.card} onPress={() => setOuvert(!ouvert)} activeOpacity={0.7}>
      <View style={styles.cardHeaderRow}>
        {item.imageBase64 ? (
          <Image source={{ uri: `data:image/jpeg;base64,${item.imageBase64}` }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}><Text style={{ fontSize: 24 }}>🛍️</Text></View>
        )}
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.titre}>{item.titre}</Text>
          <Text style={styles.categorie}>{item.categorie}</Text>
          <Text style={styles.vendeur}>{item.vendeurNom} · {roleLabel(item.vendeurRole)}</Text>
        </View>
        <Text style={styles.prix}>{item.prix} FCFA</Text>
      </View>
      {ouvert && (
        <View style={styles.details}>

          {item.ordonnanceRequise && (
            <View style={styles.avertissementBox}>
              <Text style={styles.avertissementBoxText}>
                ⚠️ Ordonnance medicale obligatoire pour ce medicament. Tiens-la prete pour le vendeur.
              </Text>
            </View>
          )}
          <Text style={styles.description}>{item.description || 'Aucune description.'}</Text>

          {!estProprietaire && (
            <View style={styles.contactRow}>
              <TouchableOpacity style={styles.callBtn} onPress={appelerVendeur}>
                <Text style={styles.callBtnText}>📞 Appeler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.chatBtn} onPress={() => onOpenChat(item)}>
                <Text style={styles.chatBtnText}>💬 Chat</Text>
              </TouchableOpacity>
            </View>
          )}

          {estProprietaire && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={confirmerSuppression}
              disabled={suppression}
            >
              {suppression ? (
                <ActivityIndicator color="#e74c3c" size="small" />
              ) : (
                <Text style={styles.deleteBtnText}>🗑️ Supprimer mon annonce</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function MarketplaceScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recherche, setRecherche] = useState('');
  const [categorieActive, setCategorieActive] = useState('Tous');
  const [modalVisible, setModalVisible] = useState(false);
  const [monRole, setMonRole] = useState(null);
  const [monNom, setMonNom] = useState('Utilisateur');
  const [chargementRole, setChargementRole] = useState(true);
  const [chatConfig, setChatConfig] = useState(null);

  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [prix, setPrix] = useState('');
  const [categorie, setCategorie] = useState('Médicaments');
  const [ordonnanceRequise, setOrdonnanceRequise] = useState(false);
  const [imageBase64, setImageBase64] = useState(null);
  const [publication, setPublication] = useState(false);

  const currentUserId = auth.currentUser ? auth.currentUser.uid : null;
  const peutVendre = ROLES_VENDEURS.includes(monRole);

  const chargerMonRole = useCallback(async () => {
    setChargementRole(true);
    try {
      const user = auth.currentUser;
      if (user) {
        const docSnap = await getDoc(doc(db, 'utilisateurs', user.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setMonRole(data.role || 'patient');
          setMonNom(data.nom || data.etablissementNom || user.email || 'Utilisateur');
        } else {
          setMonRole('patient');
        }
      }
    } catch (error) {
      console.log('Erreur chargement role:', error);
      setMonRole('patient');
    }
    setChargementRole(false);
  }, []);

  const chargerAnnonces = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'marketplace_items'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.log('Erreur chargement marketplace:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => { chargerAnnonces(); chargerMonRole(); }, [chargerAnnonces, chargerMonRole]);

  const itemsFiltres = items.filter(item => {
    const matchCategorie = categorieActive === 'Tous' || item.categorie === categorieActive;
    const matchRecherche = !recherche || normaliser(item.titre).includes(normaliser(recherche));
    return matchCategorie && matchRecherche;
  });

  function ouvrirChatDepuisAnnonce(item) {
    setChatConfig({
      conversationId: `${item.id}_${currentUserId}`,
      titre: item.titre,
      autreNom: item.vendeurNom,
      itemId: item.id,
      itemTitre: item.titre,
      buyerId: currentUserId,
      buyerNom: monNom,
      sellerId: item.vendeurId,
      sellerNom: item.vendeurNom,
    });
  }

  async function choisirImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission requise', "Autorise l'accès aux photos pour ajouter une image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (result.canceled) return;
    const manipule = await ImageManipulator.manipulateAsync(
      result.assets[0].uri,
      [{ resize: { width: 600 } }],
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    setImageBase64(manipule.base64);
  }

  async function publierAnnonce() {
    if (!peutVendre) {
      Alert.alert('Non autorisé', 'Seuls les hôpitaux, pharmacies et fournisseurs peuvent publier des annonces.');
      return;
    }
    if (!titre.trim() || !prix.trim()) {
      Alert.alert('Champs manquants', 'Le titre et le prix sont obligatoires.');
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Erreur', 'Tu dois être connecté pour publier une annonce.');
      return;
    }
    setPublication(true);
    try {
      let vendeurTelephone = null;
      const docSnap = await getDoc(doc(db, 'utilisateurs', user.uid));
      if (docSnap.exists()) {
        vendeurTelephone = docSnap.data().telephone || null;
      }
      await addDoc(collection(db, 'marketplace_items'), {
        titre: titre.trim(),
        description: description.trim(),
        prix: Number(prix),
        categorie,
        imageBase64: imageBase64 || null,
        ordonnanceRequise: categorie === 'Médicaments' ? ordonnanceRequise : false,
        vendeurId: user.uid,
        vendeurNom: monNom,
        vendeurRole: monRole,
        vendeurTelephone,
        createdAt: serverTimestamp(),
      });
      setModalVisible(false);
      setTitre(''); setDescription(''); setPrix(''); setImageBase64(null); setCategorie('Médicaments'); setOrdonnanceRequise(false);
      chargerAnnonces();
      Alert.alert('Publié', 'Ton annonce est en ligne.');
    } catch (error) {
      console.log('Erreur publication:', error);
      Alert.alert('Erreur', "La publication a échoué. Réessaie.");
    }
    setPublication(false);
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une annonce..."
          value={recherche}
          onChangeText={setRecherche}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesRow} contentContainerStyle={{ paddingHorizontal: 10 }}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.catChip, categorieActive === cat && styles.catChipActive]}
            onPress={() => setCategorieActive(cat)}
          >
            <Text style={[styles.catChipText, categorieActive === cat && styles.catChipTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator size="large" color="#e74c3c" style={{ marginTop: 40 }} />
      ) : itemsFiltres.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emoji}>🛒</Text>
          <Text style={styles.title}>Aucune annonce</Text>
          <Text style={styles.subtitle}>
            {peutVendre ? 'Sois le premier à publier un produit ou un service.' : 'Reviens bientôt : les pharmacies, hôpitaux et fournisseurs y publieront leurs produits.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={itemsFiltres}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <AnnonceCard
              item={item}
              currentUserId={currentUserId}
              onDeleted={chargerAnnonces}
              onOpenChat={ouvrirChatDepuisAnnonce}
            />
          )}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      {!chargementRole && peutVendre && (
        <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
          <Text style={styles.fabText}>+ Publier</Text>
        </TouchableOpacity>
      )}

      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <ScrollView style={styles.modalContainer} contentContainerStyle={{ padding: 20 }}>
          <Text style={styles.modalTitle}>Publier une annonce</Text>

          <Text style={styles.label}>Titre *</Text>
          <TextInput style={styles.input} value={titre} onChangeText={setTitre} placeholder="Ex: Paracétamol 500mg, boîte de 20" />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, { height: 90 }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Détails de l'annonce..."
            multiline
          />

          <Text style={styles.label}>Prix (FCFA) *</Text>
          <TextInput style={styles.input} value={prix} onChangeText={setPrix} placeholder="Ex: 1500" keyboardType="numeric" />

          <Text style={styles.label}>Catégorie</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {CATEGORIES.filter(c => c !== 'Tous').map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.catChip, categorie === cat && styles.catChipActive, { marginBottom: 8 }]}
                onPress={() => setCategorie(cat)}
              >
                <Text style={[styles.catChipText, categorie === cat && styles.catChipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}

          </View>
          {categorie === 'Médicaments' && (
            <TouchableOpacity
              style={styles.ordonnanceRow}
              onPress={() => setOrdonnanceRequise(!ordonnanceRequise)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkboxOrdonnance, ordonnanceRequise && styles.checkboxOrdonnanceActive]}>
                {ordonnanceRequise && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
              </View>
              <Text style={styles.ordonnanceText}>
                Ce medicament necessite une ordonnance medicale
              </Text>
            </TouchableOpacity>
          )}

          <Text style={styles.label}>Photo</Text>
          <TouchableOpacity style={styles.imagePicker} onPress={choisirImage}>
            {imageBase64 ? (
              <Image source={{ uri: `data:image/jpeg;base64,${imageBase64}` }} style={styles.imagePreview} />
            ) : (
              <Text style={{ color: '#7f8c8d' }}>📷 Ajouter une photo</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.publishBtn} onPress={publierAnnonce} disabled={publication}>
            {publication ? <ActivityIndicator color="#fff" /> : <Text style={styles.publishBtnText}>Publier</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
            <Text style={styles.cancelBtnText}>Annuler</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>

      {chatConfig && (
        <ChatModal
          visible={!!chatConfig}
          onClose={() => setChatConfig(null)}
          monNom={monNom}
          {...chatConfig}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  searchBar: { padding: 15, backgroundColor: '#f8f9fa' },
  searchInput: {
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#eee',
    paddingHorizontal: 15, paddingVertical: 10, fontSize: 15,
  },
  categoriesRow: { maxHeight: 50, marginBottom: 5 },
  catChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f0f0',
    marginRight: 8, marginTop: 5,
  },
  catChipActive: { backgroundColor: '#3498db' },
  catChipText: { color: '#7f8c8d', fontSize: 13, fontWeight: 'bold' },
  catChipTextActive: { color: '#fff' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  emoji: { fontSize: 50, marginBottom: 10 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#2c3e50' },
  subtitle: { fontSize: 14, color: '#7f8c8d', marginTop: 8, textAlign: 'center' },
  avertissementBox: { backgroundColor: '#fef5e7', borderRadius: 8, padding: 10, marginBottom: 10 },
  avertissementBoxText: { color: '#e67e22', fontSize: 12, fontWeight: '600' },
  card: {
    marginHorizontal: 15, marginTop: 12, padding: 12, backgroundColor: '#f8f9fa',
    borderRadius: 10, borderWidth: 1, borderColor: '#eee',
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  thumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: '#eee' },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  titre: { fontSize: 15, fontWeight: 'bold', color: '#2c3e50' },
  categorie: { fontSize: 12, color: '#3498db', marginTop: 2 },
  ordonnanceRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 12, marginBottom: 5 },
  checkboxOrdonnance: {
    width: 22, height: 22, borderRadius: 5, borderWidth: 2, borderColor: '#e67e22',
    alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 2,
  },
  checkboxOrdonnanceActive: { backgroundColor: '#e67e22' },
  ordonnanceText: { flex: 1, fontSize: 13, color: '#2c3e50', fontWeight: '600' },
  vendeur: { fontSize: 11, color: '#7f8c8d', marginTop: 2 },
  prix: { fontSize: 15, fontWeight: 'bold', color: '#27ae60' },
  details: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eee' },
  description: { fontSize: 13, color: '#2c3e50' },
  contactRow: { flexDirection: 'row', marginTop: 12, gap: 8 },
  callBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    backgroundColor: '#eafaf1', borderRadius: 8,
  },
  callBtnText: { color: '#27ae60', fontWeight: 'bold', fontSize: 13 },
  chatBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    backgroundColor: '#eaf2fd', borderRadius: 8,
  },
  chatBtnText: { color: '#3498db', fontWeight: 'bold', fontSize: 13 },
  deleteBtn: {
    marginTop: 12, alignItems: 'center', paddingVertical: 10,
    backgroundColor: '#fdecea', borderRadius: 8,
  },
  deleteBtnText: { color: '#e74c3c', fontWeight: 'bold', fontSize: 13 },
  fab: {
    position: 'absolute', right: 20, bottom: 20, backgroundColor: '#e74c3c',
    paddingHorizontal: 20, paddingVertical: 14, borderRadius: 30, elevation: 4,
  },
  fabText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: 'bold', color: '#7f8c8d', marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: '#f8f9fa', borderRadius: 8, borderWidth: 1, borderColor: '#eee',
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#2c3e50',
  },
  imagePicker: {
    backgroundColor: '#f8f9fa', borderRadius: 8, borderWidth: 1, borderColor: '#eee',
    height: 120, alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  imagePreview: { width: '100%', height: '100%', borderRadius: 8 },
  publishBtn: {
    backgroundColor: '#27ae60', borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginTop: 20,
  },
  publishBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cancelBtn: { alignItems: 'center', paddingVertical: 14 },
  cancelBtnText: { color: '#7f8c8d', fontSize: 14 },
});
