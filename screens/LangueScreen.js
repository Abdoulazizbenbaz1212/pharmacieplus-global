import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LANGUES_SUPPORTEES, NOMS_LANGUES, changerLangue } from '../config/i18n';

export default function LangueScreen() {
  const { t, i18n } = useTranslation();

  return (
    <View style={styles.container}>
      <FlatList
        data={LANGUES_SUPPORTEES}
        keyExtractor={(code) => code}
        renderItem={({ item: code }) => (
          <TouchableOpacity
            style={[styles.ligne, i18n.language === code && styles.ligneActive]}
            onPress={() => changerLangue(code)}
          >
            <Text style={styles.nomLangue}>{NOMS_LANGUES[code]}</Text>
            {i18n.language === code && <Text style={styles.coche}>✓</Text>}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  ligne: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  ligneActive: { backgroundColor: '#f0f9f6' },
  nomLangue: { fontSize: 16, color: '#2c3e50' },
  coche: { fontSize: 18, color: '#0e9594', fontWeight: 'bold' },
});
