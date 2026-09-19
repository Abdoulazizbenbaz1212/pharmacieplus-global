import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

const OPTIONS = [
  { nom: 'Assistant', cle: 'plus.assistantSanteIA', emoji: '🤖' },
  { nom: 'Medicaments', cle: 'plus.medicaments', emoji: '💊' },
  { nom: 'Rdv', cle: 'plus.rendezVous', emoji: '📅' },
  { nom: 'Commandes', cle: 'plus.mesCommandes', emoji: '📦' },
  { nom: 'Scanner', cle: 'plus.scannerEtablissement', emoji: '📷' },
  { nom: 'Profil', cle: 'plus.coffreFortMedical', emoji: '🗂️' },
];

export default function PlusScreen({ navigation }) {
  const { t } = useTranslation();
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      {OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.nom}
          style={styles.item}
          onPress={() => navigation.navigate(opt.nom)}
        >
          <Text style={styles.emoji}>{opt.emoji}</Text>
          <Text style={styles.label}>{t(opt.cle)}</Text>
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
