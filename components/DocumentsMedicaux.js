import React, { useState, useEffect, useCallback } from 'react';
import { alertCompatible } from '../utils/alertCompatible';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ScrollView, ActivityIndicator, Alert, Modal, FlatList,
} from 'react-native';
import {
  collection, addDoc, getDocs, doc, deleteDoc, serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { db } from '../config/firebase';

const TYPES_DOCUMENTS = [
  { valeur: 'ordonnance', label: 'Ordonnance', emoji: '💊' },
  { valeur: 'analyse', label: 'Analyse', emoji: '🧪' },
  { valeur: 'vaccin', label: 'Vaccin', emoji: '💉' },
  { valeur: 'autre', label: 'Autre', emoji: '📄' },
];

function labelType(valeur) {
  const trouve = TYPES_DOCUMENTS.find(t => t.valeur === valeur);
  return trouve ? `${trouve.emoji} ${trouve.label}` : '📄 Document';
}

export default function DocumentsMedicaux({ visible, onClose, collectionRef, titre }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAjout, setModalAjout] = useState(false);
  const [typeSelectionne, setTypeSelectionne] = useState('ordonnance');
  const [imageBase64, setImageBase64] = useState(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const [documentAgrandi, setDocumentAgrandi] = useState(null);
  const [imageUri, setImageUri] = useState(null);
  const [texteExtrait, setTexteExtrait] = useState('');
  const [ocrEnCours, setOcrEnCours] = useState(false);

  const chargerDocuments = useCallback(async () => {
    if (!collectionRef) return;
    setLoading(true);
    try {
      const q = query(collectionRef, orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setDocuments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.log('Erreur chargement documents:', error);
    } finally {
      setLoading(false);
    }
  }, [collectionRef]);

  useEffect(() => {
    if (visible) chargerDocuments();
  }, [visible, chargerDocuments]);

  async function choisirImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      alertCompatible('Permission requise', "Autorise l'accès aux photos pour ajouter un document.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (result.canceled) return;
    const manipule = await ImageManipulator.manipulateAsync(
      result.assets[0].uri,
      [{ resize: { width: 900 } }],
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    setImageBase64(manipule.base64);
    setImageUri(result.assets[0].uri);
    setTexteExtrait("");
    lancerOCR(manipule.uri);
  }

  async function prendrePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      alertCompatible('Permission requise', "Autorise l'accès à la caméra pour prendre une photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (result.canceled) return;
    const manipule = await ImageManipulator.manipulateAsync(
      result.assets[0].uri,
      [{ resize: { width: 900 } }],
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    setImageBase64(manipule.base64);
    setImageUri(result.assets[0].uri);
    setTexteExtrait("");
    lancerOCR(manipule.uri);
  }

  async function ajouterDocument() {
    if (!imageBase64) {
      alertCompatible('Photo manquante', 'Ajoute une photo du document.');
      return;
    }
    setEnregistrement(true);
    try {
      await addDoc(collectionRef, {
        type: typeSelectionne,
        imageBase64,
        texteOcr: texteExtrait,
        createdAt: serverTimestamp(),
      });
      setModalAjout(false);
      setImageBase64(null);
      setTypeSelectionne('ordonnance');
      chargerDocuments();
    } catch (error) {
      alertCompatible('Erreur', "Impossible d'enregistrer: " + error.message);
    } finally {
      setEnregistrement(false);
    }
  }

  async function supprimerDocument(documentId) {
    alertCompatible('Supprimer ce document ?', 'Cette action est définitive.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive', onPress: async () => {
          try {
            await deleteDoc(doc(collectionRef, documentId));
            setDocumentAgrandi(null);
            chargerDocuments();
          } catch (error) {
            alertCompatible('Erreur', "Impossible de supprimer: " + error.message);
          }
        },
      },
    ]);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={{ marginRight: 12 }}>
          <Text style={{ fontSize: 20 }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitre}>{titre || 'Documents médicaux'}</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#e74c3c" style={{ marginTop: 40 }} />
      ) : documents.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emoji}>📄</Text>
          <Text style={styles.videTexte}>Aucun document pour l'instant.</Text>
        </View>
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ padding: 10 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.carte} onPress={() => setDocumentAgrandi(item)}>
              <Image source={{ uri: `data:image/jpeg;base64,${item.imageBase64}` }} style={styles.miniature} />
              <Text style={styles.carteType}>{labelType(item.type)}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setModalAjout(true)}>
        <Text style={styles.fabText}>+ Ajouter</Text>
      </TouchableOpacity>

      <Modal visible={modalAjout} animationType="slide" onRequestClose={() => setModalAjout(false)}>
        <ScrollView style={styles.modalContainer} contentContainerStyle={{ padding: 20 }}>
          <Text style={styles.modalTitle}>Ajouter un document</Text>

          <Text style={styles.label}>Type de document</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {TYPES_DOCUMENTS.map((t) => (
              <TouchableOpacity
                key={t.valeur}
                style={[styles.chip, typeSelectionne === t.valeur && styles.chipActive]}
                onPress={() => setTypeSelectionne(t.valeur)}
              >
                <Text style={[styles.chipText, typeSelectionne === t.valeur && styles.chipTextActive]}>
                  {t.emoji} {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Photo du document</Text>
          {imageBase64 ? (
            <Image source={{ uri: `data:image/jpeg;base64,${imageBase64}` }} style={styles.apercu} />
          ) : (
            <View style={styles.apercuVide}>
              <Text style={{ color: '#7f8c8d' }}>Aucune photo choisie</Text>
            </View>
          )}

          {ocrEnCours ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
              <ActivityIndicator size="small" color="#e74c3c" />
              <Text style={{ marginLeft: 8, color: '#7f8c8d', fontSize: 13 }}>Lecture du texte en cours...</Text>
            </View>
          ) : texteExtrait ? (
            <View style={{ backgroundColor: '#f4f7f8', borderRadius: 10, padding: 12, marginTop: 10 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#2c3e50', marginBottom: 6 }}>Texte detecte</Text>
              <Text style={{ fontSize: 13, color: '#34495e' }}>{texteExtrait}</Text>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <TouchableOpacity style={styles.choixBtn} onPress={prendrePhoto}>
              <Text style={styles.choixBtnText}>📷 Prendre une photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.choixBtn} onPress={choisirImage}>
              <Text style={styles.choixBtnText}>🖼️ Galerie</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={ajouterDocument} disabled={enregistrement}>
            {enregistrement ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Enregistrer</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={() => { setModalAjout(false); setImageBase64(null); setImageUri(null); setTexteExtrait(''); }}>
            <Text style={styles.cancelBtnText}>Annuler</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>

      <Modal visible={!!documentAgrandi} animationType="fade" onRequestClose={() => setDocumentAgrandi(null)}>
        {documentAgrandi && (
          <View style={styles.agrandiContainer}>
            <TouchableOpacity style={styles.fermerAgrandi} onPress={() => setDocumentAgrandi(null)}>
              <Text style={{ fontSize: 24, color: '#fff' }}>✕</Text>
            </TouchableOpacity>
            <Image
              source={{ uri: `data:image/jpeg;base64,${documentAgrandi.imageBase64}` }}
              style={styles.imageAgrandie}
              resizeMode="contain"
            />
            <Text style={styles.agrandiType}>{labelType(documentAgrandi.type)}</Text>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => supprimerDocument(documentAgrandi.id)}>
              <Text style={styles.deleteBtnText}>🗑️ Supprimer ce document</Text>
            </TouchableOpacity>
          </View>
        )}
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 15,
    borderBottomWidth: 1, borderBottomColor: '#eee', paddingTop: 50,
  },
  headerTitre: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 50, marginBottom: 10 },
  videTexte: { color: '#6b7b82', fontSize: 14 },
  carte: { flex: 1, margin: 6, backgroundColor: '#f4f7f8', borderRadius: 10, overflow: 'hidden', maxWidth: '47%' },
  miniature: { width: '100%', height: 140, backgroundColor: '#ddd' },
  carteType: { fontSize: 12, fontWeight: '600', color: '#2c3e50', padding: 8 },
  fab: {
    position: 'absolute', right: 20, bottom: 20, backgroundColor: '#e74c3c',
    paddingHorizontal: 20, paddingVertical: 14, borderRadius: 30, elevation: 4,
  },
  fabText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50', marginBottom: 20, marginTop: 30 },
  label: { fontSize: 14, fontWeight: '700', color: '#2c3e50', marginTop: 15, marginBottom: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f0f0',
    marginRight: 8, marginBottom: 8,
  },
  chipActive: { backgroundColor: '#e74c3c' },
  chipText: { color: '#7f8c8d', fontSize: 13, fontWeight: 'bold' },
  chipTextActive: { color: '#fff' },
  apercu: { width: '100%', height: 220, borderRadius: 10, backgroundColor: '#eee' },
  apercuVide: {
    width: '100%', height: 120, borderRadius: 10, backgroundColor: '#f4f7f8',
    alignItems: 'center', justifyContent: 'center',
  },
  choixBtn: {
    flex: 1, backgroundColor: '#eaf2fd', paddingVertical: 12, borderRadius: 8, alignItems: 'center',
  },
  choixBtnText: { color: '#3498db', fontWeight: '700', fontSize: 13 },
  primaryBtn: {
    backgroundColor: '#e74c3c', borderRadius: 10, paddingVertical: 15,
    alignItems: 'center', marginTop: 25,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 10 },
  cancelBtnText: { color: '#7f8c8d', fontSize: 14 },
  agrandiContainer: { flex: 1, backgroundColor: '#000', paddingTop: 50 },
  fermerAgrandi: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  imageAgrandie: { flex: 1, width: '100%' },
  agrandiType: { color: '#fff', textAlign: 'center', padding: 15, fontSize: 15, fontWeight: '600' },
  deleteBtn: {
    marginHorizontal: 20, marginBottom: 30, alignItems: 'center', paddingVertical: 14,
    backgroundColor: '#e74c3c', borderRadius: 10,
  },
  deleteBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});
