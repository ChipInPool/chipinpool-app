import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Privacy() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-8">
        <Card className="bg-card/50 border-white/10">
          <CardHeader>
            <CardTitle className="text-3xl font-display">Privacy Policy</CardTitle>
            <p className="text-muted-foreground">Last updated: January 2026</p>
          </CardHeader>
          <CardContent className="prose prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
              <p className="text-muted-foreground leading-relaxed">
                We collect information you provide directly, including your name, email address, phone number, date of birth, and identity verification documents. We also collect usage data, device information, and transaction history to provide and improve our services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                We use your information to provide ChipIn services, process transactions, verify your identity, prevent fraud, communicate with you, and comply with legal obligations. We may also use aggregated, anonymized data for analytics and service improvement.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Information Sharing</h2>
              <p className="text-muted-foreground leading-relaxed">
                We share your information with service providers who help us operate ChipIn, including payment processors (Stripe), banking partners, identity verification services, and communication providers. We may also share information when required by law or to protect our rights.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Financial Data</h2>
              <p className="text-muted-foreground leading-relaxed">
                When you link bank accounts through Plaid, we receive account and transaction information necessary to provide our services. We do not store your bank login credentials. Payment card data is securely handled by our PCI-compliant partners.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Data Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                We implement industry-standard security measures to protect your personal information, including encryption, secure servers, and access controls. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Data Retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                We retain your information for as long as your account is active or as needed to provide services. We may retain certain information longer to comply with legal obligations, resolve disputes, and enforce our agreements. Financial records are retained as required by applicable regulations.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Your Rights</h2>
              <p className="text-muted-foreground leading-relaxed">
                You have the right to access, correct, or delete your personal information. You can update your account information through the app settings. To request data deletion, please contact our support team. Note that some information may be retained for legal or legitimate business purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Cookies and Tracking</h2>
              <p className="text-muted-foreground leading-relaxed">
                We use cookies and similar technologies to maintain your session, remember preferences, and analyze usage patterns. You can control cookie settings through your browser, though disabling cookies may affect functionality.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Children's Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                ChipIn is not intended for users under 18 years of age. We do not knowingly collect personal information from children. If we learn that we have collected information from a child, we will delete it promptly.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. International Users</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your information may be transferred to and processed in countries other than your own. By using ChipIn, you consent to such transfers. We take steps to ensure your data is protected in accordance with this policy regardless of where it is processed.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">11. Changes to This Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy periodically. We will notify you of material changes via email or through the Service. Your continued use of ChipIn after changes take effect constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">12. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions about this Privacy Policy or our data practices, please contact us through the app or at privacy@chipin.com.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
