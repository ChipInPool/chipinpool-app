import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '@/screens/HomeScreen';
import PoolsScreen from '@/screens/PoolsScreen';
import PoolDetailsScreen from '@/screens/PoolDetailsScreen';
import WalletScreen from '@/screens/WalletScreen';
import CardsScreen from '@/screens/CardsScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import PaymentMethodsScreen from '@/screens/PaymentMethodsScreen';
import CreatePoolScreen from '@/screens/CreatePoolScreen';
import SpendNowScreen from '@/screens/SpendNowScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import SecurityScreen from '@/screens/SecurityScreen';
import NotificationsScreen from '@/screens/NotificationsScreen';
import ActivityScreen from '@/screens/ActivityScreen';
import RewardsScreen from '@/screens/RewardsScreen';
import NotificationSettingsScreen from '@/screens/NotificationSettingsScreen';
import RecurringScreen from '@/screens/RecurringScreen';

export type AppTabParamList = {
  HomeTab: undefined;
  PoolsTab: undefined;
  WalletTab: undefined;
  CardsTab: undefined;
  SpendNowTab: undefined;
};

export type PoolsStackParamList = {
  PoolsList: undefined;
  PoolDetails: { poolId: string };
  CreatePool: undefined;
  SpendNow: undefined;
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  PaymentMethods: undefined;
  Settings: undefined;
  Security: undefined;
  Notifications: undefined;
  NotificationSettings: undefined;
  Activity: undefined;
  Rewards: undefined;
  Recurring: undefined;
};

const Tab = createBottomTabNavigator();
const PoolsStackNav = createNativeStackNavigator();
const ProfileStackNav = createNativeStackNavigator();
const SpendNowStackNav = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

function PoolsStackNavigator() {
  return (
    <PoolsStackNav.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#001F3F' },
        headerTintColor: '#fff',
      }}
    >
      <PoolsStackNav.Screen name="PoolsList" component={PoolsScreen} options={{ title: 'Pools' }} />
      <PoolsStackNav.Screen name="PoolDetails" component={PoolDetailsScreen} options={{ title: 'Pool' }} />
      <PoolsStackNav.Screen name="CreatePool" component={CreatePoolScreen} options={{ title: 'Create Pool' }} />
      <PoolsStackNav.Screen name="SpendNow" component={SpendNowScreen} options={{ title: 'Spend Now' }} />
    </PoolsStackNav.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStackNav.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#001F3F' },
        headerTintColor: '#fff',
      }}
    >
      <ProfileStackNav.Screen name="ProfileMain" component={ProfileScreen} options={{ title: 'Profile' }} />
      <ProfileStackNav.Screen name="PaymentMethods" component={PaymentMethodsScreen} options={{ title: 'Payment Methods' }} />
      <ProfileStackNav.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <ProfileStackNav.Screen name="Security" component={SecurityScreen} options={{ title: 'Security' }} />
      <ProfileStackNav.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
      <ProfileStackNav.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={{ title: 'Notification Settings' }} />
      <ProfileStackNav.Screen name="Activity" component={ActivityScreen} options={{ title: 'Activity' }} />
      <ProfileStackNav.Screen name="Rewards" component={RewardsScreen} options={{ title: 'Rewards' }} />
      <ProfileStackNav.Screen name="Recurring" component={RecurringScreen} options={{ title: 'Auto-Contribute' }} />
    </ProfileStackNav.Navigator>
  );
}

function SpendNowStackNavigator() {
  return (
    <SpendNowStackNav.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#001F3F' },
        headerTintColor: '#fff',
      }}
    >
      <SpendNowStackNav.Screen name="SpendNowMain" component={SpendNowScreen} options={{ title: 'Spend Now' }} />
    </SpendNowStackNav.Navigator>
  );
}

function AppTabsContent() {
  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'HomeTab') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'PoolsTab') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'WalletTab') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'CardsTab') {
            iconName = focused ? 'card' : 'card-outline';
          } else if (route.name === 'SpendNowTab') {
            iconName = focused ? 'bag-handle' : 'bag-handle-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#7FFFD4',
        tabBarInactiveTintColor: '#708090',
        tabBarStyle: {
          backgroundColor: '#001F3F',
          borderTopColor: 'rgba(255,255,255,0.1)',
        },
        headerStyle: { backgroundColor: '#001F3F' },
        headerTintColor: '#fff',
        headerRight: () => (
          <TouchableOpacity
            onPress={() => navigation.navigate('ProfileModal')}
            style={{ marginRight: 16 }}
          >
            <Ionicons name="person-circle-outline" size={28} color="#7FFFD4" />
          </TouchableOpacity>
        ),
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="PoolsTab" component={PoolsStackNavigator} options={{ headerShown: false, title: 'Pools' }} />
      <Tab.Screen name="SpendNowTab" component={SpendNowStackNavigator} options={{ headerShown: false, title: 'Spend Now' }} />
      <Tab.Screen name="WalletTab" component={WalletScreen} options={{ title: 'Wallet' }} />
      <Tab.Screen name="CardsTab" component={CardsScreen} options={{ title: 'Cards' }} />
    </Tab.Navigator>
  );
}

export default function AppTabs() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="MainTabs" component={AppTabsContent} />
      <RootStack.Group screenOptions={{ presentation: 'modal', headerStyle: { backgroundColor: '#001F3F' }, headerTintColor: '#fff' }}>
        <RootStack.Screen name="ProfileModal" component={ProfileStackNavigator} options={{ headerShown: false }} />
      </RootStack.Group>
    </RootStack.Navigator>
  );
}
