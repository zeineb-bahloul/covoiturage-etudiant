import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StatusBar } from 'react-native';
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
import BookingRequestsScreen from './src/screens/BookingRequestsScreen';
import MyBookingsScreen from './src/screens/MyBookingsScreen';
import MatchingDetailScreen from './src/screens/MatchingDetailScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import ActiveRideScreen from './src/screens/ActiveRideScreen';
import { colors } from './src/theme';
import { AuthContext } from './src/context/AuthContext';

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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ token, connecter, deconnecter }}>
      <NavigationContainer>
        <StatusBar barStyle="dark-content" backgroundColor={colors.card} />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {token ? (
            <>
              <Stack.Screen name="Home">
                {(props) => <HomeScreen {...props} onLogout={deconnecter} />}
              </Stack.Screen>

              <Stack.Screen name="Profile">
                {(props) => <ProfileScreen {...props} onLogout={deconnecter} />}
              </Stack.Screen>

              <Stack.Screen name="Vehicle" component={VehicleScreen} />
              <Stack.Screen name="Schedule" component={ScheduleScreen} />
              <Stack.Screen name="MyRides" component={MyRidesScreen} />
              <Stack.Screen name="PublishRide" component={PublishRideScreen} />
              <Stack.Screen name="SearchRide" component={SearchRideScreen} />
              <Stack.Screen name="RideResults" component={RideResultsScreen} />
              <Stack.Screen name="RideDetail" component={RideDetailScreen} />
              <Stack.Screen name="BookingRequests" component={BookingRequestsScreen} />
              <Stack.Screen name="MyBookings" component={MyBookingsScreen} />
              <Stack.Screen name="MatchingDetail" component={MatchingDetailScreen} />
              <Stack.Screen name="Notifications" component={NotificationsScreen} />
              <Stack.Screen name="ActiveRide" component={ActiveRideScreen} />
            </>
          ) : (
            <>
              <Stack.Screen name="Login">
                {(props) => <LoginScreen {...props} onLogin={connecter} />}
              </Stack.Screen>

              <Stack.Screen name="Register" component={RegisterScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  );
}
