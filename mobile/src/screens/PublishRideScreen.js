import React, { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import api from '../api';
import AddressPicker from '../components/AddressPicker';
import TimeInput from '../components/TimeInput';
import { Button, Card, Chip, Field, Header, Input, Loader, Notice, Row, Screen, Segmented, Stepper } from '../components/ui';
import { colors, font, radius, spacing } from '../theme';
import { HEURE, JOURS, dateISO, erreurApi } from '../utils';

// Destination la plus fréquente : proposée en raccourci
const ISET = { label: 'ISET Nabeul, Campus universitaire Mrezgua, Nabeul', lat: 36.4378, lng: 10.6794, titre: 'ISET Nabeul', icone: 'school-outline' };

function prochainsJours() {
  const noms = ["Aujourd'hui", 'Demain'];
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return { valeur: dateISO(d), label: noms[i] || d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) };
  });
}

/** Publier un trajet ponctuel ou récurrent (US6). */
export default function PublishRideScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [depart, setDepart] = useState(null);
  const [destination, setDestination] = useState(null);
  const [heure, setHeure] = useState('07:45');
  const [places, setPlaces] = useState(3);
  const [prix, setPrix] = useState('3');
  const [recurrent, setRecurrent] = useState('recurrent');
  const [jours, setJours] = useState(['lundi', 'mardi', 'mercredi', 'jeudi']);
  const [date, setDate] = useState(dateISO());
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    api
      .get('/auth/me')
      .then(({ data }) => {
        setUser(data);
        if (data.vehicule) setPlaces(Math.min(3, data.vehicule.places));
        if (data.domicile) {
          const [lng, lat] = data.domicile.location.coordinates;
          setDepart({ label: data.domicile.label, lat, lng });
        }
      })
      .catch((err) => setErreur(erreurApi(err)));
  }, []);

  const basculerJour = (cle) => setJours((a) => (a.includes(cle) ? a.filter((j) => j !== cle) : [...a, cle]));

  const publier = async () => {
    setErreur('');
    const montant = Number(String(prix).replace(',', '.'));
    if (!depart || !destination) return setErreur('Choisissez le départ et la destination.');
    if (!HEURE.test(heure)) return setErreur("Heure de départ au format HH:MM (ex : 07:45).");
    if (!Number.isFinite(montant) || montant < 0) return setErreur('Indiquez un prix valide (0 si gratuit).');
    if (recurrent === 'recurrent' && jours.length === 0) return setErreur('Choisissez au moins un jour.');

    setEnvoi(true);
    try {
      const { data } = await api.post('/rides', {
        depart: { label: depart.label, lat: depart.lat, lng: depart.lng },
        destination: { label: destination.label, lat: destination.lat, lng: destination.lng },
        heureDepart: heure,
        places,
        prix: montant,
        recurrent: recurrent === 'recurrent',
        jours: recurrent === 'recurrent' ? jours : [],
        date: recurrent === 'recurrent' ? undefined : date,
      });
      Alert.alert(
        'Trajet publié',
        `${String(data.distanceKm).replace('.', ',')} km · environ ${data.dureeMin} min · arrivée prévue à ${data.heureArrivee}.\nLes étudiants compatibles ont été prévenus.`,
        [{ text: 'Voir mes trajets', onPress: () => navigation.replace('MyRides') }]
      );
    } catch (err) {
      setErreur(erreurApi(err));
    } finally {
      setEnvoi(false);
    }
  };

  if (!user && !erreur) return <Loader />;

  if (user && !user.vehicule) {
    return (
      <Screen header={<Header title="Publier un trajet" onBack={() => navigation.goBack()} />}>
        <Notice tone="warning" icon="car-outline" title="Ajoutez d'abord votre véhicule" text="La capacité de votre véhicule limite le nombre de places proposées." />
        <Button title="Ajouter mon véhicule" onPress={() => navigation.replace('Vehicle')} />
      </Screen>
    );
  }

  const maxPlaces = user?.vehicule?.places || 4;
  const dates = prochainsJours();

  return (
    <Screen
      header={<Header title="Publier un trajet" subtitle="Partagez vos places libres" onBack={() => navigation.goBack()} />}
      footer={<Button title="Publier le trajet" icon="paper-plane-outline" onPress={publier} loading={envoi} />}
      keyboard
    >
      <Card>
        <AddressPicker label="Départ" valeur={depart} onChoisir={setDepart} placeholder="Ex : Hammamet centre" />
        <AddressPicker label="Destination" valeur={destination} onChoisir={setDestination} placeholder="Ex : ISET Nabeul" icon="flag-outline" raccourcis={[ISET]} />
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={font.label}>Heure de départ</Text>
            <Text style={font.caption}>L'arrivée est calculée avec l'itinéraire</Text>
          </View>
          <TimeInput value={heure} onChange={setHeure} placeholder="07:45" />
        </Row>
      </Card>

      <Card>
        <Segmented
          value={recurrent}
          onChange={setRecurrent}
          options={[
            { value: 'recurrent', label: 'Chaque semaine' },
            { value: 'ponctuel', label: 'Une seule fois' },
          ]}
          style={{ marginBottom: spacing.lg }}
        />
        {recurrent === 'recurrent' ? (
          <Field label="Jours du trajet" style={{ marginBottom: 0 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              {JOURS.map((j) => {
                const actif = jours.includes(j.cle);
                return (
                  <Text
                    key={j.cle}
                    onPress={() => basculerJour(j.cle)}
                    style={{
                      width: 44,
                      paddingVertical: 10,
                      textAlign: 'center',
                      borderRadius: radius.md,
                      overflow: 'hidden',
                      fontWeight: '700',
                      backgroundColor: actif ? colors.primary : colors.input,
                      color: actif ? colors.white : colors.muted,
                    }}
                  >
                    {j.court}
                  </Text>
                );
              })}
            </Row>
          </Field>
        ) : (
          <Field label="Date" style={{ marginBottom: 0 }}>
            <Row gap={8} style={{ flexWrap: 'wrap' }}>
              {dates.map((d) => (
                <Chip key={d.valeur} label={d.label} selected={date === d.valeur} onPress={() => setDate(d.valeur)} />
              ))}
            </Row>
          </Field>
        )}
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between', marginBottom: spacing.lg }}>
          <View style={{ flex: 1 }}>
            <Text style={font.label}>Places proposées</Text>
            <Text style={font.caption}>Votre véhicule : {maxPlaces} place(s)</Text>
          </View>
          <Stepper value={places} onChange={setPlaces} min={1} max={maxPlaces} />
        </Row>
        <Input
          label="Participation par passager (DT)"
          icon="cash-outline"
          value={prix}
          onChangeText={setPrix}
          keyboardType="decimal-pad"
          hint={recurrent === 'recurrent' ? 'Prix par trajet. Ex : 3 DT × 4 jours = 12 DT par semaine.' : 'Prix du trajet pour un passager.'}
          style={{ marginBottom: 8 }}
        />
        <Row gap={8}>
          {['2', '3', '5', '8'].map((p) => (
            <Chip key={p} label={`${p} DT`} selected={prix === p} onPress={() => setPrix(p)} />
          ))}
        </Row>
      </Card>

      {erreur ? <Notice tone="danger" icon="alert-circle-outline" text={erreur} /> : null}
    </Screen>
  );
}
