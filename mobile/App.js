import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';

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
          <Stack.Screen name="Home" options={{ title: 'Accueil' }}>
            {(props) => <HomeScreen {...props} token={token} onLogout={deconnecter} />}
          </Stack.Screen>
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