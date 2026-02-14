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

export default function PrivacyScreen() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={{ fontSize: 26, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>Privacy Policy</Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 24 }}>Last updated: January 1, 2026</Text>

        <Section title="1. Information We Collect" colors={colors}>
          <Body colors={colors}>
            We collect information you provide directly, including personal information (name, email address, phone number, date of birth), financial data (bank account details, payment card information, transaction history), and device information (device type, operating system, unique device identifiers, IP address, and app usage data). We may also collect location data when you use certain features of the Service.
          </Body>
        </Section>

        <Section title="2. How We Use Your Information" colors={colors}>
          <Body colors={colors}>
            We use your information to provide and improve our services, process transactions, verify your identity, prevent fraud, comply with legal obligations, communicate with you about your account and service updates, personalize your experience, and conduct analytics to improve ChipInPool. We may also use aggregated, anonymized data for research and product development.
          </Body>
        </Section>

        <Section title="3. Data Sharing" colors={colors}>
          <Body colors={colors}>
            We share your data with trusted third-party service providers who assist in operating our platform. These include Stripe for payment processing and virtual card issuance, Plaid for secure bank account linking and verification, and ClickSend for SMS notifications and verification messages. We may also share data with regulatory authorities as required by law. We do not sell your personal information to third parties.
          </Body>
        </Section>

        <Section title="4. Data Security" colors={colors}>
          <Body colors={colors}>
            We implement industry-standard security measures to protect your data, including end-to-end encryption for data in transit, AES-256 encryption for data at rest, secure storage of sensitive credentials using tokenization, regular security audits and penetration testing, and multi-factor authentication for account access. While we strive to protect your information, no method of electronic storage is 100% secure.
          </Body>
        </Section>

        <Section title="5. Your Rights" colors={colors}>
          <Body colors={colors}>
            You have the right to access your personal data and request a copy of the information we hold about you. You may request deletion of your personal data, subject to legal retention requirements. You have the right to data portability and can request your data in a machine-readable format. You may opt out of marketing communications at any time. To exercise any of these rights, please contact us at privacy@chipinpool.com.
          </Body>
        </Section>

        <Section title="6. Cookie Policy" colors={colors}>
          <Body colors={colors}>
            Our mobile application and website use cookies and similar technologies to enhance your experience, remember your preferences, and analyze usage patterns. Essential cookies are required for the Service to function properly. Analytics cookies help us understand how users interact with ChipInPool. You can manage cookie preferences through your device or browser settings.
          </Body>
        </Section>

        <Section title="7. Children's Privacy" colors={colors}>
          <Body colors={colors}>
            ChipInPool is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that a child under 18 has provided us with personal information, we will take steps to delete such information promptly. If you believe a child has provided us with their data, please contact us immediately.
          </Body>
        </Section>

        <Section title="8. Changes to Policy" colors={colors}>
          <Body colors={colors}>
            We may update this Privacy Policy from time to time to reflect changes in our practices, technology, or legal requirements. We will notify you of any material changes by posting the updated policy within the app and sending you an email notification. We encourage you to review this policy periodically for the latest information on our privacy practices.
          </Body>
        </Section>

        <Section title="9. Contact Information" colors={colors}>
          <Body colors={colors}>
            If you have questions or concerns about this Privacy Policy or our data practices, please contact our privacy team at privacy@chipinpool.com. You may also write to us at ChipInPool, Inc., Attn: Privacy Team. We will respond to your inquiry within 30 days.
          </Body>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}
