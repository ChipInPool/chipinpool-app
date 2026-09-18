import { useState } from "react";
import { PublicLayout as Layout } from "@/components/public-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Mail, MessageSquare, HelpCircle, Shield, Loader2 } from "lucide-react";

const contactOptions = [
  {
    icon: HelpCircle,
    title: "General Inquiries",
    description: "Questions about ChipInPool, features, or how to get started",
    email: "mail@chipinpool.com",
  },
  {
    icon: Shield,
    title: "Security",
    description: "Report security vulnerabilities or concerns",
    email: "mail@chipinpool.com",
  },
  {
    icon: MessageSquare,
    title: "Press & Media",
    description: "Press inquiries and partnership opportunities",
    email: "mail@chipinpool.com",
  },
];

export default function Contact() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: "Message Sent!",
      description: "We'll get back to you within 1-2 business days.",
    });
    
    setFormData({ name: "", email: "", subject: "", message: "" });
    setIsSubmitting(false);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-6 md:py-12 px-1 sm:px-0">
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-2xl md:text-4xl font-display font-bold mb-3 md:mb-4">Contact Us</h1>
          <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Have a question or feedback? We'd love to hear from you.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-8 md:mb-12">
          {contactOptions.map((option, index) => (
            <Card key={index} className="bg-card/50 border-white/10 hover:border-primary/30 transition-colors">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <option.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{option.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">{option.description}</p>
                <a 
                  href={`mailto:${option.email}`} 
                  className="text-sm text-primary hover:underline"
                  data-testid={`link-contact-email-${index}`}
                >
                  {option.email}
                </a>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-card/50 border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Send Us a Message
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Your Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    data-testid="input-contact-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    data-testid="input-contact-email"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="How can we help?"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                  data-testid="input-contact-subject"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Tell us more..."
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                  className="resize-none"
                  data-testid="input-contact-message"
                />
              </div>
              <Button type="submit" disabled={isSubmitting} data-testid="button-contact-submit">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Message"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>We typically respond within 1-2 business days.</p>
        </div>
      </div>
    </Layout>
  );
}
