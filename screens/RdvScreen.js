import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, FlatList, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { collection, getDocs, addDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

function formatDate(d) {
  const annee = d.getFullYear();
  const mois = String(d.getMonth() + 1).padStart(2, '0');
  const jour = String(d.getDate()).padStart(2, '0');
  return `${annee}-${mois}-${jour}`;
}

function formatHeure(d) {
  const heures = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${heures}:${minutes}`;
}

export default function RdvScreen({ navigation }) {
  const [hopitaux, setHopitaux] = useState([]);
  const [hopitalSelectionne, setHopitalSelectionne] = useState(null);
  const [dateObj, setDateObj] = useState(new Date());
  const [heureObj, setHeureObj] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [mesRdv, setMesRdv] = useState([]);
  const [vue, setVue] = useState('nouveau');

  useEffect(() => {
    chargerHopitaux();
    chargerMesRdv();
  }, []);

  const chargerHopitaux = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'hopitaux'));
      const liste = [];
      snapshot.forEach((doc) => liste.push({ id: doc.id, ...doc.data() }));
      setHopitaux(liste);
    } catch (error) {
      console.log('Erreur chargement hopitaux:', error);
    } finally {
      setLoading(false);
    }
  };

  const chargerMesRdv = async () => {
    try {
      const q = query(
        collection(db, 'rendez_vous'),
        where('utilisateur_id', '==', auth.currentUser.uid)
      );
      const snapshot = await getDocs(q);
      const liste = [];
      snapshot.forEach((doc) => liste.push({ id: doc.id, ...doc.data() }));
      liste.sort((a, b) => (a.date + a.heure).localeCompare(b.date + b.heure));
      setMesRdv(liste);
    } catch (error) {
      console.log('Erreur chargement RDV:', error);
    }
  };

  const prendreRdv = async () => {
    if (!hopitalSelectionne) {
      Alert.alert('Erreur', 'Merci de choisir un hopital');
      return;
    }

    setEnvoiEnCours(true);
    try {
      await addDoc(collection(db, 'rendez_vous'), {
        utilisateur_id: auth.currentUser.uid,
        utilisateur_email: auth.currentUser.email,
        hopital_id: hopitalSelectionne.id,
        hopital_nom: hopitalSelectionne.nom,
        date: formatDate(dateObj),
        heure: formatHeure(heureObj),
        statut: 'en_attente',
        cree_le: serverTimestamp(),
      });

      Alert.alert('Succes', 'Votre demande de rendez-vous a ete envoyee');
      setHopitalSelectionne(null);
      setDateObj(new Date());
      setHeureObj(new Date());
      chargerMesRdv();
      setVue('mesrdv');
    } catch (error) {
      Alert.alert('Erreur', "Impossible d'enregistrer: " + error.message);
    } finally {
      setEnvoiEnCours(false);
    }
  };

  const statutLabel = (statut) => {
    if (statut === 'confirme') return { text: 'Confirme', color: '#27ae60' };
    if (statut === 'annule') return { text: 'Annule', color: '#e74c3c' };
    return { text: 'En attente', color: '#f39c12' };
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e74c3c" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabSwitch}>
        <TouchableOpacity
          style={[styles.tabBtn, vue === 'nouveau' && styles.tabBtnActive]}
          onPress={() => setVue('nouveau')}
        >
          <Text style={[styles.tabBtnText, vue === 'nouveau' && styles.tabBtnTextActive]}>
            Nouveau RDV
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, vue === 'mesrdv' && styles.tabBtnActive]}
          onPress={() => setVue('mesrdv')}
        >
          <Text style={[styles.tabBtnText, vue === 'mesrdv' && styles.tabBtnTextActive]}>
            Mes RDV ({mesRdv.length})
          </Text>
        </TouchableOpacity>
      </View>

      {vue === 'nouveau' && (
        <ScrollView style={styles.content}>
          <Text style={styles.label}>1. Choisissez un hopital</Text>
          {hopitaux.map((h) => (
            <TouchableOpacity
              key={h.id}
              style={[
                styles.hopitalCard,
                hopitalSelectionne?.id === h.id && styles.hopitalCardSelected,
              ]}
              onPress={() => setHopitalSelectionne(h)}
            >
              <Text style={styles.hopitalNom}>{h.nom}</Text>
              {hopitalSelectionne?.id === h.id && <Text style={styles.checkmark}>OK</Text>}
            </TouchableOpacity>
          ))}

          <Text style={styles.label}>2. Date souhaitee</Text>
          <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.inputText}>{formatDate(dateObj)}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={dateObj}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date()}
              onChange={(event, selectedDate) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (selectedDate) setDateObj(selectedDate);
              }}
            />
          )}

          <Text style={styles.label}>3. Heure souhaitee</Text>
          <TouchableOpacity style={styles.input} onPress={() => setShowTimePicker(true)}>
            <Text style={styles.inputText}>{formatHeure(heureObj)}</Text>
          </TouchableOpacity>
          {showTimePicker && (
            <DateTimePicker
              value={heureObj}
              mode="time"
              is24Hour={true}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedTime) => {
                setShowTimePicker(Platform.OS === 'ios');
                if (selectedTime) setHeureObj(selectedTime);
              }}
            />
          )}

          {envoiEnCours ? (
            <ActivityIndicator size="large" color="#e74c3c" style={{ marginTop: 20 }} />
          ) : (
            <TouchableOpacity style={styles.submitBtn} onPress={prendreRdv}>
              <Text style={styles.submitBtnText}>Demander le rendez-vous</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {vue === 'mesrdv' && (
        <FlatList
          style={styles.content}
          data={mesRdv}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Vous n'avez pas encore de rendez-vous</Text>
          }
          renderItem={({ item }) => {
            const statut = statutLabel(item.statut);
            return (
              <View style={styles.rdvCard}>
                <Text style={styles.rdvHopital}>{item.hopital_nom}</Text>
                <Text style={styles.rdvDate}>{item.date} a {item.heure}</Text>
                <Text style={[styles.rdvStatut, { color: statut.color }]}>{statut.text}</Text>
                {item.statut === 'confirme' && (
                  <TouchableOpacity
                    style={styles.visioBtn}
                    onPress={() => navigation.navigate('Visio', { roomName: 'pharmacieplus_rdv_' + item.id })}
                  >
                    <Text style={styles.visioBtnText}>🎥 Demarrer la teleconsultation</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabSwitch: { flexDirection: 'row', backgroundColor: '#f4f7f8', padding: 6, margin: 15, borderRadius: 10 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabBtnActive: { backgroundColor: '#fff', elevation: 2 },
  tabBtnText: { fontSize: 13, color: '#7f8c8d', fontWeight: '600' },
  tabBtnTextActive: { color: '#e74c3c' },
  content: { flex: 1, paddingHorizontal: 15 },
  label: { fontSize: 14, fontWeight: '700', color: '#2c3e50', marginTop: 15, marginBottom: 8 },
  hopitalCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, borderRadius: 10, borderWidth: 1.5, borderColor: '#eee', marginBottom: 8,
  },
  hopitalCardSelected: { borderColor: '#e74c3c', backgroundColor: '#fdf2f2' },
  hopitalNom: { fontSize: 14, color: '#2c3e50', fontWeight: '600' },
  checkmark: { color: '#e74c3c', fontWeight: 'bold', fontSize: 14 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  inputText: { fontSize: 15, color: '#2c3e50' },
  submitBtn: {
    backgroundColor: '#e74c3c', borderRadius: 10, paddingVertical: 15,
    alignItems: 'center', marginTop: 25, marginBottom: 30,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  emptyText: { textAlign: 'center', color: '#7f8c8d', marginTop: 40 },
  rdvCard: {
    padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#eee',
    marginTop: 10, marginBottom: 5,
  },
  rdvHopital: { fontSize: 15, fontWeight: '700', color: '#2c3e50' },
  rdvDate: { fontSize: 13, color: '#7f8c8d', marginTop: 4 },
  rdvStatut: { fontSize: 13, fontWeight: '600', marginTop: 6 },
  visioBtn: { backgroundColor: '#27ae60', borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 10 },
  visioBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
