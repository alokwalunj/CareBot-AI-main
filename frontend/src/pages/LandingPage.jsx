import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  MessageCircle, 
  Calendar, 
  Shield, 
  Clock, 
  Stethoscope,
  ArrowRight,
  CheckCircle2,
  Heart
} from "lucide-react";

const LandingPage = () => {
  const features = [
    {
      icon: MessageCircle,
      title: "AI Symptom Analysis",
      description: "Describe your symptoms in plain language and get intelligent guidance on next steps."
    },
    {
      icon: Shield,
      title: "Safe & Confidential",
      description: "Your health data is protected. We follow strict privacy guidelines."
    },
    {
      icon: Calendar,
      title: "Easy Booking",
      description: "Book appointments with qualified doctors directly through the platform."
    },
    {
      icon: Clock,
      title: "24/7 Available",
      description: "Get health guidance anytime, day or night, whenever you need it."
    }
  ];

  const steps = [
    {
      number: "01",
      title: "Describe Symptoms",
      description: "Tell CareBot how you're feeling in your own words"
    },
    {
      number: "02",
      title: "Get Assessment",
      description: "Receive an AI-powered analysis of your symptoms"
    },
    {
      number: "03",
      title: "Take Action",
      description: "Get guidance or book a doctor appointment if needed"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="text-xl font-bold text-foreground">CareBot</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost" data-testid="nav-login-btn">
                Sign In
              </Button>
            </Link>
            <Link to="/register">
              <Button className="rounded-full px-6" data-testid="nav-register-btn">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-gradient pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
                <Stethoscope className="w-4 h-4" />
                AI-Powered Healthcare Assistant
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground leading-tight">
                Your Health Questions,
                <span className="text-primary block mt-2">Answered Instantly</span>
              </h1>
              
              <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
                CareBot helps you understand your symptoms, provides trusted guidance, 
                and connects you with healthcare professionals when you need them.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Link to="/register">
                  <Button size="lg" className="rounded-full px-8 btn-hover-lift" data-testid="hero-get-started-btn">
                    Start Free Consultation
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline" className="rounded-full px-8" data-testid="hero-login-btn">
                    I Have an Account
                  </Button>
                </Link>
              </div>
              
              <div className="flex items-center gap-6 pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  No diagnosis claims
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  Doctor referrals
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  24/7 available
                </div>
              </div>
            </div>
            
            <div className="relative hidden lg:block">
              <div className="absolute -inset-4 bg-primary/10 rounded-3xl blur-3xl"></div>
              <img 
                src="https://images.pexels.com/photos/5215017/pexels-photo-5215017.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="Healthcare professional"
                className="relative rounded-3xl shadow-2xl w-full object-cover aspect-[4/5]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6 bg-card">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
              Healthcare Made Simple
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Get the right guidance at the right time, without the wait
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="p-6 rounded-2xl bg-background border border-border/50 hover:shadow-lg transition-all duration-300"
                data-testid={`feature-card-${index}`}
              >
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground text-lg">
              Three simple steps to better health guidance
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative" data-testid={`step-card-${index}`}>
                <div className="text-7xl font-bold text-primary/10 absolute -top-4 left-0">
                  {step.number}
                </div>
                <div className="pt-12 pl-4">
                  <h3 className="font-semibold text-xl mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Take Control of Your Health?
          </h2>
          <p className="text-primary-foreground/80 text-lg mb-8 max-w-2xl mx-auto">
            Start your free consultation now. No credit card required. 
            Get instant guidance on your health concerns.
          </p>
          <Link to="/register">
            <Button 
              size="lg" 
              variant="secondary" 
              className="rounded-full px-10 text-lg"
              data-testid="cta-get-started-btn"
            >
              Get Started Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-card border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Heart className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">CareBot</span>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              CareBot provides health guidance only. Always consult a healthcare professional for medical advice.
            </p>
            <p className="text-sm text-muted-foreground">
              © 2025 CareBot. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
