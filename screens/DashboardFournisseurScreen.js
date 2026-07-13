import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function DashboardFournisseurScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>📦</Text>
      <Text style={styles.title}>Tableau de bord Fournisseur</Text>
      <Text style={styles.subtitle}>
        Bientot disponible : catalogue produits, demandes de devis des hopitaux
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  emoji: { fontSize: 50, marginBottom: 10 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50' },
  subtitle: { fontSize: 14, color: '#7f8c8d', marginTop: 10, textAlign: 'center' },
});
