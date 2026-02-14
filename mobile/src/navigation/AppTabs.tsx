import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
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
import TermsScreen from '@/screens/TermsScreen';
import PrivacyScreen from '@/screens/PrivacyScreen';
import HelpCenterScreen from '@/screens/HelpCenterScreen';
import ContactScreen from '@/screens/ContactScreen';
import AboutScreen from '@/screens/AboutScreen';
import ArchivedPoolsScreen from '@/screens/ArchivedPoolsScreen';

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
  ArchivedPools: undefined;
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
  Terms: undefined;
  Privacy: undefined;
  HelpCenter: undefined;
  Contact: undefined;
  About: undefined;
};

const Tab = createBottomTabNavigator();
const PoolsStackNav = createNativeStackNavigator();
const ProfileStackNav = createNativeStackNavigator();
const SpendNowStackNav = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

function PoolsStackNavigator() {
  const { colors } = useTheme();
  return (
    <PoolsStackNav.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.navy },
        headerTintColor: colors.text,
      }}
    >
      <PoolsStackNav.Screen name="PoolsList" component={PoolsScreen} options={{ title: 'Pools' }} />
      <PoolsStackNav.Screen name="PoolDetails" component={PoolDetailsScreen} options={{ title: 'Pool' }} />
      <PoolsStackNav.Screen name="CreatePool" component={CreatePoolScreen} options={{ title: 'Create Pool' }} />
      <PoolsStackNav.Screen name="SpendNow" component={SpendNowScreen} options={{ title: 'Spend Now' }} />
      <PoolsStackNav.Screen name="ArchivedPools" component={ArchivedPoolsScreen} options={{ title: 'Archived Pools' }} />
    </PoolsStackNav.Navigator>
  );
}

function ProfileStackNavigator() {
  const { colors } = useTheme();
  return (
    <ProfileStackNav.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.navy },
        headerTintColor: colors.text,
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
      <ProfileStackNav.Screen name="Terms" component={TermsScreen} options={{ title: 'Terms of Service' }} />
      <ProfileStackNav.Screen name="Privacy" component={PrivacyScreen} options={{ title: 'Privacy Policy' }} />
      <ProfileStackNav.Screen name="HelpCenter" component={HelpCenterScreen} options={{ title: 'Help Center' }} />
      <ProfileStackNav.Screen name="Contact" component={ContactScreen} options={{ title: 'Contact Us' }} />
      <ProfileStackNav.Screen name="About" component={AboutScreen} options={{ title: 'About' }} />
    </ProfileStackNav.Navigator>
  );
}

function SpendNowStackNavigator() {
  const { colors } = useTheme();
  return (
    <SpendNowStackNav.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.navy },
        headerTintColor: colors.text,
      }}
    >
      <SpendNowStackNav.Screen name="SpendNowMain" component={SpendNowScreen} options={{ title: 'Spend Now' }} />
    </SpendNowStackNav.Navigator>
  );
}

function AppTabsContent() {
  const { colors } = useTheme();
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
        tabBarActiveTintColor: colors.mint,
        tabBarInactiveTintColor: colors.slate,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
        },
        headerStyle: { backgroundColor: colors.navy },
        headerTintColor: colors.text,
        headerRight: () => (
          <TouchableOpacity
            onPress={() => navigation.navigate('ProfileModal')}
            style={{ marginRight: 16 }}
          >
            <Ionicons name="person-circle-outline" size={28} color={colors.mint} />
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
  const { colors } = useTheme();
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="MainTabs" component={AppTabsContent} />
      <RootStack.Group screenOptions={{ presentation: 'modal', headerStyle: { backgroundColor: colors.navy }, headerTintColor: colors.text }}>
        <RootStack.Screen name="ProfileModal" component={ProfileStackNavigator} options={{ headerShown: false }} />
      </RootStack.Group>
    </RootStack.Navigator>
  );
}
