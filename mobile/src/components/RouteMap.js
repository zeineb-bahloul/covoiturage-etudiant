import React, { useCallback, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import { colors, radius } from '../theme';

/** Carte OpenStreetMap (tuiles gratuites) avec l'itinéraire d'un trajet. */
export default function RouteMap({ ride, height = 220, voiture, style }) {
  const ref = useRef(null);
  const points = (ride.itineraire || []).map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
  const [lngD, latD] = ride.depart.location.coordinates;
  const [lngA, latA] = ride.destination.location.coordinates;
  const depart = { latitude: latD, longitude: lngD };
  const arrivee = { latitude: latA, longitude: lngA };

  const cadrer = useCallback(() => {
    ref.current?.fitToCoordinates(points.length > 1 ? points : [depart, arrivee], {
      edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
      animated: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ride._id]);

  return (
    <View style={[styles.box, { height }, style]}>
      <MapView
        ref={ref}
        style={StyleSheet.absoluteFill}
        mapType="none"
        initialRegion={{
          latitude: (latD + latA) / 2,
          longitude: (lngD + lngA) / 2,
          latitudeDelta: Math.abs(latD - latA) * 1.6 + 0.05,
          longitudeDelta: Math.abs(lngD - lngA) * 1.6 + 0.05,
        }}
        onMapReady={cadrer}
        toolbarEnabled={false}
      >
        <UrlTile urlTemplate="https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png" maximumZ={19} tileSize={256} />
        {points.length > 1 ? <Polyline coordinates={points} strokeWidth={5} strokeColor={colors.primary} /> : null}
        <Marker coordinate={depart} title="Départ" description={ride.depart.label} pinColor="blue" />
        <Marker coordinate={arrivee} title="Arrivée" description={ride.destination.label} pinColor="gold" />
        {voiture ? (
          <Marker coordinate={voiture} title="Véhicule" anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.voiture}>
              <View style={styles.voiturePoint} />
            </View>
          </Marker>
        ) : null}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.input },
  voiture: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(13,71,161,0.25)', alignItems: 'center', justifyContent: 'center' },
  voiturePoint: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.white },
});
