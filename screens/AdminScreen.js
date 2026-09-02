import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { alertCompatible } from '../utils/alertCompatible';

const ONGLETS = [
  { id: 'stats', label: 'Stats' },
  { id: 'utilisateurs', label: 'Utilisateurs' },
  { id: 'commandes', label: 'Commandes' },
  { id: 'marketplace', label: 'Marketplace' },
];

export default function AdminScreen() {
  const [onglet, setOnglet] = useState('stats');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [commandes, setCommandes] = useState([]);
  const [marketplaceItems, setMarketplaceItems] = useState([]);

  const chargerDonnees = useCallback(async () => {
    try {
      const [usersSnap, commandesSnap, marketSnap] = await Promise.all([
        getDocs(collection(db, 'utilisateurs')),
        getDocs(collection(db, 'commandes')),
        getDocs(collection(db, 'marketplace_items')),
      ]);
      const usersListe = [];
      usersSnap.forEach((d) => usersListe.push({ id: d.id, ...d.data() }));
      setUtilisateurs(usersListe);

      const commandesListe = [];
      commandesSnap.forEach((d) => commandesListe.push({ id: d.id, ...d.data() }));
      setCommandes(commandesListe);

      const marketListe = [];
      marketSnap.forEach((d) => marketListe.push({ id: d.id, ...d.data() }));
      setMarketplaceItems(marketListe);
    } catch (error) {
      alertCompatible('Erreur', 'Impossible de charger les donnees admin: ' + error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    chargerDonnees();
  }, [chargerDonnees]);

  const onRefresh = () => {
    setRefreshing(true);
    chargerDonnees();
  };

  const supprimerAnnonce = async (id) => {
    try {
      await deleteDoc(doc(db, 'marketplace_items', id));
      setMarketplaceItems((prev) => prev.filter((item) => item.id !== id));
      alertCompatible('Supprime', "L'annonce a ete supprimee.");
    } catch (error) {
      alertCompatible('Erreur', error.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator size="large" color="#2c3e50" />
      </View>
    );
  }

  const compterParRole = (role) => utilisateurs.filter((u) => u.role === role).length;

  return (
    <View style={styles.container}>
      <View style={styles.ongletsRow}>
        {ONGLETS.map((o) => (
          <TouchableOpacity
            key={o.id}
            style={[styles.ongletBtn, onglet === o.id && styles.ongletBtnActif]}
            onPress={() => setOnglet(o.id)}
          >
            <Text style={[styles.ongletTxt, onglet === o.id && styles.ongletTxtActif]}>{o.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {onglet === 'stats' && (
        <View style={styles.contenu}>
          <View style={styles.statCard}>
            <Text style={styles.statNombre}>{utilisateurs.length}</Text>
            <Text style={styles.statLabel}>Utilisateurs au total</Text>
          </View>
          <View style={styles.statsGrille}>
            <View style={styles.statMini}><Text style={styles.statMiniNombre}>{compterParRole('patient')}</Text><Text style={styles.statMiniLabel}>Patients</Text></View>
            <View style={styles.statMini}><Text style={styles.statMiniNombre}>{compterParRole('pharmacie')}</Text><Text style={styles.statMiniLabel}>Pharmacies</Text></View>
            <View style={styles.statMini}><Text style={styles.statMiniNombre}>{compterParRole('hopital')}</Text><Text style={styles.statMiniLabel}>Hopitaux</Text></View>
            <View style={styles.statMini}><Text style={styles.statMiniNombre}>{compterParRole('fournisseur')}</Text><Text style={styles.statMiniLabel}>Fournisseurs</Text></View>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNombre}>{commandes.length}</Text>
            <Text style={styles.statLabel}>Commandes passees</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNombre}>{marketplaceItems.length}</Text>
            <Text style={styles.statLabel}>Annonces marketplace</Text>
          </View>
        </View>
      )}

      {onglet === 'utilisateurs' && (
        <FlatList
          style={styles.liste}
          data={utilisateurs}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <View style={styles.ligneCard}>
              <Text style={styles.ligneTitre}>{item.nom || 'Sans nom'}</Text>
              <Text style={styles.ligneDetail}>{item.email}</Text>
              <View style={styles.badgeRole}><Text style={styles.badgeRoleTxt}>{item.role || 'patient'}</Text></View>
              {item.pays && <Text style={styles.ligneDetail}>{item.pays}</Text>}
            </View>
          )}
        />
      )}

      {onglet === 'commandes' && (
        <FlatList
          style={styles.liste}
          data={commandes}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <View style={styles.ligneCard}>
              <Text style={styles.ligneTitre}>{item.description || 'Sans description'}</Text>
              <Text style={styles.ligneDetail}>Client: {item.clientEmail}</Text>
              <Text style={styles.ligneDetail}>Vendeur: {item.vendeurNom}</Text>
              <View style={styles.badgeRole}><Text style={styles.badgeRoleTxt}>{item.statut || 'inconnue'}</Text></View>
            </View>
          )}
        />
      )}

      {onglet === 'marketplace' && (
        <FlatList
          style={styles.liste}
          data={marketplaceItems}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <View style={styles.ligneCard}>
              <Text style={styles.ligneTitre}>{item.titre || item.nom || 'Sans titre'}</Text>
              <Text style={styles.ligneDetail}>{item.categorie}</Text>
              <TouchableOpacity style={styles.btnSupprimer} onPress={() => supprimerAnnonce(item.id)}>
                <Text style={styles.btnSupprimerTxt}>Supprimer l'annonce</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f7' },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ongletsRow: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 8, paddingTop: 8 },
  ongletBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  ongletBtnActif: { borderBottomColor: '#2c3e50' },
  ongletTxt: { fontSize: 12, color: '#7f8c8d', fontWeight: '600' },
  ongletTxtActif: { color: '#2c3e50' },
  contenu: { padding: 16 },
  statCard: { backgroundColor: '#fff', borderRadius: 12, padding: 18, alignItems: 'center', marginBottom: 12 },
  statNombre: { fontSize: 32, fontWeight: '800', color: '#2c3e50' },
  statLabel: { fontSize: 13, color: '#7f8c8d', marginTop: 4 },
  statsGrille: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 12 },
  statMini: { width: '48%', backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10 },
  statMiniNombre: { fontSize: 22, fontWeight: '700', color: '#2c3e50' },
  statMiniLabel: { fontSize: 11, color: '#7f8c8d', marginTop: 2 },
  liste: { flex: 1, padding: 12 },
  ligneCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10 },
  ligneTitre: { fontSize: 14, fontWeight: '700', color: '#2c3e50' },
  ligneDetail: { fontSize: 12, color: '#7f8c8d', marginTop: 2 },
  badgeRole: { alignSelf: 'flex-start', backgroundColor: '#eaf0f6', paddingVertical: 3, paddingHorizontal: 10, borderRadius: 10, marginTop: 6 },
  badgeRoleTxt: { fontSize: 11, fontWeight: '700', color: '#2c3e50' },
  btnSupprimer: { marginTop: 10, backgroundColor: '#e74c3c', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  btnSupprimerTxt: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
