import React, { useState, useEffect, useCallback, useRef } from 'react';
import { alertCompatible } from '../utils/alertCompatible';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Alert, Modal, FlatList, Share, Platform, Keyboard,
} from 'react-native';
import {
  doc, getDoc, setDoc, collection, addDoc, getDocs,
  query, where, deleteDoc, updateDoc, orderBy, onSnapshot, serverTimestamp, collectionGroup,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import DocumentsMedicaux from '../components/DocumentsMedicaux';
import QRCode from 'react-native-qrcode-svg';

const GROUPES_SANGUINS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
const LIENS_PARENTE = ['Père', 'Mère', 'Enfant', 'Conjoint(e)', 'Grand-parent', 'Autre'];

function genererCode() {
  const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += caracteres[Math.floor(Math.random() * caracteres.length)];
  }
  return code;
}

export default function FamilleScreen() {
  const [loading, setLoading] = useState(true);
  const [familleId, setFamilleId] = useState(null);
  const [codeInvitation, setCodeInvitation] = useState('');
  const [membres, setMembres] = useState([]);
  const [dependants, setDependants] = useState([]);
  const [codeSaisi, setCodeSaisi] = useState('');
  const [jointure, setJointure] = useState(false);

  const [modalAjout, setModalAjout] = useState(false);
  const [nomDependant, setNomDependant] = useState('');
  const [lienParente, setLienParente] = useState('Père');
  const [ageDependant, setAgeDependant] = useState('');
  const [groupeSanguin, setGroupeSanguin] = useState('');
  const [allergies, setAllergies] = useState('');
  const [maladiesChroniques, setMaladiesChroniques] = useState('');
  const [contactNom, setContactNom] = useState('');
  const [contactTel, setContactTel] = useState('');
  const [enregistrement, setEnregistrement] = useState(false);

  const [modalDetail, setModalDetail] = useState(null);
  const [documentsProcheVisible, setDocumentsProcheVisible] = useState(false);
  const [modalMembre, setModalMembre] = useState(null);
  const [codeLiaisonSaisi, setCodeLiaisonSaisi] = useState("");

  const [chatVisible, setChatVisible] = useState(false);
  const [messages, setMessages] = useState([]);
  const [texteMessage, setTexteMessage] = useState('');
  const [envoiMessage, setEnvoiMessage] = useState(false);
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

  const chargerFamille = useCallback(async () => {
    setLoading(true);
    try {
      const userDoc = await getDoc(doc(db, 'utilisateurs', user.uid));
      const idFamille = userDoc.exists() ? userDoc.data().familleId : null;

      if (!idFamille) {
        setFamilleId(null);
        setLoading(false);
        return;
      }

      const familleDoc = await getDoc(doc(db, 'familles', idFamille));
      if (!familleDoc.exists()) {
        setFamilleId(null);
        setLoading(false);
        return;
      }

      setFamilleId(idFamille);
      setCodeInvitation(familleDoc.data().codeInvitation);

      const membresSnap = await getDocs(collection(db, 'familles', idFamille, 'membres'));
      setMembres(membresSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const dependantsSnap = await getDocs(collection(db, 'familles', idFamille, 'dependants'));
      setDependants(dependantsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.log('Erreur chargement famille:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { chargerFamille(); }, [chargerFamille]);

  useEffect(() => {
    if (!chatVisible || !familleId) return;
    const messagesRef = collection(db, 'familles', familleId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsubscribe;
  }, [chatVisible, familleId]);

  async function envoyerMessageFamille() {
    if (!texteMessage.trim() || !familleId) return;
    setEnvoiMessage(true);
    try {
      await addDoc(collection(db, 'familles', familleId, 'messages'), {
        senderId: user.uid,
        senderNom: user.email,
        texte: texteMessage.trim(),
        createdAt: serverTimestamp(),
      });
      setTexteMessage('');
    } catch (error) {
      alertCompatible('Erreur', "L'envoi a échoué. Réessaie.");
    } finally {
      setEnvoiMessage(false);
    }
  }

  async function creerFamille() {
    try {
      const nouveauCode = genererCode();
      const familleRef = await addDoc(collection(db, 'familles'), {
        proprietaireId: user.uid,
        codeInvitation: nouveauCode,
        createdAt: new Date().toISOString(),
      });
      await setDoc(doc(db, 'familles', familleRef.id, 'membres', user.uid), {
        nom: user.email,
        role: 'proprietaire',
        rejointLe: new Date().toISOString(),
      });
      await updateDoc(doc(db, 'utilisateurs', user.uid), { familleId: familleRef.id });
      chargerFamille();
    } catch (error) {
      alertCompatible('Erreur', "Impossible de creer la famille: " + error.message);
    }
  }

  async function rejoindreFamille() {
    if (!codeSaisi.trim()) return;
    setJointure(true);
    try {
      const q = query(collection(db, 'familles'), where('codeInvitation', '==', codeSaisi.trim().toUpperCase()));
      const snap = await getDocs(q);
      if (snap.empty) {
        alertCompatible('Code invalide', "Aucune famille ne correspond a ce code.");
        setJointure(false);
        return;
      }
      const familleDoc = snap.docs[0];
      await setDoc(doc(db, 'familles', familleDoc.id, 'membres', user.uid), {
        nom: user.email,
        role: 'membre',
        rejointLe: new Date().toISOString(),
      });
      await updateDoc(doc(db, 'utilisateurs', user.uid), { familleId: familleDoc.id });
      setCodeSaisi('');
      chargerFamille();
    } catch (error) {
      alertCompatible('Erreur', "Impossible de rejoindre: " + error.message);
    } finally {
      setJointure(false);
    }
  }

  function partagerCode() {
    Share.share({
      message: `Rejoins notre famille sur Pharmacie+ Global pour suivre la sante de nos proches. Code d'invitation : ${codeInvitation}`,
    });
  }

  function reinitialiserFormulaire() {
    setNomDependant(''); setLienParente('Père'); setAgeDependant('');
    setGroupeSanguin(''); setAllergies(''); setMaladiesChroniques('');
    setContactNom(''); setContactTel('');
  }

  async function ajouterDependant() {
    if (!nomDependant.trim()) {
      alertCompatible('Champ manquant', 'Le nom est obligatoire.');
      return;
    }
    setEnregistrement(true);
    try {
      await addDoc(collection(db, 'familles', familleId, 'dependants'), {
        nom: nomDependant.trim(),
        lienParente,
        age: ageDependant.trim(),
        groupeSanguin,
        allergies,
        maladiesChroniques,
        contactUrgenceNom: contactNom,
        contactUrgenceTel: contactTel,
        ajoutePar: user.uid,
        createdAt: new Date().toISOString(),
      });
      setModalAjout(false);
      reinitialiserFormulaire();
      chargerFamille();
    } catch (error) {
      alertCompatible('Erreur', "Impossible d'ajouter: " + error.message);
    } finally {
      setEnregistrement(false);
    }
  }

  async function supprimerDependant(dependantId) {
    alertCompatible('Supprimer ce proche ?', 'Cette action est définitive.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive', onPress: async () => {
          try {
            await deleteDoc(doc(db, 'familles', familleId, 'dependants', dependantId));
            setModalDetail(null);
            chargerFamille();
          } catch (error) {
            alertCompatible('Erreur', "Impossible de supprimer: " + error.message);
          }
        },
      },
    ]);
  }

  async function supprimerMembre(membreId) {
    alertCompatible('Retirer ce membre ?', "Il ne pourra plus acceder a cette famille.", [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Retirer', style: 'destructive', onPress: async () => {
          try {
            await deleteDoc(doc(db, 'familles', familleId, 'membres', membreId));
            setModalMembre(null);
            chargerFamille();
          } catch (error) {
            alertCompatible('Erreur', "Impossible de retirer: " + error.message);
          }
        },
      },
    ]);
  }


  async function genererCodeLiaisonDependant(dependantId) {
    const code = genererCode();
    try {
      await updateDoc(doc(db, 'familles', familleId, 'dependants', dependantId), { codeLiaison: code });
      Share.share({
        message: `Utilise ce code pour lier ton compte a ton profil sante sur Pharmacie+ Global : ${code}`,
      });
      chargerFamille();
    } catch (error) {
      alertCompatible('Erreur', "Impossible de generer le code: " + error.message);
    }

  }
  async function lierCompteDependant() {
    if (!codeLiaisonSaisi.trim()) return;
    try {
      const q = query(collectionGroup(db, 'dependants'), where('codeLiaison', '==', codeLiaisonSaisi.trim().toUpperCase()));
      const snap = await getDocs(q);
      if (snap.empty) {
        alertCompatible('Code invalide', "Aucun profil ne correspond a ce code.");
        return;
      }
      const dependantDoc = snap.docs[0];
      const familleTrouveeId = dependantDoc.ref.parent.parent.id;
      await setDoc(doc(db, 'familles', familleTrouveeId, 'membres', user.uid), {
        nom: user.email,
        role: 'membre',
        rejointLe: new Date().toISOString(),
      });
      await updateDoc(doc(db, 'utilisateurs', user.uid), { familleId: familleTrouveeId });
      await updateDoc(dependantDoc.ref, { compteLie: user.uid });
      setCodeLiaisonSaisi('');
      alertCompatible('Succes', 'Ton compte est maintenant lie.');
      chargerFamille();
    } catch (error) {
      alertCompatible('Erreur', "Impossible de lier: " + error.message);
    }
  }
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e74c3c" />
      </View>
    );
  }

  if (!familleId) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>👨‍👩‍👧‍👦</Text>
          <Text style={styles.headerTitle}>Ma famille</Text>
          <Text style={styles.headerSubtitle}>
            Suis la santé de tes proches, même ceux qui n'ont pas de téléphone.
          </Text>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.primaryBtn} onPress={creerFamille}>
            <Text style={styles.primaryBtnText}>+ Créer ma famille</Text>
          </TouchableOpacity>

          <Text style={styles.ou}>ou</Text>

          <Text style={styles.label}>Rejoindre avec un code</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: AB3X9K"
            value={codeSaisi}
            onChangeText={setCodeSaisi}
            autoCapitalize="characters"
          />
          <TouchableOpacity style={styles.secondaryBtn} onPress={rejoindreFamille} disabled={jointure}>
            {jointure ? <ActivityIndicator color="#fff" /> : <Text style={styles.secondaryBtnText}>Rejoindre</Text>}
          </TouchableOpacity>

          <Text style={styles.ou}>ou</Text>

          <Text style={styles.label}>Lier mon compte a un proche</Text>
          <TextInput
            style={styles.input}
            placeholder="Code recu de ton parent"
            value={codeLiaisonSaisi}
            onChangeText={setCodeLiaisonSaisi}
            autoCapitalize="characters"
          />
          <TouchableOpacity style={styles.secondaryBtn} onPress={lierCompteDependant}>
            <Text style={styles.secondaryBtnText}>Lier mon compte</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>👨‍👩‍👧‍👦</Text>
          <Text style={styles.headerTitle}>Ma famille</Text>
        </View>

        <TouchableOpacity style={styles.chatBtn} onPress={() => setChatVisible(true)}>
          <Text style={styles.chatBtnText}>💬 Discussion familiale</Text>
        </TouchableOpacity>

        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Code d'invitation</Text>
          <Text style={styles.codeValue}>{codeInvitation}</Text>
          <TouchableOpacity style={styles.shareBtn} onPress={partagerCode}>
            <Text style={styles.shareBtnText}>📤 Partager le code</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Membres ({membres.length})</Text>
          {membres.map((m) => (
            <TouchableOpacity key={m.id} style={styles.membreRow} onPress={() => setModalMembre(m)}>
              <Text style={styles.membreNom}>{m.nom}</Text>
              <Text style={styles.membreRole}>{m.role === 'proprietaire' ? 'Propriétaire' : 'Membre'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Proches suivis ({dependants.length})</Text>
            <TouchableOpacity onPress={() => setModalAjout(true)}>
              <Text style={styles.addLink}>+ Ajouter</Text>
            </TouchableOpacity>
          </View>

          {dependants.length === 0 ? (
            <Text style={styles.videTexte}>Aucun proche ajouté pour l'instant.</Text>
          ) : (
            dependants.map((d) => (
              <TouchableOpacity key={d.id} style={styles.dependantCard} onPress={() => setModalDetail(d)}>
                <Text style={styles.dependantNom}>{d.nom}</Text>
                <Text style={styles.dependantDetails}>
                  {d.lienParente}{d.age ? ` • ${d.age} ans` : ''}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={chatVisible} animationType="slide" onRequestClose={() => setChatVisible(false)}>
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={() => setChatVisible(false)} style={{ marginRight: 12 }}>
              <Text style={{ fontSize: 20 }}>←</Text>
            </TouchableOpacity>
            <Text style={styles.chatHeaderTitre}>Discussion familiale</Text>
          </View>

          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={m => m.id}
            contentContainerStyle={{ padding: 15 }}
            renderItem={({ item: msg }) => {
              const estMoi = msg.senderId === user.uid;
              return (
                <View style={[styles.bulleContainer, estMoi ? styles.bulleContainerMoi : styles.bulleContainerAutre]}>
                  {!estMoi && <Text style={styles.bulleAuteur}>{msg.senderNom}</Text>}
                  <View style={[styles.bulle, estMoi ? styles.bulleMoi : styles.bulleAutre]}>
                    <Text style={estMoi ? styles.bulleTexteMoi : styles.bulleTexteAutre}>{msg.texte}</Text>
                  </View>
                </View>
              );
            }}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />

          <View style={[styles.chatInputRow, { marginBottom: hauteurClavier }]}>
            <TextInput
              style={styles.chatInput}
              value={texteMessage}
              onChangeText={setTexteMessage}
              placeholder="Écris un message a la famille..."
              multiline
            />
            <TouchableOpacity style={styles.sendBtn} onPress={envoyerMessageFamille} disabled={envoiMessage}>
              {envoiMessage ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.sendBtnText}>➤</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={modalAjout} animationType="slide" onRequestClose={() => setModalAjout(false)}>
        <ScrollView style={styles.modalContainer} contentContainerStyle={{ padding: 20 }}>
          <TouchableOpacity onPress={() => setModalAjout(false)} style={{ marginBottom: 10 }}>
            <Text style={{ fontSize: 24 }}>⬅️</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Ajouter un proche</Text>

          <Text style={styles.label}>Nom complet *</Text>
          <TextInput style={styles.input} value={nomDependant} onChangeText={setNomDependant} placeholder="Ex: Maman Ngo Bertoua" />

          <Text style={styles.label}>Lien de parenté</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {LIENS_PARENTE.map((lien) => (
              <TouchableOpacity
                key={lien}
                style={[styles.chip, lienParente === lien && styles.chipActive]}
                onPress={() => setLienParente(lien)}
              >
                <Text style={[styles.chipText, lienParente === lien && styles.chipTextActive]}>{lien}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Âge</Text>
          <TextInput style={styles.input} value={ageDependant} onChangeText={setAgeDependant} placeholder="Ex: 68" keyboardType="numeric" />

          <Text style={styles.label}>Groupe sanguin</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {GROUPES_SANGUINS.map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.chip, groupeSanguin === g && styles.chipActive]}
                onPress={() => setGroupeSanguin(g)}
              >
                <Text style={[styles.chipText, groupeSanguin === g && styles.chipTextActive]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Allergies</Text>
          <TextInput style={styles.input} value={allergies} onChangeText={setAllergies} placeholder="Ex: Penicilline" multiline />

          <Text style={styles.label}>Maladies chroniques</Text>
          <TextInput style={styles.input} value={maladiesChroniques} onChangeText={setMaladiesChroniques} placeholder="Ex: Diabete, hypertension" multiline />

          <Text style={styles.label}>Contact d'urgence (nom)</Text>
          <TextInput style={styles.input} value={contactNom} onChangeText={setContactNom} placeholder="Ex: Jean Ateba" />

          <Text style={styles.label}>Contact d'urgence (téléphone)</Text>
          <TextInput style={styles.input} value={contactTel} onChangeText={setContactTel} placeholder="Ex: +237699887766" keyboardType="phone-pad" />

          <TouchableOpacity style={styles.primaryBtn} onPress={ajouterDependant} disabled={enregistrement}>
            {enregistrement ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Enregistrer</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={() => { setModalAjout(false); reinitialiserFormulaire(); }}>
            <Text style={styles.cancelBtnText}>Annuler</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>

      <Modal visible={!!modalDetail} animationType="slide" onRequestClose={() => setModalDetail(null)}>
        {modalDetail && (
          <ScrollView style={styles.modalContainer} contentContainerStyle={{ padding: 20 }}>
            <Text style={styles.modalTitle}>{modalDetail.nom}</Text>
            <Text style={styles.sousTitre}>{modalDetail.lienParente}{modalDetail.age ? ` • ${modalDetail.age} ans` : ''}</Text>

            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Groupe sanguin</Text>
              <Text style={styles.infoValue}>{modalDetail.groupeSanguin || 'Non renseigné'}</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Allergies</Text>
              <Text style={styles.infoValue}>{modalDetail.allergies || 'Aucune renseignée'}</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Maladies chroniques</Text>
              <Text style={styles.infoValue}>{modalDetail.maladiesChroniques || 'Aucune renseignée'}</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Contact d'urgence</Text>
              <Text style={styles.infoValue}>
                {modalDetail.contactUrgenceNom ? `${modalDetail.contactUrgenceNom} - ${modalDetail.contactUrgenceTel}` : 'Non renseigné'}
              </Text>
            </View>

            <View style={{ alignItems: 'center', marginVertical: 15 }}>
              <QRCode
                value={JSON.stringify({
                  nom: modalDetail.nom,
                  groupeSanguin: modalDetail.groupeSanguin || '',
                  allergies: modalDetail.allergies || '',
                  maladiesChroniques: modalDetail.maladiesChroniques || '',
                  contactUrgenceNom: modalDetail.contactUrgenceNom || '',
                  contactUrgenceTel: modalDetail.contactUrgenceTel || '',
                })}
                size={180}
              />
              <Text style={{ marginTop: 8, color: '#666', fontSize: 12 }}>Carte sante numerique</Text>
            </View>

            <TouchableOpacity style={styles.documentsBtn} onPress={() => setDocumentsProcheVisible(true)}>
              <Text style={styles.documentsBtnText}>📄 Documents médicaux</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.documentsBtn} onPress={() => genererCodeLiaisonDependant(modalDetail.id)}>
              <Text style={styles.documentsBtnText}>🔗 Generer un code de liaison</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.deleteBtn} onPress={() => supprimerDependant(modalDetail.id)}>
              <Text style={styles.deleteBtnText}>🗑️ Retirer ce proche</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalDetail(null)}>
              <Text style={styles.cancelBtnText}>Fermer</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </Modal>

      {modalDetail && (
        <DocumentsMedicaux
          visible={documentsProcheVisible}
          onClose={() => setDocumentsProcheVisible(false)}
          collectionRef={collection(db, 'familles', familleId, 'dependants', modalDetail.id, 'documents')}
          titre={`Documents de ${modalDetail.nom}`}
        />
      )}

      <Modal visible={!!modalMembre} animationType="slide" onRequestClose={() => setModalMembre(null)}>
        {modalMembre && (
          <ScrollView style={styles.modalContainer} contentContainerStyle={{ padding: 20 }}>
            <Text style={styles.modalTitle}>{modalMembre.nom}</Text>
            <Text style={styles.sousTitre}>{modalMembre.role === 'proprietaire' ? 'Proprietaire' : 'Membre'}</Text>

            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>A rejoint le</Text>
              <Text style={styles.infoValue}>
                {modalMembre.rejointLe ? new Date(modalMembre.rejointLe).toLocaleDateString('fr-FR') : 'Non renseigne'}
              </Text>
            </View>

            {dependants.find(d => d.compteLie === modalMembre.id) && (
              <>
                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>Groupe sanguin</Text>
                  <Text style={styles.infoValue}>
                    {dependants.find(d => d.compteLie === modalMembre.id).groupeSanguin || 'Non renseigne'}
                  </Text>
                </View>

                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>Allergies</Text>
                  <Text style={styles.infoValue}>
                    {dependants.find(d => d.compteLie === modalMembre.id).allergies || 'Aucun'}
                  </Text>
                </View>

                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>Maladies chroniques</Text>
                  <Text style={styles.infoValue}>
                    {dependants.find(d => d.compteLie === modalMembre.id).maladiesChroniques || 'Aucun'}
                  </Text>
                </View>
              </>
            )}

            {membres.find(x => x.id === user.uid) && membres.find(x => x.id === user.uid).role === 'proprietaire' && modalMembre.id !== user.uid && (
              <TouchableOpacity style={styles.deleteBtn} onPress={() => supprimerMembre(modalMembre.id)}>
                <Text style={styles.deleteBtnText}>Retirer ce membre</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalMembre(null)}>
              <Text style={styles.cancelBtnText}>Fermer</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7f8' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { alignItems: 'center', padding: 25, backgroundColor: '#fff' },
  headerEmoji: { fontSize: 40, marginBottom: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1a2b34' },
  headerSubtitle: { fontSize: 13, color: '#6b7b82', textAlign: 'center', marginTop: 6, paddingHorizontal: 20 },
  chatBtn: {
    marginHorizontal: 15, marginTop: 15, backgroundColor: '#3498db',
    paddingVertical: 14, borderRadius: 10, alignItems: 'center',
  },
  chatBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  section: { padding: 15 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a2b34', marginBottom: 10 },
  addLink: { color: '#16a085', fontWeight: '700', fontSize: 14 },
  ou: { textAlign: 'center', color: '#6b7b82', marginVertical: 15 },
  label: { fontSize: 14, fontWeight: '700', color: '#2c3e50', marginTop: 15, marginBottom: 8 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
  },
  primaryBtn: {
    backgroundColor: '#e74c3c', borderRadius: 10, paddingVertical: 15,
    alignItems: 'center', marginTop: 10,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    backgroundColor: '#16a085', borderRadius: 10, paddingVertical: 15,
    alignItems: 'center', marginTop: 10,
  },
  secondaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  codeCard: {
    backgroundColor: '#fff', margin: 15, padding: 20, borderRadius: 12, alignItems: 'center',
  },
  codeLabel: { fontSize: 13, color: '#6b7b82', marginBottom: 6 },
  codeValue: { fontSize: 28, fontWeight: '800', color: '#e74c3c', letterSpacing: 4 },
  shareBtn: { marginTop: 12, backgroundColor: '#eaf2fd', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8 },
  shareBtnText: { color: '#3498db', fontWeight: '700', fontSize: 13 },
  membreRow: {
    flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff',
    padding: 12, borderRadius: 8, marginBottom: 8,
  },
  membreNom: { fontSize: 14, color: '#2c3e50', fontWeight: '600' },
  membreRole: { fontSize: 12, color: '#6b7b82' },
  videTexte: { color: '#6b7b82', fontSize: 13, fontStyle: 'italic' },
  dependantCard: { backgroundColor: '#fff', padding: 14, borderRadius: 10, marginBottom: 8 },
  dependantNom: { fontSize: 15, fontWeight: '700', color: '#1a2b34' },
  dependantDetails: { fontSize: 12, color: '#6b7b82', marginTop: 2 },
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50', marginBottom: 6 },
  sousTitre: { fontSize: 13, color: '#6b7b82', marginBottom: 20 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f0f0',
    marginRight: 8, marginBottom: 8,
  },
  chipActive: { backgroundColor: '#e74c3c' },
  chipText: { color: '#7f8c8d', fontSize: 13, fontWeight: 'bold' },
  chipTextActive: { color: '#fff' },
  infoCard: { backgroundColor: '#f4f7f8', borderRadius: 12, padding: 16, marginBottom: 10 },
  infoLabel: { fontSize: 12, fontWeight: '600', color: '#6b7b82', marginBottom: 4 },
  infoValue: { fontSize: 15, color: '#1a2b34', fontWeight: '600' },
  deleteBtn: {
    marginTop: 20, alignItems: 'center', paddingVertical: 14,
    backgroundColor: '#fdecea', borderRadius: 10,
  },
  deleteBtnText: { color: '#e74c3c', fontWeight: 'bold', fontSize: 14 },
  cancelBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 10 },
  documentsBtn: {
    marginTop: 20, alignItems: 'center', paddingVertical: 14,
    backgroundColor: '#3498db', borderRadius: 10,
  },
  documentsBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  cancelBtnText: { color: '#7f8c8d', fontSize: 14 },
  chatHeader: {
    flexDirection: 'row', alignItems: 'center', padding: 15,
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  chatHeaderTitre: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50' },
  bulleContainer: { marginBottom: 10, maxWidth: '80%' },
  bulleContainerMoi: { alignSelf: 'flex-end' },
  bulleContainerAutre: { alignSelf: 'flex-start' },
  bulleAuteur: { fontSize: 11, color: '#7f8c8d', marginBottom: 2, marginLeft: 4 },
  bulle: { padding: 10, borderRadius: 12 },
  bulleMoi: { backgroundColor: '#3498db', borderBottomRightRadius: 2 },
  bulleAutre: { backgroundColor: '#f0f0f0', borderBottomLeftRadius: 2 },
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
