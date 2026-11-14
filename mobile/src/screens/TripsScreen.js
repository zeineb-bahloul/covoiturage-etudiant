import React, { useState } from 'react';
import { View } from 'react-native';
import { Header, Segmented } from '../components/ui';
import { BookingsList } from './MyBookingsScreen';
import { RidesList } from './MyRidesScreen';
import { spacing } from '../theme';

/** Onglet « Trajets » : mes réservations (passager) et mes trajets publiés (conducteur). */
export default function TripsScreen({ navigation }) {
  const [role, setRole] = useState('passager');
  return (
    <View style={{ flex: 1 }}>
      <Header title="Mes trajets">
        <Segmented
          style={{ marginTop: spacing.sm }}
          value={role}
          onChange={setRole}
          options={[
            { value: 'passager', label: 'Passager' },
            { value: 'conducteur', label: 'Conducteur' },
          ]}
        />
      </Header>
      {role === 'passager' ? <BookingsList navigation={navigation} /> : <RidesList navigation={navigation} />}
    </View>
  );
}
