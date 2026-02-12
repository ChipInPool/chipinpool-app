import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const FEATURES = [
  {
    icon: 'card' as const,
    title: 'Virtual Visa Cards',
    description: 'Instant virtual cards linked to your pools',
  },
  {
    icon: 'globe' as const,
    title: 'Spend Anywhere',
    description: 'Use online or with Apple Pay & Google Pay',
  },
  {
    icon: 'pulse' as const,
    title: 'Real-time Tracking',
    description: 'See every transaction instantly',
  },
  {
    icon: 'snow' as const,
    title: 'Freeze & Unfreeze',
    description: 'Control your card with one tap',
  },
];

export default function CardsScreen() {
  const handleNotifyMe = () => {
    Alert.alert(
      'You\'re on the list! 🎉',
      'We\'ll notify you as soon as virtual cards are available.',
      [{ text: 'Sounds Good', style: 'default' }]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.comingSoonBanner}>
          <View style={styles.bannerIconContainer}>
            <Ionicons name="card" size={32} color="#7FFFD4" />
          </View>
          <Text style={styles.comingSoonLabel}>COMING SOON</Text>
          <Text style={styles.bannerTitle}>Virtual Visa Debit Cards</Text>
          <Text style={styles.bannerSubtitle}>
            Spend directly from your pools with virtual Visa cards — online, in-store, and everywhere Visa is accepted.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>What's Coming</Text>

        <View style={styles.featuresGrid}>
          {FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureCard}>
              <View style={styles.featureIconContainer}>
                <Ionicons name={feature.icon} size={24} color="#7FFFD4" />
              </View>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Card Preview</Text>

        <LinearGradient
          colors={['#001F3F', '#003366', '#7FFFD4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardMockup}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardBrand}>ChipInPool</Text>
            <View style={styles.contactlessIcon}>
              <Ionicons name="wifi" size={20} color="rgba(255,255,255,0.8)" style={{ transform: [{ rotate: '90deg' }] }} />
            </View>
          </View>

          <View style={styles.chipRow}>
            <View style={styles.cardChip} />
          </View>

          <Text style={styles.cardNumber}>•••• •••• •••• 4821</Text>

          <View style={styles.cardFooter}>
            <View>
              <Text style={styles.cardLabel}>CARD HOLDER</Text>
              <Text style={styles.cardValue}>YOUR NAME</Text>
            </View>
            <View>
              <Text style={styles.cardLabel}>EXPIRES</Text>
              <Text style={styles.cardValue}>••/••</Text>
            </View>
            <View style={styles.visaLogo}>
              <Text style={styles.visaText}>VISA</Text>
            </View>
          </View>
        </LinearGradient>

        <TouchableOpacity
          style={styles.notifyButton}
          activeOpacity={0.8}
          onPress={handleNotifyMe}
          data-testid="button-notify-me"
        >
          <Ionicons name="notifications" size={20} color="#001F3F" style={{ marginRight: 8 }} />
          <Text style={styles.notifyButtonText}>Notify Me When Available</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#001F3F',
  },
  content: {
    padding: 20,
  },
  comingSoonBanner: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    marginBottom: 28,
    borderRadius: 20,
    backgroundColor: 'rgba(127, 255, 212, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(127, 255, 212, 0.15)',
  },
  bannerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(127, 255, 212, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  comingSoonLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7FFFD4',
    letterSpacing: 3,
    marginBottom: 8,
  },
  bannerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  featureCard: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(127, 255, 212, 0.1)',
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(127, 255, 212, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 16,
  },
  cardMockup: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    aspectRatio: 1.586,
    justifyContent: 'space-between',
    shadowColor: '#7FFFD4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardBrand: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  contactlessIcon: {
    opacity: 0.8,
  },
  chipRow: {
    marginTop: 8,
  },
  cardChip: {
    width: 45,
    height: 32,
    backgroundColor: '#D4AF37',
    borderRadius: 6,
  },
  cardNumber: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 3,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
    marginBottom: 2,
  },
  cardValue: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  visaLogo: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  visaText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
    fontStyle: 'italic',
    letterSpacing: 2,
  },
  notifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7FFFD4',
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: '#7FFFD4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  notifyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#001F3F',
  },
});
