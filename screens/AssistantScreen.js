import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, Platform, ActivityIndicator, Keyboard,
} from 'react-native';

const MESSAGE_BIENVENUE = {
  id: 'bienvenue',
  role: 'assistant',
  content: "Bonjour, je suis l'assistant sante de Pharmacie+ Global. Pose-moi tes questions sur les symptomes, les maladies courantes ou les premiers gestes a avoir. Je ne remplace pas un medecin: en cas d'urgence ou de doute serieux, consulte un professionnel de sante.",
};

export default function AssistantScreen() {
  const [messages, setMessages] = useState([MESSAGE_BIENVENUE]);
  const [texte, setTexte] = useState('');
  const [enChargement, setEnChargement] = useState(false);
  const [hauteurClavier, setHauteurClavier] = useState(0);
  const listeRef = useRef(null);

  useEffect(() => {
    const evtShow = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const evtHide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const subShow = Keyboard.addListener(evtShow, (e) => {
      setHauteurClavier(e.endCoordinates.height);
    });
    const subHide = Keyboard.addListener(evtHide, () => {
      setHauteurClavier(0);
    });

    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  const envoyerMessage = async () => {
    const contenu = texte.trim();
    if (!contenu || enChargement) return;

    const nouveauMessage = { id: Date.now() + '_user', role: 'user', content: contenu };
    const historique = [...messages, nouveauMessage];
    setMessages(historique);
    setTexte('');
    setEnChargement(true);

    try {
      const reponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b',
          messages: [
            {
              role: 'system',
              content: "Tu es un assistant sante bienveillant pour l'application Pharmacie+ Global, utilisee au Cameroun et ailleurs. Tu donnes des informations generales et educatives sur la sante (symptomes, premiers gestes, prevention). Tu ne poses jamais de diagnostic definitif et tu rappelles systematiquement, quand c'est pertinent, de consulter un professionnel de sante en cas de doute ou d'urgence. Reponds toujours en francais, de maniere simple et rassurante, en quelques phrases courtes.",
            },
            ...historique.map((m) => ({ role: m.role, content: m.content })),
          ],
          temperature: 0.4,
          max_tokens: 500,
        }),
      });

      const data = await reponse.json();

      if (!reponse.ok) {
        throw new Error(data.error?.message || "Erreur de l'assistant");
      }

      const reponseTexte = data.choices?.[0]?.message?.content || "Desole, je n'ai pas pu repondre.";
      setMessages((prev) => [...prev, { id: Date.now() + '_ai', role: 'assistant', content: reponseTexte }]);
    } catch (error) {
      setMessages((prev) => [...prev, {
        id: Date.now() + '_err',
        role: 'assistant',
        content: "Desole, une erreur est survenue. Verifie ta connexion et reessaie.",
      }]);
    } finally {
      setEnChargement(false);
      setTimeout(() => listeRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={listeRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 15 }}
        onContentSizeChange={() => listeRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View style={[styles.bulle, item.role === 'user' ? styles.bulleUser : styles.bulleAssistant]}>
            <Text style={item.role === 'user' ? styles.texteUser : styles.texteAssistant}>
              {item.content}
            </Text>
          </View>
        )}
      />

      {enChargement && (
        <View style={styles.chargement}>
          <ActivityIndicator size="small" color="#e74c3c" />
        </View>
      )}

      <View style={[styles.inputRow, { marginBottom: hauteurClavier }]}>
        <TextInput
          style={styles.input}
          placeholder="Pose ta question sante..."
          value={texte}
          onChangeText={setTexte}
          multiline
        />
        <TouchableOpacity style={styles.envoyerBtn} onPress={envoyerMessage} disabled={enChargement}>
          <Text style={styles.envoyerBtnText}>➤</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f7' },
  bulle: { maxWidth: '85%', borderRadius: 14, padding: 12, marginBottom: 10 },
  bulleUser: { backgroundColor: '#e74c3c', alignSelf: 'flex-end' },
  bulleAssistant: { backgroundColor: '#fff', alignSelf: 'flex-start', borderWidth: 1, borderColor: '#eee' },
  texteUser: { color: '#fff', fontSize: 14 },
  texteAssistant: { color: '#2c3e50', fontSize: 14 },
  chargement: { paddingHorizontal: 15, paddingBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', padding: 10,
    borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: '#fff',
  },
  input: {
    flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100, fontSize: 14,
  },
  envoyerBtn: {
    backgroundColor: '#e74c3c', width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },
  envoyerBtnText: { color: '#fff', fontSize: 18 },
});
