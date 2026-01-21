import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Terms() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-8">
        <Card className="bg-card/50 border-white/10">
          <CardHeader>
            <CardTitle className="text-3xl font-display">Terms of Service</CardTitle>
            <p className="text-muted-foreground">Last updated: January 2026</p>
          </CardHeader>
          <CardContent className="prose prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using ChipIn ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service. You must be at least 18 years old to use ChipIn.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
              <p className="text-muted-foreground leading-relaxed">
                ChipIn is a social payments and fund pooling platform that allows users to create pools for shared expenses, contribute funds, and spend collected funds via virtual cards. The Service facilitates group payments for trips, gifts, purchases, events, and recurring expenses.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Account Registration</h2>
              <p className="text-muted-foreground leading-relaxed">
                To use ChipIn, you must create an account by providing accurate and complete information including your legal name, email address, phone number, and date of birth. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Identity Verification</h2>
              <p className="text-muted-foreground leading-relaxed">
                To access certain features such as creating pools and using virtual cards, you may be required to complete identity verification (KYC). This process is conducted through our partner, Stripe, and is necessary to comply with financial regulations and prevent fraud.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Financial Services</h2>
              <p className="text-muted-foreground leading-relaxed">
                ChipIn partners with licensed financial institutions to provide payment services. Virtual cards are issued by our banking partners through Stripe Issuing. By using these services, you also agree to the terms of our financial partners.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. User Conduct</h2>
              <p className="text-muted-foreground leading-relaxed">
                You agree not to use ChipIn for any unlawful purpose, including but not limited to money laundering, fraud, or financing illegal activities. We reserve the right to suspend or terminate accounts that violate these terms or engage in suspicious activity.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Fees</h2>
              <p className="text-muted-foreground leading-relaxed">
                ChipIn may charge fees for certain services. Any applicable fees will be clearly disclosed before you complete a transaction. We reserve the right to modify our fee structure with advance notice to users.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                ChipIn is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the Service. Our total liability shall not exceed the fees paid by you in the twelve months preceding the claim.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Dispute Resolution</h2>
              <p className="text-muted-foreground leading-relaxed">
                Any disputes arising from these terms or your use of ChipIn shall be resolved through binding arbitration in accordance with applicable laws. You agree to waive your right to participate in class action lawsuits.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update these Terms of Service from time to time. We will notify you of material changes via email or through the Service. Your continued use of ChipIn after changes take effect constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">11. Contact</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions about these Terms of Service, please contact us through the app or at mail@chipinpool.com.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
