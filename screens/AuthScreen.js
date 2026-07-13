import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const ROLES = [
  { id: 'patient', label: 'Patient', emoji: '🧑' },
  { id: 'hopital', label: 'Hopital', emoji: '🏥' },
  { id: 'pharmacie', label: 'Pharmacie', emoji: '💊' },
  { id: 'fournisseur', label: 'Fournisseur', emoji: '📦' },
];

export default function AuthScreen() {
  const [mode, setMode] = useState('connexion');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmationMotDePasse, setConfirmationMotDePasse] = useState('');
  const [roleSelectionne, setRoleSelectionne] = useState('patient');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !motDePasse.trim()) {
      Alert.alert('Erreur', 'Merci de remplir email et mot de passe');
      return;
    }
    if (mode === 'inscription') {
      if (!nom.trim()) {
        Alert.alert('Erreur', 'Merci de renseigner votre nom');
        return;
      }
      if (motDePasse !== confirmationMotDePasse) {
        Alert.alert('Erreur', 'Les deux mots de passe ne correspondent pas');
        return;
      }
      if (motDePasse.length < 6) {
        Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caracteres');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'inscription') {
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), motDePasse);
        await setDoc(doc(db, 'utilisateurs', userCredential.user.uid), {
          nom: nom.trim(),
          email: email.trim(),
          role: roleSelectionne,
          cree_le: new Date().toISOString(),
        });
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), motDePasse);
      }
    } catch (error) {
      let message = "Une erreur s'est produite";
      if (error.code === 'auth/email-already-in-use') message = 'Cet email est deja utilise';
      if (error.code === 'auth/invalid-email') message = 'Email invalide';
      if (error.code === 'auth/weak-password') message = 'Mot de passe trop court (6 caracteres min)';
      if (error.code === 'auth/invalid-credential') message = 'Email ou mot de passe incorrect';
      Alert.alert('Erreur', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.logoCircle}>
          <Text style={styles.logoEmoji}>⚕️</Text>
        </View>
        <Text style={styles.title}>Pharmacie+ Global</Text>
        <Text style={styles.subtitle}>
          {mode === 'connexion' ? 'Content de vous revoir' : 'Creez votre compte sante'}
        </Text>

        <View style={styles.card}>
          {mode === 'inscription' && (
            <>
              <Text style={styles.inputLabel}>Je suis</Text>
              <View style={styles.rolesRow}>
                {ROLES.map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.roleBtn, roleSelectionne === r.id && styles.roleBtnActive]}
                    onPress={() => setRoleSelectionne(r.id)}
                  >
                    <Text style={styles.roleEmoji}>{r.emoji}</Text>
                    <Text style={[styles.roleLabel, roleSelectionne === r.id && styles.roleLabelActive]}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {roleSelectionne === 'patient' ? 'Nom complet' : "Nom de l'etablissement"}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={roleSelectionne === 'patient' ? 'Ex: Jean Mballa' : 'Ex: Pharmacie du Centre'}
                  placeholderTextColor="#a0a8b0"
                  value={nom}
                  onChangeText={setNom}
                />
              </View>
            </>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="exemple@email.com"
              placeholderTextColor="#a0a8b0"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Mot de passe</Text>
            <TextInput
              style={styles.input}
              placeholder="6 caracteres minimum"
              placeholderTextColor="#a0a8b0"
              value={motDePasse}
              onChangeText={setMotDePasse}
              secureTextEntry
            />
          </View>

          {mode === 'inscription' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirmer le mot de passe</Text>
              <TextInput
                style={styles.input}
                placeholder="Retapez le mot de passe"
                placeholderTextColor="#a0a8b0"
                value={confirmationMotDePasse}
                onChangeText={setConfirmationMotDePasse}
                secureTextEntry
              />
            </View>
          )}

          {loading ? (
            <ActivityIndicator size="large" color="#0e9594" style={{ marginTop: 20 }} />
          ) : (
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.85}>
              <Text style={styles.submitBtnText}>
                {mode === 'connexion' ? 'Se connecter' : 'Creer mon compte'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={() => {
            setMode(mode === 'connexion' ? 'inscription' : 'connexion');
            setMotDePasse('');
            setConfirmationMotDePasse('');
          }}
          style={styles.switchBtn}
        >
          <Text style={styles.switchBtnText}>
            {mode === 'connexion' ? 'Pas encore de compte ? ' : 'Deja un compte ? '}
            <Text style={styles.switchBtnTextBold}>
              {mode === 'connexion' ? "S'inscrire" : 'Se connecter'}
            </Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#f4f7f8' },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#0e9594', alignSelf: 'center',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  logoEmoji: { fontSize: 34 },
  title: { fontSize: 24, fontWeight: '700', color: '#1a2b34', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6b7b82', textAlign: 'center', marginTop: 6, marginBottom: 24 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#6b7b82', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#e1e6e8', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    backgroundColor: '#fafbfc', color: '#1a2b34',
  },
  rolesRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, gap: 8 },
  roleBtn: {
    width: '47%', borderWidth: 1.5, borderColor: '#e1e6e8', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center', marginBottom: 8,
  },
  roleBtnActive: { borderColor: '#0e9594', backgroundColor: '#e8f7f6' },
  roleEmoji: { fontSize: 24, marginBottom: 4 },
  roleLabel: { fontSize: 12, color: '#6b7b82', fontWeight: '600' },
  roleLabelActive: { color: '#0e9594' },
  submitBtn: {
    backgroundColor: '#0e9594', borderRadius: 10, paddingVertical: 15,
    alignItems: 'center', marginTop: 4,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  switchBtn: { marginTop: 24, alignItems: 'center' },
  switchBtnText: { color: '#6b7b82', fontSize: 14 },
  switchBtnTextBold: { color: '#0e9594', fontWeight: '700' },
});
