import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import api from '../api';
import UniHeader from '../components/UniHeader';
import { colors, shadows, radius } from '../theme';

export default function StatsScreen({ navigation }) {
  const [stats, setStats] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [rafraichir, setRafraichir] = useState(false);

  const chargerStats = useCallback(async () => {
    try {
      const res = await api.get('/stats/me');
      setStats(res.data);
    } catch (err) {
      console.log('Erreur chargement stats :', err);
    } finally {
      setChargement(false);
      setRafraichir(false);
    }
  }, []);

  useEffect(() => {
    chargerStats();
  }, [chargerStats]);

  if (chargement) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const badges = stats?.badges || [];
  const nbBadgesDebloques = badges.filter((b) => b.debloque).length;

  return (
    <View style={styles.container}>
      <UniHeader
        title="Statistiques & Badges"
        subtitle="Votre impact \u00e9co-responsable ISET"
        navigation={navigation}
        showBack={true}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={rafraichir}
            onRefresh={() => {
              setRafraichir(true);
              chargerStats();
            }}
            colors={[colors.primary]}
          />
        }
      >
        {/* R\u00e9sum\u00e9 des indicateurs cl\u00e9s (Image 1 "Tableau de bord global") */}
        <View style={styles.grilleChiffres}>
          {/* Argent \u00e9conomis\u00e9 */}
          <View style={[styles.carteChiffre, { borderTopColor: colors.primary }]}>
            <Text style={styles.carteValeur}>{stats?.argentEconomise || 0} DT</Text>
            <Text style={styles.carteLibelle}>\u00c9conomies r\u00e9alis\u00e9es</Text>
            <Text style={styles.carteDetail}>
              Conducteur: {stats?.gainsConducteur || 0} DT \u00b7 Passager: {stats?.argentEconomisePassager || 0} DT
            </Text>
          </View>

          {/* CO2 \u00e9vit\u00e9 */}
          <View style={[styles.carteChiffre, { borderTopColor: colors.accent }]}>
            <Text style={styles.carteValeur}>{stats?.co2Economise || 0} kg</Text>
            <Text style={styles.carteLibelle}>CO\u2082 \u00e9vit\u00e9</Text>
            <Text style={styles.carteDetail}>
              \u2248 {Math.max(1, Math.round((stats?.co2Economise || 0) / 2))} arbres pr\u00e9serv\u00e9s
            </Text>
          </View>

          {/* Trajets effectu\u00e9s */}
          <View style={[styles.carteChiffre, { borderTopColor: '#3B82F6' }]}>
            <Text style={styles.carteValeur}>{stats?.trajetsEffectues || 0}</Text>
            <Text style={styles.carteLibelle}>Trajets partag\u00e9s</Text>
            <Text style={styles.carteDetail}>
              {stats?.trajetsConducteur || 0} cond. \u00b7 {stats?.trajetsPassager || 0} pass.
            </Text>
          </View>

          {/* Note moyenne */}
          <View style={[styles.carteChiffre, { borderTopColor: '#F59E0B' }]}>
            <Text style={styles.carteValeur}>\u2605 {(stats?.noteMoyenne || 5.0).toFixed(1)}</Text>
            <Text style={styles.carteLibelle}>Confiance & Avis</Text>
            <Text style={styles.carteDetail}>{stats?.nombreAvis || 0} avis re\u00e7us</Text>
          </View>
        </View>

        {/* Section Badges */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitre}>BADGES & VALORISATION</Text>
            <Text style={styles.sectionSousTitre}>
              {nbBadgesDebloques} sur {badges.length} badges d\u00e9bloqu\u00e9s
            </Text>
          </View>
          <View style={styles.badgeCompteurPill}>
            <Text style={styles.badgeCompteurTexte}>
              {nbBadgesDebloques} / {badges.length}
            </Text>
          </View>
        </View>

        {/* Liste des badges */}
        <View style={styles.badgesListe}>
          {badges.map((b, idx) => (
            <View
              key={idx}
              style={[
                styles.badgeItem,
                b.debloque ? styles.badgeItemDebloque : styles.badgeItemBloque,
              ]}
            >
              <View
                style={[
                  styles.badgeIconeConteneur,
                  b.debloque ? styles.badgeIconeDebloque : styles.badgeIconeBloque,
                ]}
              >
                <Text style={styles.badgeLetter}>{b.titre ? b.titre[0] : 'B'}</Text>
              </View>

              <View style={styles.badgeContenu}>
                <View style={styles.badgeLigneTitre}>
                  <Text
                    style={[
                      styles.badgeNom,
                      !b.debloque && styles.badgeNomBloque,
                    ]}
                  >
                    {b.titre}
                  </Text>
                  <View
                    style={[
                      styles.statutPill,
                      b.debloque ? styles.statutPillDebloque : styles.statutPillBloque,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statutTexte,
                        b.debloque ? styles.statutTexteDebloque : styles.statutTexteBloque,
                      ]}
                    >
                      {b.debloque ? 'D\u00c9BLOQU\u00c9' : '\u00c0 OBTENIR'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.badgeDescription}>{b.description}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centre: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  grilleChiffres: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  carteChiffre: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    borderTopWidth: 3,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  carteValeur: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 2,
  },
  carteLibelle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  carteDetail: {
    fontSize: 10,
    color: colors.textLight,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitre: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  sectionSousTitre: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badgeCompteurPill: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  badgeCompteurTexte: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  badgesListe: {
    gap: 10,
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    ...shadows.card,
  },
  badgeItemDebloque: {
    borderColor: '#86EFAC',
    backgroundColor: colors.card,
  },
  badgeItemBloque: {
    borderColor: colors.borderLight,
    opacity: 0.7,
  },
  badgeIconeConteneur: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  badgeIconeDebloque: {
    backgroundColor: colors.primaryLight,
  },
  badgeIconeBloque: {
    backgroundColor: colors.inputBg,
  },
  badgeLetter: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primary,
  },
  badgeContenu: {
    flex: 1,
  },
  badgeLigneTitre: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  badgeNom: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  badgeNomBloque: {
    color: colors.textSecondary,
  },
  statutPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  statutPillDebloque: {
    backgroundColor: colors.successLight,
  },
  statutPillBloque: {
    backgroundColor: colors.inputBg,
  },
  statutTexte: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statutTexteDebloque: {
    color: colors.success,
  },
  statutTexteBloque: {
    color: colors.textLight,
  },
  badgeDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
});
