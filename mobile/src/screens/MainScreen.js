import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import TabBar from '../components/TabBar';
import { useRealtime } from '../context/AuthContext';
import { colors } from '../theme';
import HomeScreen from './HomeScreen';
import SearchRideScreen from './SearchRideScreen';
import TripsScreen from './TripsScreen';
import DiscussionsScreen from './DiscussionsScreen';
import ProfileScreen from './ProfileScreen';

const ONGLETS = {
  accueil: HomeScreen,
  recherche: SearchRideScreen,
  trajets: TripsScreen,
  messages: DiscussionsScreen,
  profil: ProfileScreen,
};

/** Écran principal avec la barre d'onglets en bas. */
export default function MainScreen({ navigation, route }) {
  const [onglet, setOnglet] = useState(route.params?.onglet || 'accueil');
  const { nbMessages } = useRealtime();

  // Permet aux autres écrans d'ouvrir un onglet : navigation.popTo('Main', { onglet: 'trajets' })
  useEffect(() => {
    if (route.params?.onglet) setOnglet(route.params.onglet);
  }, [route.params?.onglet, route.params]);

  const Contenu = ONGLETS[onglet];
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1 }}>
        <Contenu navigation={navigation} route={route} allerOnglet={setOnglet} />
      </View>
      <TabBar actif={onglet} onChange={setOnglet} badges={{ messages: nbMessages }} />
    </View>
  );
}
