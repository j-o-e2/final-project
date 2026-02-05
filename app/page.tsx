"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Shield, Users, TrendingUp, Briefcase, Lock, Zap, Globe, CheckCircle2 } from "lucide-react"

export default function Home() {
  return (
    <div className="relative w-full min-h-screen bg-background text-foreground overflow-hidden">
      <div className="relative z-10 w-full">
        {/* Navigation */}
        <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-primary-foreground font-bold text-lg">L</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg text-foreground">LocalFix Kenya</span>
              <span className="text-xs text-muted-foreground">Rural Opportunities Connected</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <Link href="/login">
              <Button variant="ghost" className="text-foreground hover:bg-muted px-2 py-1">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md px-3 sm:px-4 py-1">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left: Text Content */}
          <div className="flex flex-col justify-center">

            <div className="inline-flex items-center gap-2 bg-secondary/20 text-secondary-foreground px-4 py-2 rounded-full w-fit mb-6">
              <Globe className="w-4 h-4" />
              <span className="text-sm font-medium">Empowering Rural Communities</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              <span className="text-primary">Hire Trusted Local Workers</span>
              <br />
              <span className="text-foreground">Fast, Reliable, and Near You</span>
            </h1>

            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Connect with skilled electricians, plumbers, builders, cleaners, and more in just minutes. Post a job, get matched, and get your work done with confidence.
            </p>
            
            <div className="flex gap-4 flex-wrap mb-10 justify-center">
              <Link href="/jobs">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg text-base px-4 sm:px-8 py-3 sm:py-6">
                  <Briefcase className="w-5 h-5 mr-2" />
                  Find Jobs Now
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="lg" variant="outline" className="border-2 border-accent text-accent hover:bg-accent/10 shadow-lg text-base px-4 sm:px-8 py-3 sm:py-6">
                  <Users className="w-5 h-5 mr-2" />
                  Post a Job
                </Button>
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                <span>100% transparent & verified opportunities</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Lock className="w-5 h-5 text-primary flex-shrink-0" />
                <span>Your data is secure & protected</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Zap className="w-5 h-5 text-primary flex-shrink-0" />
                <span>Simple, fast, no hidden fees</span>
              </div>
            </div>
          </div>

          {/* Right: Hero Image */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
            <Image
              src="/localworker.png"
              alt="Rural workers connecting to opportunities"
              width={550}
              height={550}
              className="relative rounded-2xl shadow-2xl object-cover w-full h-auto"
              priority
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-primary/5 py-12 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">5,000+</div>
              <p className="text-muted-foreground">Active Workers</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-accent mb-2">2,000+</div>
              <p className="text-muted-foreground">Jobs Posted</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-secondary mb-2">98%</div>
              <p className="text-muted-foreground">Success Rate</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">47</div>
              <p className="text-muted-foreground">Counties Covered</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">Why Choose LocalFix Kenya?</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We're built for rural workers, employers, and communities. Here's what makes us different.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Empowerment */}
          <Card className="p-8 bg-card border border-border shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 group">
            <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
              <TrendingUp className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-3">Fair Opportunity</h3>
            <p className="text-muted-foreground leading-relaxed">
              Access verified job opportunities with fair wages and transparent terms. No exploitation, just real growth for rural workers.
            </p>
          </Card>

          {/* Connectivity */}
          <Card className="p-8 bg-card border border-border shadow-sm hover:shadow-lg hover:border-accent/30 transition-all duration-300 group">
            <div className="w-14 h-14 bg-accent/10 rounded-lg flex items-center justify-center mb-6 group-hover:bg-accent/20 transition-colors">
              <Globe className="w-7 h-7 text-accent" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-3">Easy Connection</h3>
            <p className="text-muted-foreground leading-relaxed">
              Simple, intuitive design that works on any device. Technology that bridges distance and connects you to opportunity.
            </p>
          </Card>

          {/* Trust & Security */}
          <Card className="p-8 bg-card border border-border shadow-sm hover:shadow-lg hover:border-secondary/30 transition-all duration-300 group">
            <div className="w-14 h-14 bg-secondary/10 rounded-lg flex items-center justify-center mb-6 group-hover:bg-secondary/20 transition-colors">
              <Shield className="w-7 h-7 text-secondary" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-3">Trusted & Secure</h3>
            <p className="text-muted-foreground leading-relaxed">
              Your data is protected with enterprise-grade security. Verified employers and transparent processes for peace of mind.
            </p>
          </Card>

          {/* Community */}
          <Card className="p-8 bg-card border border-border shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 group">
            <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
              <Users className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-3">Community First</h3>
            <p className="text-muted-foreground leading-relaxed">
              Built for rural communities, by people who understand your needs. Supporting local economies and sustainable growth.
            </p>
          </Card>

          {/* Support */}
          <Card className="p-8 bg-card border border-border shadow-sm hover:shadow-lg hover:border-accent/30 transition-all duration-300 group">
            <div className="w-14 h-14 bg-accent/10 rounded-lg flex items-center justify-center mb-6 group-hover:bg-accent/20 transition-colors">
              <Zap className="w-7 h-7 text-accent" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-3">Real Support</h3>
            <p className="text-muted-foreground leading-relaxed">
              Dedicated support team ready to help. From sign-up to payment, we're here to make it simple and stress-free.
            </p>
          </Card>

          {/* Transparency */}
          <Card className="p-8 bg-card border border-border shadow-sm hover:shadow-lg hover:border-secondary/30 transition-all duration-300 group">
            <div className="w-14 h-14 bg-secondary/10 rounded-lg flex items-center justify-center mb-6 group-hover:bg-secondary/20 transition-colors">
              <Lock className="w-7 h-7 text-secondary" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-3">100% Transparent</h3>
            <p className="text-muted-foreground leading-relaxed">
              No hidden fees, no surprises. See exactly what you'll earn before you apply. Complete transparency, always.
            </p>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-muted/50 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-foreground mb-16 text-center">How It Works</h2>
          
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: "1", title: "Sign Up", desc: "Create a free account in minutes" },
              { step: "2", title: "Find Jobs", desc: "Browse verified opportunities near you" },
              { step: "3", title: "Apply", desc: "Submit your profile and skills" },
              { step: "4", title: "Earn", desc: "Get hired and earn fair compensation" },
            ].map((item, idx) => (
              <div key={idx} className="relative">
                <div className="bg-card p-8 rounded-lg border border-border text-center h-full">
                  <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
                {idx < 3 && (
                  <div className="hidden md:block absolute top-1/4 -right-3 w-6 h-1 bg-primary/30"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="bg-gradient-to-br from-primary via-primary/80 to-accent rounded-3xl p-12 md:p-16 text-center shadow-2xl border border-primary/20">
          <h2 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-6">
            Ready to Transform Your Future?
          </h2>
          <p className="text-primary-foreground/90 mb-10 text-lg md:text-xl max-w-2xl mx-auto">
            Join thousands of rural workers who've found fair opportunities and built sustainable careers through LocalFix Kenya.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-lg text-base px-8 py-6 font-semibold">
                Get Started Free
              </Button>
            </Link>
            <Link href="/jobs">
              <Button size="lg" variant="outline" className="border-2 border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10 shadow-lg text-base px-8 py-6 font-semibold">
                Explore Jobs
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white text-card py-16 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-bold">L</span>
                </div>
                <span className="font-bold">LocalFix Kenya</span>
              </div>
              <p className="text-card/70 text-sm">Empowering rural workers through technology and fair opportunity.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">For Workers</h3>
              <ul className="space-y-2 text-card/70 text-sm">
                <li><Link href="/jobs" className="hover:text-card transition-colors">Find Jobs</Link></li>
                <li><Link href="/services" className="hover:text-card transition-colors">Offer Services</Link></li>
                <li><Link href="/profile" className="hover:text-card transition-colors">My Profile</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">For Employers</h3>
              <ul className="space-y-2 text-card/70 text-sm">
                <li><Link href="/jobs/post" className="hover:text-card transition-colors">Post a Job</Link></li>
                <li><Link href="/dashboard/client" className="hover:text-card transition-colors">Employer Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-card/70 text-sm">
                <li>
                  <div className="font-medium">Contact</div>
                  <div className="text-card/70 text-sm break-words">
                    <div>Email: <a href="mailto:kararijoel13@gmail.com" className="hover:text-card transition-colors">kararijoel13@gmail.com</a></div>
                    <div>Phone: <a href="tel:+254741597088" className="hover:text-card transition-colors">0741597088</a></div>
                  </div>
                </li>
                <li><Link href="#" className="hover:text-card transition-colors">FAQ</Link></li>
                <li><Link href="#" className="hover:text-card transition-colors">Privacy</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-card/20 pt-8 text-center text-card/60 text-sm">
            <p>&copy; 2025 LocalFix Kenya. Empowering Rural Communities | All rights reserved.</p>
          </div>
        </div>
      </footer>
      </div>
    </div>
  )
}
