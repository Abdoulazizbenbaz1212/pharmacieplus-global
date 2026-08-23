import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

const OPTIONS = [
  { nom: 'Assistant', label: 'Assistant sante IA', emoji: '🤖' },
  { nom: 'Medicaments', label: 'Medicaments', emoji: '💊' },
  { nom: 'Rdv', label: 'Rendez-vous', emoji: '📅' },
  { nom: 'Commandes', label: 'Mes commandes', emoji: '📦' },
  { nom: 'Scanner', label: 'Scanner un etablissement', emoji: '📷' },
  { nom: 'Profil', label: 'Coffre-fort medical', emoji: '🗂️' },
];

export default function PlusScreen({ navigation }) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      {OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.nom}
          style={styles.item}
          onPress={() => navigation.navigate(opt.nom)}
        >
          <Text style={styles.emoji}>{opt.emoji}</Text>
          <Text style={styles.label}>{opt.label}</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f7' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  emoji: { fontSize: 22, marginRight: 14 },
  label: { flex: 1, fontSize: 16, fontWeight: '600', color: '#2c3e50' },
  chevron: { fontSize: 22, color: '#bbb' },
});
