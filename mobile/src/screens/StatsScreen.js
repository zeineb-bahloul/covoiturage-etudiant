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
import { colors, shadows } from '../theme';

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
        titre="Statistiques & Badges"
        sousTitre="Votre impact éco-responsable ISET"
        onBack={() => navigation.goBack()}
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
        {/* Résumé des indicateurs clés (Image 1 "Tableau de bord" & "Mon Espace") */}
        <View style={styles.grilleChiffres}>
          {/* Argent économisé */}
          <View style={[styles.carteChiffre, { borderTopColor: '#10B981' }]}>
            <Text style={styles.carteIcone}>💰</Text>
            <Text style={styles.carteValeur}>{stats?.argentEconomise || 0} DT</Text>
            <Text style={styles.carteLibelle}>Argent économisé</Text>
            <Text style={styles.carteDetail}>
              Conducteur: {stats?.gainsConducteur || 0} DT · Passager: {stats?.argentEconomisePassager || 0} DT
            </Text>
          </View>

          {/* CO2 évité */}
          <View style={[styles.carteChiffre, { borderTopColor: colors.primary }]}>
            <Text style={styles.carteIcone}>🌱</Text>
            <Text style={styles.carteValeur}>{stats?.co2Economise || 0} kg</Text>
            <Text style={styles.carteLibelle}>CO₂ évité</Text>
            <Text style={styles.carteDetail}>
              ≈ {Math.max(1, Math.round((stats?.co2Economise || 0) / 2))} arbres préservés
            </Text>
          </View>

          {/* Trajets effectués */}
          <View style={[styles.carteChiffre, { borderTopColor: '#3B82F6' }]}>
            <Text style={styles.carteIcone}>🚗</Text>
            <Text style={styles.carteValeur}>{stats?.trajetsEffectues || 0}</Text>
            <Text style={styles.carteLibelle}>Trajets partagés</Text>
            <Text style={styles.carteDetail}>
              {stats?.trajetsConducteur || 0} cond. · {stats?.trajetsPassager || 0} pass.
            </Text>
          </View>

          {/* Note moyenne */}
          <View style={[styles.carteChiffre, { borderTopColor: '#F59E0B' }]}>
            <Text style={styles.carteIcone}>⭐</Text>
            <Text style={styles.carteValeur}>{(stats?.noteMoyenne || 5.0).toFixed(1)} / 5</Text>
            <Text style={styles.carteLibelle}>Confiance & Avis</Text>
            <Text style={styles.carteDetail}>{stats?.nombreAvis || 0} avis reçus</Text>
          </View>
        </View>

        {/* Section Badges (US17) */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitre}>BADGES & VALORISATION</Text>
            <Text style={styles.sectionSousTitre}>
              {nbBadgesDebloques} sur {badges.length} badges débloqués
            </Text>
          </View>
          <View style={styles.badgeCompteurPill}>
            <Text style={styles.badgeCompteurTexte}>
              🏆 {nbBadgesDebloques}/{badges.length}
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
                <Text style={styles.badgeEmoji}>{b.emoji}</Text>
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
                      {b.debloque ? 'DÉBLOQUÉ ✓' : 'À OBTENIR'}
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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  grilleChiffres: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  carteChiffre: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    borderTopWidth: 4,
    ...shadows.card,
  },
  carteIcone: {
    fontSize: 24,
    marginBottom: 8,
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
    marginBottom: 14,
  },
  sectionTitre: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textLight,
    letterSpacing: 0.8,
  },
  sectionSousTitre: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badgeCompteurPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  badgeCompteurTexte: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  badgesListe: {
    gap: 12,
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    ...shadows.card,
  },
  badgeItemDebloque: {
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },
  badgeItemBloque: {
    borderColor: '#E2E8F0',
    opacity: 0.75,
  },
  badgeIconeConteneur: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  badgeIconeDebloque: {
    backgroundColor: '#DCFCE7',
  },
  badgeIconeBloque: {
    backgroundColor: '#F1F5F9',
  },
  badgeEmoji: {
    fontSize: 24,
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
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  badgeNomBloque: {
    color: colors.textSecondary,
  },
  statutPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statutPillDebloque: {
    backgroundColor: '#DCFCE7',
  },
  statutPillBloque: {
    backgroundColor: '#E2E8F0',
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

