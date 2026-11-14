import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { clearApiToken, loadApiToken, setApiToken, surJetonExpire } from './src/api';
import { connecterSocket, deconnecterSocket } from './src/socket';
import { AuthContext, RealtimeProvider } from './src/context/AuthContext';
import { Loader } from './src/components/ui';
import NotificationBanner from './src/components/NotificationBanner';
import { ouvrirNotification } from './src/notifications';
import { colors } from './src/theme';

import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import MainScreen from './src/screens/MainScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import VehicleScreen from './src/screens/VehicleScreen';
import ScheduleScreen from './src/screens/ScheduleScreen';
import MyRidesScreen from './src/screens/MyRidesScreen';
import PublishRideScreen from './src/screens/PublishRideScreen';
import EditRideScreen from './src/screens/EditRideScreen';
import RideResultsScreen from './src/screens/RideResultsScreen';
import RideDetailScreen from './src/screens/RideDetailScreen';
import BookingRequestsScreen from './src/screens/BookingRequestsScreen';
import MyBookingsScreen from './src/screens/MyBookingsScreen';
import MatchingDetailScreen from './src/screens/MatchingDetailScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import ActiveRideScreen from './src/screens/ActiveRideScreen';
import ChatScreen from './src/screens/ChatScreen';
import RateRideScreen from './src/screens/RateRideScreen';
import ReportScreen from './src/screens/ReportScreen';
import StatsScreen from './src/screens/StatsScreen';

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

export default function App() {
  const [token, setToken] = useState(null);
  const [chargement, setChargement] = useState(true);

  const deconnecter = useCallback(async () => {
    deconnecterSocket();
    await clearApiToken();
    setToken(null);
  }, []);

  const connecter = useCallback(async (nouveauToken) => {
    await setApiToken(nouveauToken);
    connecterSocket(nouveauToken);
    setToken(nouveauToken);
  }, []);

  useEffect(() => {
    surJetonExpire(deconnecter);
    loadApiToken()
      .then((t) => {
        if (t) connecterSocket(t);
        setToken(t);
      })
      .finally(() => setChargement(false));
  }, [deconnecter]);

  if (chargement) {
    return (
      <SafeAreaProvider>
        <Loader />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthContext.Provider value={{ token, connecter, deconnecter }}>
        <RealtimeProvider token={token}>
          <NavigationContainer ref={navigationRef}>
            <StatusBar style="dark" />
            <Stack.Navigator
              screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: colors.background } }}
            >
              {token ? (
                <>
                  <Stack.Screen name="Main" component={MainScreen} />
                  <Stack.Screen name="EditProfile" component={EditProfileScreen} />
                  <Stack.Screen name="Vehicle" component={VehicleScreen} />
                  <Stack.Screen name="Schedule" component={ScheduleScreen} />
                  <Stack.Screen name="MyRides" component={MyRidesScreen} />
                  <Stack.Screen name="PublishRide" component={PublishRideScreen} />
                  <Stack.Screen name="EditRide" component={EditRideScreen} />
                  <Stack.Screen name="RideResults" component={RideResultsScreen} />
                  <Stack.Screen name="RideDetail" component={RideDetailScreen} />
                  <Stack.Screen name="BookingRequests" component={BookingRequestsScreen} />
                  <Stack.Screen name="MyBookings" component={MyBookingsScreen} />
                  <Stack.Screen name="MatchingDetail" component={MatchingDetailScreen} />
                  <Stack.Screen name="Notifications" component={NotificationsScreen} />
                  <Stack.Screen name="ActiveRide" component={ActiveRideScreen} />
                  <Stack.Screen name="Chat" component={ChatScreen} />
                  <Stack.Screen name="RateRide" component={RateRideScreen} />
                  <Stack.Screen name="Report" component={ReportScreen} options={{ presentation: 'modal' }} />
                  <Stack.Screen name="Stats" component={StatsScreen} />
                </>
              ) : (
                <>
                  <Stack.Screen name="Welcome" component={WelcomeScreen} />
                  <Stack.Screen name="Login" component={LoginScreen} />
                  <Stack.Screen name="Register" component={RegisterScreen} />
                  <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
                </>
              )}
            </Stack.Navigator>
          </NavigationContainer>
          {token ? (
            <NotificationBanner onOpen={(n) => navigationRef.isReady() && ouvrirNotification(navigationRef, n)} />
          ) : null}
        </RealtimeProvider>
      </AuthContext.Provider>
    </SafeAreaProvider>
  );
}
