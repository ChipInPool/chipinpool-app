import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';

function Section({ title, children, colors }: { title: string; children: React.ReactNode; colors: any }) {
  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.mint, marginBottom: 8 }}>{title}</Text>
      {children}
    </View>
  );
}

function Body({ children, colors }: { children: React.ReactNode; colors: any }) {
  return (
    <Text style={{ fontSize: 15, color: colors.text, lineHeight: 22 }}>{children}</Text>
  );
}

export default function TermsScreen() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={{ fontSize: 26, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>Terms of Service</Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 24 }}>Last updated: January 1, 2026</Text>

        <Section title="1. Acceptance of Terms" colors={colors}>
          <Body colors={colors}>
            By accessing or using ChipInPool ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the Service. Your continued use of ChipInPool constitutes acceptance of any updates or modifications to these terms.
          </Body>
        </Section>

        <Section title="2. Description of Service" colors={colors}>
          <Body colors={colors}>
            ChipInPool is a financial technology platform that enables users to pool funds together for shared purposes. Our services include fund pooling, virtual card issuance, and group payment management. Users can create pools, invite contributors, and spend pooled funds through virtual Visa cards or direct transfers.
          </Body>
        </Section>

        <Section title="3. User Accounts & Registration" colors={colors}>
          <Body colors={colors}>
            To use ChipInPool, you must create an account and provide accurate, complete information. You must be at least 18 years old to register. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
          </Body>
        </Section>

        <Section title="4. Wallet & Payments" colors={colors}>
          <Body colors={colors}>
            Funds held in your ChipInPool wallet are maintained by our banking partner and are not FDIC insured. ChipInPool is not a bank and does not provide banking services directly. Payment processing times may vary depending on the payment method used. Bank transfers typically take 1–3 business days, while card payments are processed in real time. You acknowledge that ChipInPool may hold funds temporarily for verification or compliance purposes.
          </Body>
        </Section>

        <Section title="5. Pool Rules" colors={colors}>
          <Body colors={colors}>
            Pool creators are responsible for setting pool terms, managing contributors, and ensuring proper use of pooled funds. Contributors have the right to view pool activity and transaction history. Pool creators may set spending limits and approve or deny withdrawal requests. Contributors may leave a pool at any time, subject to any refund policies set by the pool creator. ChipInPool is not responsible for disputes between pool members.
          </Body>
        </Section>

        <Section title="6. Virtual Cards" colors={colors}>
          <Body colors={colors}>
            ChipInPool issues virtual Visa cards linked to specific pools. These cards can be used for online and in-store purchases wherever Visa is accepted. Spending limits are determined by the pool balance and any limits set by the pool creator. Virtual cards are subject to Visa's terms and conditions. ChipInPool reserves the right to freeze or cancel a virtual card if suspicious activity is detected.
          </Body>
        </Section>

        <Section title="7. Prohibited Activities" colors={colors}>
          <Body colors={colors}>
            You may not use ChipInPool for any illegal or unauthorized purpose, including but not limited to: money laundering, fraud, financing of terrorism, purchasing prohibited goods or services, circumventing financial regulations, or any activity that violates applicable local, state, national, or international law. Violation of these terms may result in immediate account termination and referral to law enforcement.
          </Body>
        </Section>

        <Section title="8. Limitation of Liability" colors={colors}>
          <Body colors={colors}>
            ChipInPool and its affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the Service. Our total liability shall not exceed the amount of fees paid by you to ChipInPool in the twelve months preceding the claim. This limitation applies to the fullest extent permitted by applicable law.
          </Body>
        </Section>

        <Section title="9. Changes to Terms" colors={colors}>
          <Body colors={colors}>
            ChipInPool reserves the right to modify these Terms of Service at any time. We will notify users of material changes via email or in-app notification at least 30 days before the changes take effect. Your continued use of the Service after such changes constitutes acceptance of the updated terms.
          </Body>
        </Section>

        <Section title="10. Contact Information" colors={colors}>
          <Body colors={colors}>
            If you have questions about these Terms of Service, please contact us at support@chipinpool.com. Our support team is available Monday through Friday, 9 AM to 6 PM EST.
          </Body>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}
