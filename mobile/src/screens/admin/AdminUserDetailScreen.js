import React, { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import api from '../../api';
import { Avatar, Badge, Button, Card, Chip, ErrorState, Header, Input, Loader, Notice, Row, Screen, SectionTitle, Stars } from '../../components/ui';
import { useDonnees } from '../../hooks';
import { colors, font, radius, spacing } from '../../theme';
import { erreurApi, tempsRelatif } from '../../utils';

const MOTIFS = {
  retard_excessif: 'Retard important',
  conduite_dangereuse: 'Conduite dangereuse',
  comportement_inapproprie: 'Comportement inapproprié',
  annulation_imprevue: 'Annulation imprévue',
  autre: 'Autre',
};
const RAISONS = ['Comportement inapproprié répété', 'Conduite dangereuse', 'Faux profil', 'Annulations abusives'];

/** Fiche d'un utilisateur : bloquer, débloquer, supprimer (US18). */
export default function AdminUserDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [modal, setModal] = useState(false);
  const [raison, setRaison] = useState('');
  const [action, setAction] = useState(false);
  const { data, chargement, erreur, recharger, reessayer } = useDonnees(() => api.get(`/admin/users/${id}`).then((r) => r.data), [id]);

  const executer = async (fn, retour = false) => {
    setAction(true);
    try {
      const { data: r } = await fn();
      Alert.alert('Action effectuée', r.message);
      if (retour) navigation.goBack();
      else recharger();
    } catch (err) {
      Alert.alert('Action impossible', erreurApi(err));
    } finally {
      setAction(false);
      setModal(false);
    }
  };

  const supprimer = () =>
    Alert.alert('Supprimer définitivement ce compte ?', 'Ses trajets à venir et réservations seront annulés. Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => executer(() => api.delete(`/admin/users/${id}`), true) },
    ]);

  if (chargement) return <Loader />;
  if (erreur) return <ErrorState text={erreur} onRetry={reessayer} />;

  const { user, signalements, avis, trajets, reservations } = data;
  const estAdmin = user.role === 'admin';

  return (
    <Screen
      header={<Header title={user.nom} subtitle={user.email} onBack={() => navigation.goBack()} />}
      footer={
        estAdmin ? null : (
          <Row>
            {user.bloque ? (
              <Button title="Débloquer" icon="lock-open-outline" variant="success" style={{ flex: 1 }} loading={action} onPress={() => executer(() => api.patch(`/admin/users/${id}/unblock`))} />
            ) : (
              <Button title="Bloquer" icon="lock-closed-outline" variant="primary" style={{ flex: 1 }} onPress={() => setModal(true)} />
            )}
            <Button title="Supprimer" icon="trash-outline" variant="danger" style={{ flex: 1 }} onPress={supprimer} disabled={action} />
          </Row>
        )
      }
    >
      {user.bloque ? (
        <Notice tone="danger" icon="lock-closed-outline" title={`Bloqué ${tempsRelatif(user.bloqueLe).toLowerCase()}`} text={user.bloqueRaison} />
      ) : null}

      <Card style={{ alignItems: 'center' }}>
        <Avatar uri={user.photo} nom={user.nom} size={72} />
        <Text style={[font.h2, { marginTop: spacing.sm }]}>{user.nom}</Text>
        <Text style={font.small}>{user.filiere || '—'}</Text>
        <Row gap={6} style={{ marginTop: spacing.sm }}>
          {estAdmin ? <Badge label="Administrateur" tone="primary" /> : null}
          {user.vehicule ? <Badge label={`${user.vehicule.marque} · ${user.vehicule.matricule}`} icon="car-outline" /> : <Badge label="Passager" />}
        </Row>
        <View style={{ marginTop: spacing.sm }}>
          <Stars value={user.noteMoyenne} count={user.nombreAvis} />
        </View>
        <Row style={styles.chiffres} gap={0}>
          <Chiffre valeur={trajets} label="Trajets publiés" />
          <Chiffre valeur={reservations} label="Réservations" />
          <Chiffre valeur={signalements.length} label="Signalements" rouge={signalements.length > 0} />
        </Row>
        <Text style={[font.caption, { marginTop: spacing.md }]}>
          Inscrit {tempsRelatif(user.createdAt).toLowerCase()} · actif {tempsRelatif(user.derniereActivite).toLowerCase()}
          {user.telephone ? ` · ${user.telephone}` : ''}
        </Text>
      </Card>

      <SectionTitle>Signalements reçus</SectionTitle>
      {signalements.length === 0 ? (
        <Text style={[font.small, { marginBottom: spacing.lg }]}>Aucun signalement.</Text>
      ) : (
        signalements.map((s) => (
          <Card key={s._id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={font.label}>{MOTIFS[s.motif]}</Text>
              <Badge label={s.statut === 'en_attente' ? 'En attente' : s.statut === 'traite' ? 'Traité' : 'Rejeté'} tone={s.statut === 'en_attente' ? 'warning' : 'neutral'} />
            </Row>
            <Text style={[font.small, { color: colors.text, marginTop: 6 }]}>« {s.commentaire} »</Text>
            <Text style={[font.caption, { marginTop: 6 }]}>
              Par {s.auteur?.nom || 'utilisateur supprimé'} · {tempsRelatif(s.createdAt)}
            </Text>
          </Card>
        ))
      )}

      <SectionTitle>Derniers avis</SectionTitle>
      {avis.length === 0 ? (
        <Text style={font.small}>Aucun avis.</Text>
      ) : (
        avis.map((a) => (
          <Card key={a._id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={font.label}>{a.auteur?.nom || 'Utilisateur supprimé'}</Text>
              <Stars value={a.note} size={12} />
            </Row>
            {a.commentaire ? <Text style={[font.small, { marginTop: 4 }]}>{a.commentaire}</Text> : null}
          </Card>
        ))
      )}

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setModal(false)}>
          <Pressable style={styles.feuille} onPress={() => {}}>
            <Text style={font.h2}>Bloquer {user.nom}</Text>
            <Text style={[font.small, { marginBottom: spacing.lg }]}>La personne est déconnectée immédiatement et ses trajets à venir sont annulés.</Text>
            <Row gap={8} style={{ flexWrap: 'wrap', marginBottom: spacing.md }}>
              {RAISONS.map((r) => (
                <Chip key={r} label={r} selected={raison === r} onPress={() => setRaison(r)} />
              ))}
            </Row>
            <Input label="Raison (visible par l'utilisateur)" value={raison} onChangeText={setRaison} placeholder="Ex : Signalements répétés" multiline />
            <Button title="Confirmer le blocage" icon="lock-closed" loading={action} onPress={() => executer(() => api.patch(`/admin/users/${id}/block`, { raison }))} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function Chiffre({ valeur, label, rouge }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={[font.h2, { fontSize: 20 }, rouge && { color: colors.danger }]}>{valeur}</Text>
      <Text style={[font.caption, { fontSize: 11 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chiffres: { marginTop: spacing.lg, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.borderSoft, alignSelf: 'stretch' },
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  feuille: { backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, paddingBottom: spacing.xxl },
});
