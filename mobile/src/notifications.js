import { StackActions } from '@react-navigation/native';
import { colors } from './theme';

/** Revenir à l'écran principal sur un onglet (fonctionne aussi avec la ref de navigation). */
export function allerOnglet(navigation, onglet) {
  navigation.dispatch(StackActions.popTo('Main', { onglet }));
}

/** Icône et couleurs selon le type de notification. */
export function iconeNotification(type) {
  const t = {
    reservation_recue: ['person-add', colors.infoSoft, colors.info],
    reservation_acceptee: ['checkmark-circle', colors.successSoft, colors.success],
    reservation_refusee: ['close-circle', colors.dangerSoft, colors.danger],
    reservation_annulee: ['remove-circle', colors.warningSoft, colors.warning],
    trajet_demarre: ['car-sport', colors.successSoft, colors.success],
    trajet_termine: ['flag', colors.accentSoft, colors.accentInk],
    trajet_annule: ['close-circle', colors.dangerSoft, colors.danger],
    trajet_modifie: ['create', colors.warningSoft, colors.warning],
    suggestion: ['sparkles', colors.accentSoft, colors.accentInk],
    nouveau_message: ['chatbubble-ellipses', colors.primarySoft, colors.primary],
    nouvel_avis: ['star', colors.accentSoft, colors.accentInk],
    badge_obtenu: ['trophy', colors.accentSoft, colors.accentInk],
    rappel_trajet: ['alarm', colors.infoSoft, colors.info],
    sos: ['alert-circle', colors.dangerSoft, colors.danger],
    compte_bloque: ['lock-closed', colors.dangerSoft, colors.danger],
    signalement_traite: ['shield-checkmark', colors.successSoft, colors.success],
  }[type] || ['notifications', colors.primarySoft, colors.primary];
  return { name: t[0], bg: t[1], fg: t[2] };
}

/** Écran à ouvrir quand on touche une notification. */
export function ouvrirNotification(navigation, notif) {
  const { type, donnees = {} } = notif;
  const trajetId = donnees.trajetId?._id || donnees.trajetId;
  switch (type) {
    case 'nouveau_message':
      if (donnees.conversationId) return navigation.navigate('Chat', { conversationId: donnees.conversationId });
      return allerOnglet(navigation, 'messages');
    case 'reservation_recue':
      return navigation.navigate('BookingRequests', trajetId ? { trajetId } : {});
    case 'reservation_acceptee':
      if (donnees.conversationId) return navigation.navigate('Chat', { conversationId: donnees.conversationId });
      return navigation.navigate('MyBookings');
    case 'reservation_refusee':
    case 'reservation_annulee':
    case 'trajet_annule':
      return navigation.navigate('MyBookings');
    case 'trajet_demarre':
      return trajetId ? navigation.navigate('ActiveRide', { id: trajetId }) : null;
    case 'trajet_termine':
      return navigation.navigate('RateRide');
    case 'sos':
      return allerOnglet(navigation, 'tableau');
    case 'signalement_traite':
      return null;
    case 'nouvel_avis':
    case 'badge_obtenu':
      return navigation.navigate('Stats');
    default:
      return trajetId ? navigation.navigate('RideDetail', { id: trajetId }) : null;
  }
}
