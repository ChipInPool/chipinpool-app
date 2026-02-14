import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeContext';

const FAQ_ITEMS = [
  {
    icon: 'add-circle-outline' as const,
    question: 'How do I create a pool?',
    answer: 'Tap the + button on the Pools tab. Set a title, target amount, and invite friends.',
  },
  {
    icon: 'cash-outline' as const,
    question: 'How do I contribute to a pool?',
    answer: 'Open the pool and tap Contribute. Choose an amount and payment method.',
  },
  {
    icon: 'card-outline' as const,
    question: 'How do virtual cards work?',
    answer: 'Once a pool has funds, you can get a virtual Visa card linked to the pool for spending.',
  },
  {
    icon: 'download-outline' as const,
    question: 'How do withdrawals work?',
    answer: 'Go to your Wallet, tap Withdraw, and select a linked bank account. Withdrawals are reviewed within 1-2 business days.',
  },
  {
    icon: 'shield-checkmark-outline' as const,
    question: 'How does KYC verification work?',
    answer: 'Go to Security in your Profile. We use Stripe Identity to verify your identity for creating pools and withdrawing funds.',
  },
  {
    icon: 'repeat-outline' as const,
    question: 'Can I set up automatic contributions?',
    answer: 'Yes! Go to a pool\'s details and set up recurring contributions (weekly, monthly, or quarterly).',
  },
  {
    icon: 'bag-handle-outline' as const,
    question: 'How does Spend Now work?',
    answer: 'Browse partnered merchants and pay directly from your pool funds or wallet balance.',
  },
  {
    icon: 'lock-closed-outline' as const,
    question: 'Is my money safe?',
    answer: 'Yes. Funds are held securely and all transactions are encrypted. We use Stripe for payment processing.',
  },
];

export default function HelpCenterScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Ionicons name="help-buoy-outline" size={48} color={colors.mint} />
          <Text style={[styles.title, { color: colors.text }]}>Help Center</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Find answers to commonly asked questions
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>FREQUENTLY ASKED QUESTIONS</Text>

        {FAQ_ITEMS.map((item, index) => (
          <View key={index} style={[styles.faqItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <TouchableOpacity
              style={styles.faqHeader}
              onPress={() => toggleExpand(index)}
              activeOpacity={0.7}
              data-testid={`button-faq-${index}`}
            >
              <View style={[styles.faqIconCircle, { backgroundColor: `${colors.mint}1A` }]}>
                <Ionicons name={item.icon} size={20} color={colors.mint} />
              </View>
              <Text style={[styles.faqQuestion, { color: colors.text }]}>{item.question}</Text>
              <Ionicons
                name={expandedIndex === index ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            {expandedIndex === index && (
              <View style={[styles.faqAnswer, { borderTopColor: colors.cardBorder }]}>
                <Text style={[styles.faqAnswerText, { color: colors.textSecondary }]}>{item.answer}</Text>
              </View>
            )}
          </View>
        ))}

        <View style={[styles.helpBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Ionicons name="chatbubbles-outline" size={32} color={colors.mint} />
          <Text style={[styles.helpBoxTitle, { color: colors.text }]}>Still need help?</Text>
          <Text style={[styles.helpBoxText, { color: colors.textSecondary }]}>
            Our support team is ready to assist you.
          </Text>
          <TouchableOpacity
            style={[styles.contactButton, { backgroundColor: colors.mint }]}
            onPress={() => navigation.navigate('Contact')}
            data-testid="button-contact-us"
          >
            <Ionicons name="mail-outline" size={18} color="#001F3F" />
            <Text style={styles.contactButtonText}>Contact Us</Text>
          </TouchableOpacity>
        </View>
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
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  faqItem: {
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  faqIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqQuestion: {
    flex: 1,
    marginLeft: 14,
    fontSize: 15,
    fontWeight: '500',
  },
  faqAnswer: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    marginHorizontal: 14,
  },
  faqAnswerText: {
    fontSize: 14,
    lineHeight: 22,
  },
  helpBox: {
    alignItems: 'center',
    borderRadius: 16,
    padding: 24,
    marginTop: 20,
    borderWidth: 1,
  },
  helpBoxTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  helpBoxText: {
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  contactButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#001F3F',
  },
});
