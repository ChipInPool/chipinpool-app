import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeContext';

const FEATURES = [
  { icon: 'people-outline', label: 'Fund Pooling' },
  { icon: 'card-outline', label: 'Virtual Cards' },
  { icon: 'cash-outline', label: 'Bank Payouts' },
  { icon: 'bag-handle-outline', label: 'Spend Now Marketplace' },
  { icon: 'trophy-outline', label: 'Rewards & Badges' },
];

const BUILT_WITH = ['React Native', 'Stripe', 'Plaid'];

export default function AboutScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.logoArea}>
          <View style={[styles.logoCircle, { backgroundColor: `${colors.mint}1A` }]}>
            <Text style={[styles.logoText, { color: colors.mint }]}>C</Text>
          </View>
          <Text style={[styles.appName, { color: colors.text }]}>
            Chip<Text style={{ color: colors.mint }}>In</Text>Pool
          </Text>
          <Text style={[styles.version, { color: colors.textSecondary }]} data-testid="text-app-version">
            Version 2.0.1 (Build 12)
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.description, { color: colors.text }]}>
            ChipInPool makes group payments simple. Split expenses, pool funds for trips and gifts, and shop together with virtual Visa cards.
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>OUR MISSION</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.missionText, { color: colors.text }]}>
            To make shared finances effortless. We believe that pooling money with friends, family, and communities should be simple, transparent, and secure.
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>FEATURES</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {FEATURES.map((feature, index) => (
            <View key={index} style={[styles.featureRow, index < FEATURES.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.cardBorder }]}>
              <View style={[styles.featureIcon, { backgroundColor: `${colors.mint}1A` }]}>
                <Ionicons name={feature.icon as any} size={18} color={colors.mint} />
              </View>
              <Text style={[styles.featureLabel, { color: colors.text }]}>{feature.label}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>BUILT WITH</Text>
        <View style={styles.builtWithRow}>
          {BUILT_WITH.map((tech, index) => (
            <View key={index} style={[styles.techBadge, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.techText, { color: colors.mint }]}>{tech}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>LINKS</Text>
        <TouchableOpacity
          style={[styles.linkItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => Linking.openURL('https://chipinpool.com')}
          data-testid="button-link-website"
        >
          <View style={[styles.linkIcon, { backgroundColor: `${colors.blue}1A` }]}>
            <Ionicons name="globe-outline" size={18} color={colors.blue} />
          </View>
          <Text style={[styles.linkLabel, { color: colors.text }]}>Website</Text>
          <Ionicons name="open-outline" size={16} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.linkItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => navigation.navigate('Terms')}
          data-testid="button-link-terms"
        >
          <View style={[styles.linkIcon, { backgroundColor: `${colors.purple}1A` }]}>
            <Ionicons name="document-text-outline" size={18} color={colors.purple} />
          </View>
          <Text style={[styles.linkLabel, { color: colors.text }]}>Terms of Service</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.linkItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => navigation.navigate('Privacy')}
          data-testid="button-link-privacy"
        >
          <View style={[styles.linkIcon, { backgroundColor: `${colors.green}1A` }]}>
            <Ionicons name="shield-outline" size={18} color={colors.green} />
          </View>
          <Text style={[styles.linkLabel, { color: colors.text }]}>Privacy Policy</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 40,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  version: {
    fontSize: 14,
    marginTop: 6,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  missionText: {
    fontSize: 15,
    lineHeight: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '500',
  },
  builtWithRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  techBadge: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  techText: {
    fontSize: 14,
    fontWeight: '600',
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
  },
  linkIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkLabel: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '500',
  },
});
