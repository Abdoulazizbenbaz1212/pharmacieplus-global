import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export default function DashboardHopitalScreen() {
  const [rdvListe, setRdvListe] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nomHopital, setNomHopital] = useState('');

  useEffect(() => {
    chargerNomEtRdv();
  }, []);

  const chargerNomEtRdv = async () => {
    setLoading(true);
    try {
      // Recuperer le nom de l'hopital depuis utilisateurs
      const userDoc = await getDocs(query(
        collection(db, 'utilisateurs'),
        where('__name__', '==', auth.currentUser.uid)
      ));
      let nom = '';
      userDoc.forEach((d) => { nom = d.data().nom; });
      setNomHopital(nom);

      // Charger les RDV qui correspondent a cet hopital (par nom)
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
      chargerNomEtRdv();
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
        <Text style={styles.headerCount}>{rdvListe.length} rendez-vous</Text>
      </View>

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
  rdvDate: { fontSize: 13, color: '#6b7b82', marginTop: 6 },
  actionsRow: { flexDirection: 'row', marginTop: 12, gap: 8 },
  actionBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center',
  },
  confirmBtn: { backgroundColor: '#eafaf1' },
  annulerBtn: { backgroundColor: '#fdedec' },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: '#27ae60' },
});
