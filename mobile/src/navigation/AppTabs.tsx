import React from 'react';
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

export type AppTabParamList = {
  HomeTab: undefined;
  PoolsTab: undefined;
  WalletTab: undefined;
  CardsTab: undefined;
  ProfileTab: undefined;
};

export type PoolsStackParamList = {
  PoolsList: undefined;
  PoolDetails: { poolId: string };
  CreatePool: undefined;
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  PaymentMethods: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();
const PoolsStack = createNativeStackNavigator<PoolsStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

function PoolsStackNavigator() {
  return (
    <PoolsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#001F3F' },
        headerTintColor: '#fff',
      }}
    >
      <PoolsStack.Screen name="PoolsList" component={PoolsScreen} options={{ title: 'Pools' }} />
      <PoolsStack.Screen name="PoolDetails" component={PoolDetailsScreen} options={{ title: 'Pool' }} />
      <PoolsStack.Screen name="CreatePool" component={CreatePoolScreen} options={{ title: 'Create Pool' }} />
    </PoolsStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#001F3F' },
        headerTintColor: '#fff',
      }}
    >
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} options={{ title: 'Profile' }} />
      <ProfileStack.Screen name="PaymentMethods" component={PaymentMethodsScreen} options={{ title: 'Payment Methods' }} />
    </ProfileStack.Navigator>
  );
}

export default function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
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
          } else if (route.name === 'ProfileTab') {
            iconName = focused ? 'person' : 'person-outline';
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
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="PoolsTab" component={PoolsStackNavigator} options={{ headerShown: false, title: 'Pools' }} />
      <Tab.Screen name="WalletTab" component={WalletScreen} options={{ title: 'Wallet' }} />
      <Tab.Screen name="CardsTab" component={CardsScreen} options={{ title: 'Cards' }} />
      <Tab.Screen name="ProfileTab" component={ProfileStackNavigator} options={{ headerShown: false, title: 'Profile' }} />
    </Tab.Navigator>
  );
}
