import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const faqs = [
  {
    category: "Getting Started",
    questions: [
      {
        q: "What is ChipIn?",
        a: "ChipIn is a social payments platform that makes it easy to pool funds with friends, family, or groups. You can create pools for trips, gifts, shared expenses, or any group goal, invite others to contribute, and spend the collected funds using virtual cards.",
      },
      {
        q: "How do I create an account?",
        a: "Sign up with your email, phone number, and basic information. You'll verify your phone via SMS code, and then you can optionally complete identity verification to unlock all features like creating pools and getting virtual cards.",
      },
      {
        q: "Is ChipIn free to use?",
        a: "Creating an account and joining pools is free. We charge a small fee on certain transactions like card spending. All fees are clearly shown before you confirm any action.",
      },
    ],
  },
  {
    category: "Pools & Contributions",
    questions: [
      {
        q: "How do I create a pool?",
        a: "After verifying your identity, tap 'Create Pool', set a goal amount, deadline, and description. You can then invite friends via email, SMS, or by sharing a link.",
      },
      {
        q: "Can I contribute to a pool without an account?",
        a: "Yes! If someone shares a pool link with you, you can make a one-time contribution as a guest using your email and payment method.",
      },
      {
        q: "What happens when a pool reaches its goal?",
        a: "You'll be notified when your pool hits its target. The pool creator can then request a virtual card to spend the funds, or continue collecting if the group wants to exceed the goal.",
      },
      {
        q: "Can I set up recurring contributions?",
        a: "Yes! When contributing to a pool, you can choose to make it a recurring payment (weekly, monthly, or quarterly). You can manage all your recurring contributions from the Recurring page.",
      },
    ],
  },
  {
    category: "Virtual Cards",
    questions: [
      {
        q: "What are virtual cards?",
        a: "Virtual cards are digital Visa cards linked to your pool's funds. You can use them to shop online or add them to Apple Pay/Google Pay for in-store purchases.",
      },
      {
        q: "How do I get a virtual card?",
        a: "Once your pool has funds and you've completed identity verification, you can request a virtual card from the pool details page. Cards are issued instantly.",
      },
      {
        q: "Are virtual cards secure?",
        a: "Yes! Each card has unique numbers and can be frozen or deleted instantly. Cards are issued by our banking partner through Stripe, meeting the highest security standards.",
      },
    ],
  },
  {
    category: "Security & Privacy",
    questions: [
      {
        q: "How is my money protected?",
        a: "Your funds are held by our licensed banking partners. We use bank-level encryption, and all payment processing goes through Stripe, a trusted payment infrastructure provider.",
      },
      {
        q: "What is identity verification (KYC)?",
        a: "To comply with financial regulations and prevent fraud, we verify your identity using Stripe Identity. This involves uploading a government ID and taking a selfie. The process takes just a few minutes.",
      },
      {
        q: "Who can see my contributions?",
        a: "Pool members can see who contributed and how much, unless the pool creator enables anonymous contributions. Your personal financial details like bank accounts are never shared.",
      },
    ],
  },
  {
    category: "Payments & Fees",
    questions: [
      {
        q: "How do I add money to contribute?",
        a: "You can contribute using a credit card, debit card, or linked bank account. Just enter your payment details when making a contribution.",
      },
      {
        q: "Can I withdraw money from a pool?",
        a: "Pool funds can be spent using virtual cards or transferred to the pool creator's linked bank account. Individual contributors cannot withdraw their contributions once made.",
      },
      {
        q: "What are the fees?",
        a: "Contributing to pools is free. We charge a small percentage on card transactions. All applicable fees are shown before you confirm any transaction.",
      },
    ],
  },
];

export default function FAQ() {
  const [search, setSearch] = useState("");
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (key: string) => {
    const newOpen = new Set(openItems);
    if (newOpen.has(key)) {
      newOpen.delete(key);
    } else {
      newOpen.add(key);
    }
    setOpenItems(newOpen);
  };

  const filteredFaqs = faqs.map(category => ({
    ...category,
    questions: category.questions.filter(
      q => q.q.toLowerCase().includes(search.toLowerCase()) || 
           q.a.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(category => category.questions.length > 0);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-display font-bold mb-4">Frequently Asked Questions</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Find answers to common questions about ChipIn.
          </p>
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search questions..."
              className="pl-10 bg-white/5 border-white/10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-faq-search"
            />
          </div>
        </div>

        <div className="space-y-8">
          {filteredFaqs.map((category, catIndex) => (
            <div key={catIndex}>
              <h2 className="text-lg font-semibold mb-4 text-primary">{category.category}</h2>
              <div className="space-y-2">
                {category.questions.map((item, qIndex) => {
                  const key = `${catIndex}-${qIndex}`;
                  const isOpen = openItems.has(key);
                  return (
                    <Card key={key} className="bg-card/50 border-white/10">
                      <button
                        onClick={() => toggleItem(key)}
                        className="w-full px-6 py-4 flex items-center justify-between text-left"
                        data-testid={`button-faq-${catIndex}-${qIndex}`}
                      >
                        <span className="font-medium pr-4">{item.q}</span>
                        <ChevronDown className={`w-5 h-5 flex-shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isOpen && (
                        <CardContent className="pt-0 pb-4 px-6">
                          <p className="text-muted-foreground leading-relaxed">{item.a}</p>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {filteredFaqs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No questions found matching "{search}"</p>
          </div>
        )}

        <div className="mt-12 bg-gradient-to-r from-primary/10 to-blue-500/10 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-semibold mb-3">Still have questions?</h2>
          <p className="text-muted-foreground mb-6">
            Can't find what you're looking for? Our team is here to help.
          </p>
          <a 
            href="/contact" 
            className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            data-testid="link-faq-contact"
          >
            Contact Support
          </a>
        </div>
      </div>
    </Layout>
  );
}
