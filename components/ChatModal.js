import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ActivityIndicator, FlatList, Modal, Alert, Platform, Keyboard,
} from 'react-native';
import {
  collection, addDoc, doc, query, orderBy,
  serverTimestamp, onSnapshot, setDoc,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export default function ChatModal({
  visible, onClose, conversationId, titre, autreNom, monNom,
  buyerId, buyerNom, sellerId, sellerNom, itemId, itemTitre,
}) {
  const [messages, setMessages] = useState([]);
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [pret, setPret] = useState(false);
  const [hauteurClavier, setHauteurClavier] = useState(0);

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
  const flatListRef = useRef(null);
  const user = auth.currentUser;
  const suisAcheteur = user && user.uid === buyerId;

  useEffect(() => {
    if (!visible || !conversationId || !user) return;
    setPret(false);
    const convRef = doc(db, 'marketplace_conversations', conversationId);

    async function initEtMarquerLu() {
      try {
        const champLecture = suisAcheteur ? 'lastReadAt_buyer' : 'lastReadAt_seller';
        await setDoc(convRef, {
          itemId, itemTitre, buyerId, buyerNom, sellerId, sellerNom,
          lastMessageAt: serverTimestamp(),
          [champLecture]: serverTimestamp(),
        }, { merge: true });
        setPret(true);
      } catch (error) {
        console.log('Erreur init conversation:', error);
      }
    }
    initEtMarquerLu();

    const messagesRef = collection(db, 'marketplace_conversations', conversationId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsubscribe;
  }, [visible, conversationId]);

  async function envoyerMessage() {
    if (!texte.trim() || !conversationId || !pret) return;
    const texteAEnvoyer = texte.trim();
    setEnvoi(true);
    try {
      const champLecture = suisAcheteur ? 'lastReadAt_buyer' : 'lastReadAt_seller';
      const convRef = doc(db, 'marketplace_conversations', conversationId);
      await setDoc(convRef, {
        itemId, itemTitre, buyerId, buyerNom, sellerId, sellerNom,
        lastMessage: texteAEnvoyer,
        lastMessageAt: serverTimestamp(),
        [champLecture]: serverTimestamp(),
      }, { merge: true });

      const messagesRef = collection(db, 'marketplace_conversations', conversationId, 'messages');
      await addDoc(messagesRef, {
        senderId: user.uid,
        senderNom: monNom,
        texte: texteAEnvoyer,
        createdAt: serverTimestamp(),
      });
      setTexte('');
    } catch (error) {
      console.log('Erreur envoi message:', error);
      Alert.alert('Erreur', "L'envoi a échoué. Réessaie.");
    }
    setEnvoi(false);
  }

  if (!conversationId) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={onClose} style={{ marginRight: 12 }}>
            <Text style={{ fontSize: 20 }}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.chatHeaderTitre}>{autreNom}</Text>
            <Text style={styles.chatHeaderSous}>{titre}</Text>
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={m => m.id}
          contentContainerStyle={{ padding: 15 }}
          renderItem={({ item: msg }) => {
            const estMoi = msg.senderId === user.uid;
            return (
              <View style={[styles.bulle, estMoi ? styles.bulleMoi : styles.bulleAutre]}>
                <Text style={estMoi ? styles.bulleTexteMoi : styles.bulleTexteAutre}>{msg.texte}</Text>
              </View>
            );
          }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        <View style={[styles.chatInputRow, { marginBottom: hauteurClavier }]}>
          <TextInput
            style={styles.chatInput}
            value={texte}
            onChangeText={setTexte}
            placeholder="Écris un message..."
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={envoyerMessage} disabled={envoi}>
            {envoi ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.sendBtnText}>➤</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  chatHeader: {
    flexDirection: 'row', alignItems: 'center', padding: 15,
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  chatHeaderTitre: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50' },
  chatHeaderSous: { fontSize: 12, color: '#7f8c8d' },
  bulle: { maxWidth: '75%', padding: 10, borderRadius: 12, marginBottom: 8 },
  bulleMoi: { backgroundColor: '#3498db', alignSelf: 'flex-end', borderBottomRightRadius: 2 },
  bulleAutre: { backgroundColor: '#f0f0f0', alignSelf: 'flex-start', borderBottomLeftRadius: 2 },
  bulleTexteMoi: { color: '#fff', fontSize: 14 },
  bulleTexteAutre: { color: '#2c3e50', fontSize: 14 },
  chatInputRow: {
    flexDirection: 'row', alignItems: 'center', padding: 10,
    borderTopWidth: 1, borderTopColor: '#eee',
  },
  chatInput: {
    flex: 1, backgroundColor: '#f8f9fa', borderRadius: 20, paddingHorizontal: 15,
    paddingVertical: 10, fontSize: 14, maxHeight: 100, marginRight: 8,
  },
  sendBtn: {
    backgroundColor: '#3498db', width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnText: { color: '#fff', fontSize: 18 },
});
