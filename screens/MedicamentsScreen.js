import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet,
  TouchableOpacity, ActivityIndicator, ScrollView, FlatList,
} from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

function normaliser(texte) {
  return texte
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // retire les accents pour comparaison
}

function PharmacieCard({ p }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <TouchableOpacity style={styles.prixCard} onPress={() => setOuvert(!ouvert)} activeOpacity={0.7}>
      <View style={styles.prixCardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.pharmacieNom}>{p.pharmacie_nom}</Text>
          <Text style={styles.pharmacieVille}>{p.ville}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.prixValue}>{p.prix} FCFA</Text>
          <Text style={p.en_stock ? styles.enStock : styles.ruptureStock}>
            {p.en_stock ? '✓ En stock' : '✗ Rupture'}
          </Text>
        </View>
      </View>
      {ouvert && (
        <View style={styles.prixCardDetails}>
          <Text style={styles.detailLabel}>Pharmacie</Text>
          <Text style={styles.detailValue}>{p.pharmacie_nom}</Text>
          <Text style={styles.detailLabel}>Ville</Text>
          <Text style={styles.detailValue}>{p.ville}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function MedicamentsScreen() {
  const [recherche, setRecherche] = useState('');
  const [tousLesMedicaments, setTousLesMedicaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [medicamentSelectionne, setMedicamentSelectionne] = useState(null);
  const [prixListe, setPrixListe] = useState([]);
  const [fichedOuverte, setFicheOuverte] = useState(false);
  const [loadingPrix, setLoadingPrix] = useState(false);

  // Charger TOUS les médicaments au démarrage, pour permettre de parcourir la liste
  useEffect(() => {
    (async () => {
      try {
        const snapshot = await getDocs(collection(db, 'medicaments'));
        const liste = [];
        snapshot.forEach((doc) => liste.push({ id: doc.id, ...doc.data() }));
        setTousLesMedicaments(liste);
      } catch (error) {
        console.log('Erreur chargement medicaments:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Filtrage en direct : par nom OU catégorie, partiel, sans accents/casse
  const rechercheNorm = normaliser(recherche);
  const resultatsFiltres = recherche.trim() === ''
    ? tousLesMedicaments
    : tousLesMedicaments.filter((m) =>
        normaliser(m.nom).includes(rechercheNorm) ||
        normaliser(m.categorie || '').includes(rechercheNorm) ||
        normaliser(m.mots_cles || '').includes(rechercheNorm)
      );

  const selectionnerMedicament = async (medData) => {
    setMedicamentSelectionne(medData);
    setFicheOuverte(true);
    setPrixListe([]);
    setLoadingPrix(true);
    try {
      const prixQuery = query(
        collection(db, 'prix_pharmacie'),
        where('medicament_nom', '==', medData.nom)
      );
      const prixSnapshot = await getDocs(prixQuery);
      const prix = [];
      prixSnapshot.forEach((doc) => prix.push({ id: doc.id, ...doc.data() }));
      prix.sort((a, b) => a.prix - b.prix);
      setPrixListe(prix);
    } catch (error) {
      console.log('Erreur prix:', error);
    } finally {
      setLoadingPrix(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="Nom, symptôme (ex: palu, toux, fièvre)..."
          value={recherche}
          onChangeText={(text) => {
            setRecherche(text);
            setMedicamentSelectionne(null);
          }}
        />
      </View>

      {loading && <ActivityIndicator size="large" color="#e74c3c" style={{ marginTop: 20 }} />}

      {!loading && !medicamentSelectionne && (
        <FlatList
          data={resultatsFiltres}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <Text style={styles.warning}>Aucun médicament trouvé pour "{recherche}"</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.listItem} onPress={() => selectionnerMedicament(item)}>
              <Text style={styles.listItemNom}>{item.nom}</Text>
              <Text style={styles.listItemCategorie}>{item.categorie}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {medicamentSelectionne && (
        <ScrollView>
          <TouchableOpacity
            style={styles.retourBtn}
            onPress={() => setMedicamentSelectionne(null)}
          >
            <Text style={styles.retourBtnText}>← Retour à la liste</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.card}
            onPress={() => setFicheOuverte(!fichedOuverte)}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.nom}>{medicamentSelectionne.nom}</Text>
                <Text style={styles.categorie}>{medicamentSelectionne.categorie}</Text>
              </View>
              <Text style={styles.chevron}>{fichedOuverte ? '▲' : '▼'}</Text>
            </View>

            {fichedOuverte && (
              <View>
                <Text style={styles.label}>Description</Text>
                <Text style={styles.value}>{medicamentSelectionne.description}</Text>
                <Text style={styles.label}>Dosage</Text>
                <Text style={styles.value}>{medicamentSelectionne.dosage}</Text>
                <Text style={styles.label}>⚠️ Contre-indications</Text>
                <Text style={styles.value}>{medicamentSelectionne.contre_indications}</Text>
              </View>
            )}
          </TouchableOpacity>

          {loadingPrix && <ActivityIndicator size="small" color="#e74c3c" />}

          {prixListe.length > 0 && (
            <View style={styles.prixSection}>
              <Text style={styles.prixTitle}>💰 Comparer les prix ({prixListe.length})</Text>
              {prixListe.map((p) => (
                <PharmacieCard key={p.id} p={p} />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  searchBar: { padding: 15, backgroundColor: '#f5f5f5' },
  input: {
    backgroundColor: '#fff', borderRadius: 8,
    paddingHorizontal: 15, paddingVertical: 10, borderWidth: 1, borderColor: '#ddd',
  },
  warning: { padding: 20, textAlign: 'center', color: '#e67e22' },
  listItem: {
    paddingVertical: 14, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  listItemNom: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50' },
  listItemCategorie: { fontSize: 13, color: '#7f8c8d', marginTop: 2 },
  retourBtn: { padding: 15 },
  retourBtnText: { color: '#3498db', fontSize: 14, fontWeight: 'bold' },
  card: { margin: 15, marginTop: 0, padding: 15, backgroundColor: '#f8f9fa', borderRadius: 10 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  chevron: { fontSize: 14, color: '#7f8c8d', marginLeft: 10 },
  nom: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50' },
  categorie: { fontSize: 13, color: '#3498db', marginTop: 2 },
  label: { fontSize: 13, fontWeight: 'bold', color: '#7f8c8d', marginTop: 12 },
  value: { fontSize: 14, color: '#2c3e50', marginTop: 2 },
  prixSection: { margin: 15, marginTop: 0 },
  prixTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#2c3e50' },
  prixCard: {
    padding: 12, backgroundColor: '#fff', borderRadius: 8,
    borderWidth: 1, borderColor: '#eee', marginBottom: 8,
  },
  prixCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pharmacieNom: { fontSize: 15, fontWeight: 'bold', color: '#2c3e50' },
  pharmacieVille: { fontSize: 12, color: '#7f8c8d' },
  prixValue: { fontSize: 16, fontWeight: 'bold', color: '#27ae60' },
  enStock: { fontSize: 11, color: '#27ae60' },
  ruptureStock: { fontSize: 11, color: '#e74c3c' },
  prixCardDetails: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eee' },
  detailLabel: { fontSize: 12, fontWeight: 'bold', color: '#7f8c8d', marginTop: 6 },
  detailValue: { fontSize: 14, color: '#2c3e50' },
});
