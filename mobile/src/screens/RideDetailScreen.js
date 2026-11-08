import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import api from '../api';
import styles from '../styles';

export default function RideDetailScreen({ route }) {
  const { id } = route.params;
  const [ride, setRide] = useState(null);
  const [erreur, setErreur] = useState('');
  const mapRef = useRef(null);

  useEffect(() => {
    api
      .get(`/rides/${id}`)
      .then(({ data }) => setRide(data))
      .catch((err) => setErreur(err.response?.data?.message || 'Impossible de charger le trajet'));
  }, [id]);

  if (erreur) {
    return <Text style={{ color: '#dc2626', textAlign: 'center', marginTop: 40 }}>{erreur}</Text>;
  }
  if (!ride) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const points = ride.itineraire.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
  const [lngD, latD] = ride.depart.location.coordinates;
  const [lngA, latA] = ride.destination.location.coordinates;
  const depart = { latitude: latD, longitude: lngD };
  const arrivee = { latitude: latA, longitude: lngA };

  const ajuster = () => {
    mapRef.current?.fitToCoordinates(points.length ? points : [depart, arrivee], {
      edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
      animated: false,
    });
  };

  const quand = ride.recurrent
    ? `Chaque ${ride.jours.join(', ')}`
    : `Le ${new Date(ride.date).toISOString().slice(0, 10)}`;

  return (
    <ScrollView>
      <MapView
        ref={mapRef}
        style={{ height: 320 }}
        mapType="none"
        initialRegion={{ ...depart, latitudeDelta: 0.2, longitudeDelta: 0.2 }}
        onMapReady={ajuster}
      >
        <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} />
        <Polyline coordinates={points} strokeWidth={4} strokeColor="#2563eb" />
        <Marker coordinate={depart} title="Départ" description={ride.depart.label} pinColor="green" />
        <Marker coordinate={arrivee} title="Arrivée" description={ride.destination.label} pinColor="red" />
      </MapView>
      <Text style={{ fontSize: 11, textAlign: 'right', paddingRight: 8, color: '#6b7280' }}>
        © OpenStreetMap contributors
      </Text>

      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 4 }}>
          {ride.depart.label} → {ride.destination.label}
        </Text>
        <Text>{quand}</Text>
        <Text>
          Départ {ride.heureDepart} · arrivée {ride.heureArrivee}
        </Text>
        <Text>
          {ride.distanceKm} km · environ {ride.dureeMin} min
        </Text>
        <Text style={{ marginTop: 8, fontWeight: 'bold' }}>
          {ride.prix} DT par passager · {ride.places} place(s)
        </Text>

        <View style={{ marginTop: 16, padding: 14, borderRadius: 10, backgroundColor: '#f3f4f6' }}>
          <Text style={{ fontWeight: 'bold' }}>
            {ride.conducteur?.nom} · {(ride.conducteur?.noteMoyenne || 0).toFixed(1)} ★
          </Text>
          {ride.conducteur?.vehicule ? <Text>Véhicule : {ride.conducteur.vehicule.marque}</Text> : null}
          <Text>{ride.conducteur?.preferences?.nonFumeur ? 'Non-fumeur' : 'Fumeur accepté'}</Text>
          <Text>Musique : {ride.conducteur?.preferences?.musique || 'aucune'}</Text>
        </View>

        <TouchableOpacity style={[styles.bouton, { marginTop: 20, backgroundColor: '#9ca3af' }]} disabled>
          <Text style={styles.boutonTexte}>Réserver (prochaine étape)</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}