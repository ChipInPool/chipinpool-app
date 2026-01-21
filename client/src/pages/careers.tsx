import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";

export default function Careers() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-display font-bold mb-4">Join Our Team</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Help us build the future of social payments. We're looking for passionate people who want to make a difference.
          </p>
        </div>

        <div className="bg-gradient-to-r from-primary/10 to-blue-500/10 rounded-2xl p-8 mb-12">
          <h2 className="text-2xl font-semibold mb-4">Why ChipIn?</h2>
          <p className="text-muted-foreground leading-relaxed">
            We're a small but mighty team tackling big problems in the fintech space. At ChipIn, you'll have the opportunity to work on products that directly impact how millions of people manage money together. We value creativity, ownership, and a bias for action.
          </p>
        </div>

        <div className="bg-card/50 border border-white/10 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-semibold mb-3">Interested in joining us?</h2>
          <p className="text-muted-foreground mb-6">
            We're always looking for talented people. Send us your resume and tell us how you'd contribute to ChipIn.
          </p>
          <Button onClick={() => window.location.href = 'mailto:mail@chipinpool.com?subject=General Application'} data-testid="button-general-application">
            Send General Application
          </Button>
        </div>
      </div>
    </Layout>
  );
}
