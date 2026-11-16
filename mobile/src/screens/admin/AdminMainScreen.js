import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import TabBar from '../../components/TabBar';
import { colors } from '../../theme';
import AdminDashboardScreen from './AdminDashboardScreen';
import AdminUsersScreen from './AdminUsersScreen';
import AdminReportsScreen from './AdminReportsScreen';

const ONGLETS = [
  { cle: 'tableau', label: 'Tableau de bord', icone: 'grid' },
  { cle: 'utilisateurs', label: 'Utilisateurs', icone: 'people' },
  { cle: 'signalements', label: 'Signalements', icone: 'flag' },
];

const ECRANS = { tableau: AdminDashboardScreen, utilisateurs: AdminUsersScreen, signalements: AdminReportsScreen };

/** Espace administration (US18, US19, US20) : affiché quand le compte a le rôle « admin ». */
export default function AdminMainScreen({ navigation, route }) {
  const [onglet, setOnglet] = useState(route.params?.onglet || 'tableau');
  useEffect(() => {
    if (route.params?.onglet && ECRANS[route.params.onglet]) setOnglet(route.params.onglet);
  }, [route.params]);
  const Contenu = ECRANS[onglet];
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1 }}>
        <Contenu navigation={navigation} allerOnglet={setOnglet} />
      </View>
      <TabBar actif={onglet} onChange={setOnglet} onglets={ONGLETS} />
    </View>
  );
}
