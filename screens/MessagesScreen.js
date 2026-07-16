import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import ChatModal from '../components/ChatModal';

export default function MessagesScreen() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatConfig, setChatConfig] = useState(null);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const qAcheteur = query(
      collection(db, 'marketplace_conversations'),
      where('buyerId', '==', user.uid)
    );
    const qVendeur = query(
      collection(db, 'marketplace_conversations'),
      where('sellerId', '==', user.uid)
    );

    let convAcheteur = [];
    let convVendeur = [];

    function fusionnerEtTrier() {
      const toutes = [...convAcheteur, ...convVendeur];
      const uniques = Array.from(new Map(toutes.map(c => [c.id, c])).values());
      uniques.sort((a, b) => {
        const ta = a.lastMessageAt ? a.lastMessageAt.toMillis() : 0;
        const tb = b.lastMessageAt ? b.lastMessageAt.toMillis() : 0;
        return tb - ta;
      });
      setConversations(uniques);
      setLoading(false);
    }

    const unsub1 = onSnapshot(qAcheteur, (snap) => {
      convAcheteur = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      fusionnerEtTrier();
    });
    const unsub2 = onSnapshot(qVendeur, (snap) => {
      convVendeur = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      fusionnerEtTrier();
    });

    return () => { unsub1(); unsub2(); };
  }, []);

  function estNonLu(conv) {
    const suisAcheteur = conv.buyerId === user.uid;
    const dernierMsg = conv.lastMessageAt ? conv.lastMessageAt.toMillis() : 0;
    const champLecture = suisAcheteur ? conv.lastReadAt_buyer : conv.lastReadAt_seller;
    const derniereLecture = champLecture ? champLecture.toMillis() : 0;
    return dernierMsg > derniereLecture;
  }

  function ouvrirConversation(conv) {
    const suisAcheteur = conv.buyerId === user.uid;
    setChatConfig({
      conversationId: conv.id,
      titre: conv.itemTitre,
      autreNom: suisAcheteur ? conv.sellerNom : conv.buyerNom,
      itemId: conv.itemId,
      itemTitre: conv.itemTitre,
      buyerId: conv.buyerId,
      buyerNom: conv.buyerNom,
      sellerId: conv.sellerId,
      sellerNom: conv.sellerNom,
    });
  }

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#3498db" style={{ marginTop: 40 }} />
      ) : conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emoji}>💬</Text>
          <Text style={styles.title}>Aucun message</Text>
          <Text style={styles.subtitle}>Tes conversations depuis la Marketplace apparaîtront ici.</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={c => c.id}
          renderItem={({ item: conv }) => {
            const suisAcheteur = conv.buyerId === user.uid;
            const nonLu = estNonLu(conv);
            return (
              <TouchableOpacity style={styles.convRow} onPress={() => ouvrirConversation(conv)}>
                <View style={{ flex: 1 }}>
                  <View style={styles.rowHaut}>
                    <Text style={[styles.convNom, nonLu && styles.gras]}>
                      {suisAcheteur ? conv.sellerNom : conv.buyerNom}
                    </Text>
                    {nonLu && <View style={styles.badge} />}
                  </View>
                  <Text style={styles.convItem}>{conv.itemTitre}</Text>
                  {conv.lastMessage ? (
                    <Text style={[styles.convDernier, nonLu && styles.gras]} numberOfLines={1}>
                      {conv.lastMessage}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {chatConfig && (
        <ChatModal
          visible={!!chatConfig}
          onClose={() => setChatConfig(null)}
          monNom={chatConfig.buyerId === user.uid ? chatConfig.buyerNom : chatConfig.sellerNom}
          {...chatConfig}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  emoji: { fontSize: 50, marginBottom: 10 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#2c3e50' },
  subtitle: { fontSize: 14, color: '#7f8c8d', marginTop: 8, textAlign: 'center' },
  convRow: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  rowHaut: { flexDirection: 'row', alignItems: 'center' },
  convNom: { fontSize: 15, fontWeight: '600', color: '#2c3e50' },
  gras: { fontWeight: 'bold', color: '#000' },
  badge: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#e74c3c', marginLeft: 8 },
  convItem: { fontSize: 12, color: '#3498db', marginTop: 2 },
  convDernier: { fontSize: 13, color: '#7f8c8d', marginTop: 4 },
});
