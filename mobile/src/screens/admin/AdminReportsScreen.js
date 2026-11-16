import React, { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import api from '../../api';
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, Header, Input, Ionicons, Loader, Row, Screen, Segmented, Toggle } from '../../components/ui';
import { useDonnees } from '../../hooks';
import { colors, font, radius, spacing } from '../../theme';
import { court, erreurApi, tempsRelatif } from '../../utils';

const MOTIFS = {
  retard_excessif: { label: 'Retard important', icone: 'time-outline' },
  conduite_dangereuse: { label: 'Conduite dangereuse', icone: 'warning-outline' },
  comportement_inapproprie: { label: 'Comportement inapproprié', icone: 'hand-left-outline' },
  annulation_imprevue: { label: 'Annulation imprévue', icone: 'close-circle-outline' },
  autre: { label: 'Autre problème', icone: 'ellipsis-horizontal-circle-outline' },
};

/** Traitement des signalements (US19). */
export default function AdminReportsScreen({ navigation }) {
  const [statut, setStatut] = useState('en_attente');
  const [choisi, setChoisi] = useState(null);
  const [decision, setDecision] = useState('');
  const [bloquer, setBloquer] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const { data, chargement, erreur, rafraichir, rafraichissement, recharger, reessayer } = useDonnees(
    () => api.get('/admin/reports', { params: { statut } }).then((r) => r.data),
    [statut]
  );

  const ouvrir = (r) => {
    setChoisi(r);
    setDecision('');
    setBloquer(r.nbSignalementsCible >= 3);
  };

  const decider = async (nouveauStatut) => {
    setEnvoi(true);
    try {
      const { data: res } = await api.patch(`/admin/reports/${choisi._id}`, { statut: nouveauStatut, decision, bloquer: nouveauStatut === 'traite' && bloquer });
      setChoisi(null);
      recharger();
      Alert.alert('Signalement mis à jour', `${res.message} L'auteur du signalement a été informé.`);
    } catch (err) {
      Alert.alert('Erreur', erreurApi(err));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Screen
      header={
        <Header title="Signalements" subtitle="Protéger la communauté">
          <Segmented
            style={{ marginTop: spacing.sm }}
            value={statut}
            onChange={setStatut}
            options={[
              { value: 'en_attente', label: 'À traiter' },
              { value: 'traite', label: 'Traités' },
              { value: 'rejete', label: 'Rejetés' },
            ]}
          />
        </Header>
      }
      onRefresh={rafraichir}
      refreshing={rafraichissement}
      bottomInset={false}
    >
      {chargement ? (
        <Loader />
      ) : erreur ? (
        <ErrorState text={erreur} onRetry={reessayer} />
      ) : data.length === 0 ? (
        <EmptyState icon="shield-checkmark-outline" title={statut === 'en_attente' ? 'Aucun signalement à traiter' : 'Rien ici'} text={statut === 'en_attente' ? 'La communauté se porte bien 👏' : null} />
      ) : (
        data.map((r) => {
          const m = MOTIFS[r.motif] || MOTIFS.autre;
          const cible = r.utilisateurSignale;
          return (
            <Card key={r._id} onPress={statut === 'en_attente' ? () => ouvrir(r) : undefined}>
              <Row style={{ justifyContent: 'space-between', marginBottom: spacing.md }}>
                <Badge label={m.label} icon={m.icone} tone="danger" />
                <Text style={font.caption}>{tempsRelatif(r.createdAt)}</Text>
              </Row>
              <Pressable onPress={() => cible && navigation.navigate('AdminUserDetail', { id: cible._id })}>
                <Row>
                  <Avatar uri={cible?.photo} nom={cible?.nom} size={40} />
                  <View style={{ flex: 1 }}>
                    <Row gap={6}>
                      <Text style={font.label}>{cible?.nom || 'Utilisateur supprimé'}</Text>
                      {cible?.bloque ? <Badge label="Bloqué" tone="danger" /> : null}
                    </Row>
                    <Text style={font.caption}>
                      {r.nbSignalementsCible} signalement(s) au total · signalé par {r.auteur?.nom || '—'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.faint} />
                </Row>
              </Pressable>
              <Text style={[font.body, styles.citation]}>« {r.commentaire} »</Text>
              {r.trajet ? (
                <Text style={font.caption}>
                  Trajet : {court(r.trajet.depart?.label)} → {court(r.trajet.destination?.label)}
                  {r.trajet.heureDepart ? ` · ${r.trajet.heureDepart}` : ''}
                </Text>
              ) : null}
              {r.statut !== 'en_attente' ? (
                <Text style={[font.small, { marginTop: spacing.sm, color: colors.text }]}>
                  <Text style={{ fontWeight: '700' }}>Décision : </Text>
                  {r.decisionAdmin}
                </Text>
              ) : (
                <Button title="Traiter ce signalement" size="sm" variant="secondary" style={{ marginTop: spacing.md }} onPress={() => ouvrir(r)} />
              )}
            </Card>
          );
        })
      )}

      <Modal visible={!!choisi} transparent animationType="slide" onRequestClose={() => setChoisi(null)}>
        <Pressable style={styles.overlay} onPress={() => setChoisi(null)}>
          <Pressable style={styles.feuille} onPress={() => {}}>
            <Text style={font.h2}>Décision</Text>
            <Text style={[font.small, { marginBottom: spacing.lg }]}>
              Signalement contre {choisi?.utilisateurSignale?.nom} ({choisi?.nbSignalementsCible} au total)
            </Text>
            <Input label="Message pour l'auteur du signalement" value={decision} onChangeText={setDecision} placeholder="Ex : Avertissement envoyé au conducteur." multiline />
            <Toggle icon="lock-closed-outline" label="Bloquer cette personne" description="Déconnexion immédiate, trajets à venir annulés" value={bloquer} onChange={setBloquer} />
            <Row style={{ marginTop: spacing.lg }}>
              <Button title="Rejeter" variant="outline" style={{ flex: 1 }} onPress={() => decider('rejete')} disabled={envoi} />
              <Button title={bloquer ? 'Traiter + bloquer' : 'Valider'} variant={bloquer ? 'danger' : 'primary'} style={{ flex: 1.5 }} onPress={() => decider('traite')} loading={envoi} />
            </Row>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  citation: { marginVertical: spacing.md, padding: spacing.md, backgroundColor: colors.input, borderRadius: radius.md, fontStyle: 'italic' },
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  feuille: { backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, paddingBottom: spacing.xxl },
});
