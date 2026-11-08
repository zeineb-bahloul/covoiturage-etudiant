import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import api from '../api';

export default function RideResultsScreen({ route, navigation }) {
  const { lat, lng, label, date, heure, prixMax } = route.params;
  const [trajets, setTrajets] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    api
      .get('/rides/search', { params: { lat, lng, date, heure, prixMax } })
      .then(({ data }) => setTrajets(data))
      .catch((err) => setErreur(err.response?.data?.message || 'Impossible de joindre le serveur'))
      .finally(() => setChargement(false));
  }, [lat, lng, date, heure, prixMax]);

  if (chargement) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ textAlign: 'center', marginBottom: 12 }}>
        {trajets.length} trajet(s) près de « {label} » le {date}
      </Text>

      {erreur ? <Text style={{ color: '#dc2626', textAlign: 'center' }}>{erreur}</Text> : null}

      <FlatList
        data={trajets}
        keyExtractor={(t) => t._id}
        ListEmptyComponent={
          erreur ? null : (
            <Text style={{ textAlign: 'center', marginTop: 40 }}>
              Aucun trajet trouvé. Essayez une autre date ou retirez les filtres.
            </Text>
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate('RideDetail', { id: item._id })}
            style={{ padding: 14, borderRadius: 10, backgroundColor: '#f3f4f6', marginBottom: 12 }}
          >
            <Text style={{ fontWeight: 'bold' }}>
              {item.conducteur?.nom} · {(item.conducteur?.noteMoyenne || 0).toFixed(1)} ★
            </Text>
            <Text style={{ marginTop: 4 }}>
              {item.depart.label} → {item.destination.label}
            </Text>
            <Text>
              Départ {item.heureDepart}, arrivée {item.heureArrivee}
            </Text>
            <Text style={{ marginTop: 4, color: '#2563eb' }}>
              À {item.distanceDepartKm} km de vous · {item.prix} DT · {item.places} place(s)
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}