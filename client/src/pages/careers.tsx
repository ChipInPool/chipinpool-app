import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, MapPin, Clock, Heart, Zap, Users, Coffee } from "lucide-react";

const openPositions = [
  {
    title: "Senior Backend Engineer",
    department: "Engineering",
    location: "Remote",
    type: "Full-time",
    description: "Build scalable payment infrastructure and APIs that power millions of transactions.",
  },
  {
    title: "Product Designer",
    department: "Design",
    location: "Remote",
    type: "Full-time",
    description: "Create intuitive, delightful experiences for our mobile and web applications.",
  },
  {
    title: "Growth Marketing Manager",
    department: "Marketing",
    location: "Remote",
    type: "Full-time",
    description: "Drive user acquisition and engagement through creative marketing strategies.",
  },
  {
    title: "Customer Success Lead",
    department: "Operations",
    location: "Remote",
    type: "Full-time",
    description: "Help our users get the most out of ChipIn and build lasting relationships.",
  },
];

const benefits = [
  { icon: Heart, title: "Health & Wellness", description: "Comprehensive health, dental, and vision insurance" },
  { icon: Zap, title: "Flexible Work", description: "Work from anywhere with flexible hours" },
  { icon: Users, title: "Team Retreats", description: "Annual company retreats to connect in person" },
  { icon: Coffee, title: "Learning Budget", description: "$2,000 annual budget for courses and conferences" },
];

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
          <p className="text-muted-foreground leading-relaxed mb-6">
            We're a small but mighty team tackling big problems in the fintech space. At ChipIn, you'll have the opportunity to work on products that directly impact how millions of people manage money together. We value creativity, ownership, and a bias for action.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">{benefit.title}</h4>
                  <p className="text-xs text-muted-foreground">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <h2 className="text-2xl font-semibold mb-6">Open Positions</h2>
        <div className="space-y-4 mb-12">
          {openPositions.map((position, index) => (
            <Card key={index} className="bg-card/50 border-white/10 hover:border-primary/30 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{position.title}</CardTitle>
                    <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-4 h-4" />
                        {position.department}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {position.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {position.type}
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                    Hiring
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{position.description}</p>
                <Button 
                  variant="outline" 
                  className="border-white/10"
                  onClick={() => window.location.href = `mailto:mail@chipinpool.com?subject=Application: ${position.title}`}
                  data-testid={`button-apply-${index}`}
                >
                  Apply Now
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="bg-card/50 border border-white/10 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-semibold mb-3">Don't see the right role?</h2>
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
