import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import VehicleScreen from './src/screens/VehicleScreen';
import ScheduleScreen from './src/screens/ScheduleScreen';
import MyRidesScreen from './src/screens/MyRidesScreen';
import PublishRideScreen from './src/screens/PublishRideScreen';
import SearchRideScreen from './src/screens/SearchRideScreen';
import RideResultsScreen from './src/screens/RideResultsScreen';
import RideDetailScreen from './src/screens/RideDetailScreen';
const Stack = createNativeStackNavigator();

export default function App() {
  const [token, setToken] = useState(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('token').then((t) => {
      setToken(t);
      setChargement(false);
    });
  }, []);

  const connecter = async (nouveauToken) => {
    await AsyncStorage.setItem('token', nouveauToken);
    setToken(nouveauToken);
  };

  const deconnecter = async () => {
    await AsyncStorage.removeItem('token');
    setToken(null);
  };

  if (chargement) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {token ? (
          <>
            <Stack.Screen name="Home" options={{ title: 'Accueil' }}>
              {(props) => <HomeScreen {...props} onLogout={deconnecter} />}
            </Stack.Screen>

            <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Mon profil' }} />

            <Stack.Screen name="Vehicle" component={VehicleScreen} options={{ title: 'Mon véhicule' }} />
            <Stack.Screen name="Schedule" component={ScheduleScreen} options={{ title: 'Mon emploi du temps' }} />
            <Stack.Screen name="MyRides" component={MyRidesScreen} options={{ title: 'Mes trajets' }} />
            <Stack.Screen name="PublishRide" component={PublishRideScreen} options={{ title: 'Publier un trajet' }} />
            <Stack.Screen name="SearchRide" component={SearchRideScreen} options={{ title: 'Chercher un trajet' }} />
            <Stack.Screen name="RideResults" component={RideResultsScreen} options={{ title: 'Résultats' }} />
            <Stack.Screen name="RideDetail" component={RideDetailScreen} options={{ title: 'Détail du trajet' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" options={{ title: 'Connexion' }}>
              {(props) => <LoginScreen {...props} onLogin={connecter} />}
            </Stack.Screen>

            <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Inscription' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}