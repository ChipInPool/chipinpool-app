import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/navigation/AuthStack';
import { useTheme } from '@/theme/ThemeContext';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;

export default function WelcomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();

  const buttonTextColor = isDark ? '#001F3F' : '#FFFFFF';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../../assets/icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={[styles.logo, { color: colors.mint }]}>ChipInPool</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>Pool funds. Share expenses. Pay together.</Text>
        </View>

        <View style={styles.features}>
          <FeatureItem icon="💰" title="Pool Funds" description="Collect money from friends for any purpose" colors={colors} />
          <FeatureItem icon="💳" title="Virtual Cards" description="Spend pooled funds with a virtual Visa card" colors={colors} />
          <FeatureItem icon="🔒" title="Secure" description="Bank-level security with instant payouts" colors={colors} />
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.mint }]} onPress={() => navigation.navigate('Register')} data-testid="button-get-started">
            <Text style={[styles.primaryButtonText, { color: buttonTextColor }]}>Get Started</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Login')} data-testid="button-login">
            <Text style={[styles.secondaryButtonText, { color: colors.mint }]}>I already have an account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

function FeatureItem({ icon, title, description, colors }: { icon: string; title: string; description: string; colors: any }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <View style={styles.featureText}>
        <Text style={[styles.featureTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 20,
    marginBottom: 16,
  },
  logo: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    textAlign: 'center',
  },
  features: {
    gap: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  featureIcon: {
    fontSize: 32,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
  },
  buttons: {
    gap: 16,
    marginBottom: 20,
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
  },
});
