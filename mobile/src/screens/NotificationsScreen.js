import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api';
import { colors, shadows, radius } from '../theme';
import UniHeader from '../components/UniHeader';

function formatTempsRelatif(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMin = Math.round((now - date) / (1000 * 60));

  if (diffMin < 1) return "\u00c0 l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `Il y a ${diffH} h`;
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function iconConfig(type) {
  switch (type) {
    case 'trajet_demarre':
      return { letter: 'D', bg: '#DCFCE7', color: '#16A34A' };
    case 'trajet_termine':
      return { letter: 'T', bg: '#FEF3C7', color: '#D97706' };
    case 'reservation_recue':
      return { letter: 'R', bg: '#E0F2FE', color: '#0284C7' };
    case 'reservation_acceptee':
      return { letter: 'A', bg: '#DCFCE7', color: '#16A34A' };
    case 'reservation_refusee':
      return { letter: 'X', bg: '#FEE2E2', color: '#DC2626' };
    case 'reservation_annulee':
      return { letter: '!', bg: '#FFEDD5', color: '#EA580C' };
    case 'trajet_annule':
      return { letter: 'X', bg: '#FEE2E2', color: '#DC2626' };
    default:
      return { letter: 'N', bg: colors.primaryLight, color: colors.primary };
  }
}

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [nbNonLues, setNbNonLues] = useState(0);
  const [chargement, setChargement] = useState(true);
  const [rafraichir, setRafraichir] = useState(false);
  const [filtre, setFiltre] = useState('toutes');

  const charger = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications || []);
      setNbNonLues(data.nbNonLues || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setChargement(false);
      setRafraichir(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger])
  );

  const marquerToutLu = useCallback(async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((avant) => avant.map((n) => ({ ...n, lu: true })));
      setNbNonLues(0);
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de marquer comme lu');
    }
  }, []);

  const ouvrirNotification = useCallback(async (item) => {
    if (!item.lu) {
      api.patch(`/notifications/${item._id}/read`).catch(() => {});
      setNotifications((avant) =>
        avant.map((n) => (n._id === item._id ? { ...n, lu: true } : n))
      );
      setNbNonLues((avant) => Math.max(0, avant - 1));
    }

    const { type, donnees } = item;
    if (type === 'trajet_demarre' && donnees?.trajetId) {
      navigation.navigate('ActiveRide', { id: donnees.trajetId });
    } else if (type === 'reservation_recue') {
      navigation.navigate('BookingRequests');
    } else if (type === 'reservation_acceptee' || type === 'reservation_refusee') {
      navigation.navigate('MyBookings');
    } else if (donnees?.trajetId) {
      navigation.navigate('RideDetail', { id: donnees.trajetId });
    }
  }, [navigation]);

  const notificationsAffichees =
    filtre === 'non_lues'
      ? notifications.filter((n) => !n.lu)
      : notifications;

  const renderItem = useCallback(({ item }) => {
    const cfg = iconConfig(item.type);

    return (
      <TouchableOpacity
        style={[styles.notifCard, !item.lu && styles.notifCardNonLue]}
        onPress={() => ouvrirNotification(item)}
        activeOpacity={0.8}
      >
        <View style={[styles.iconBox, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.iconSymbol, { color: cfg.color }]}>{cfg.letter}</Text>
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={styles.notifHeader}>
            <Text style={[styles.notifTitre, !item.lu && styles.notifTitreGras]} numberOfLines={1}>
              {item.titre}
            </Text>
            <Text style={styles.notifDate}>{formatTempsRelatif(item.createdAt)}</Text>
          </View>

          <Text style={styles.notifMessage} numberOfLines={2}>
            {item.message}
          </Text>
        </View>

        {!item.lu && <View style={styles.greenDot} />}
      </TouchableOpacity>
    );
  }, [ouvrirNotification]);

  if (chargement) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <UniHeader
        title="Notifications"
        subtitle={nbNonLues > 0 ? `${nbNonLues} nouvelle(s)` : 'Toutes vos alertes'}
        navigation={navigation}
        showBack={true}
        rightComponent={
          nbNonLues > 0 ? (
            <TouchableOpacity onPress={marquerToutLu} style={styles.toutLuBtn}>
              <Text style={styles.toutLuText}>Tout lire</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      {/* Filtres Pills */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabPill, filtre === 'toutes' && styles.tabPillActif]}
          onPress={() => setFiltre('toutes')}
        >
          <Text style={[styles.tabTexte, filtre === 'toutes' && styles.tabTexteActif]}>
            Toutes ({notifications.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabPill, filtre === 'non_lues' && styles.tabPillActif]}
          onPress={() => setFiltre('non_lues')}
        >
          <Text style={[styles.tabTexte, filtre === 'non_lues' && styles.tabTexteActif]}>
            Non lues ({nbNonLues})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notificationsAffichees}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={rafraichir}
            onRefresh={() => {
              setRafraichir(true);
              charger();
            }}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
              <Text style={styles.emptyIconLetter}>N</Text>
            </View>
            <Text style={styles.emptyTitle}>
              {filtre === 'non_lues' ? 'Aucune notification non lue' : 'Aucune notification'}
            </Text>
            <Text style={styles.emptySub}>
              Vous serez notifi\u00e9 d\u00e8s qu'un passager r\u00e9serve, qu'un conducteur accepte votre trajet ou
              lorsqu'un covoiturage d\u00e9marre.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  toutLuBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
  },
  toutLuText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: 8,
  },
  tabPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabPillActif: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabTexte: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  tabTexteActif: {
    color: colors.white,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  notifCardNonLue: {
    borderColor: '#BFDBFE',
    backgroundColor: '#F8FAFC',
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconSymbol: {
    fontSize: 16,
    fontWeight: '900',
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  notifTitre: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
    marginRight: 6,
  },
  notifTitreGras: {
    fontWeight: '800',
    color: colors.primaryDark,
  },
  notifDate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  notifMessage: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 70,
    paddingHorizontal: 24,
  },
  emptyIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyIconLetter: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.primary,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
