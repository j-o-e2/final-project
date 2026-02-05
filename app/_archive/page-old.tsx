"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Zap, Shield, Users, TrendingUp, Briefcase, Laptop, Coffee, BarChart, Users as UsersIcon } from "lucide-react"

export default function Home() {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">L</span>
            </div>
            <span className="font-bold text-xl text-foreground">LocalFix Kenya</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-foreground hover:bg-muted">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section with Image */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Text Content */}
          <div className="flex flex-col justify-center">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Connecting Rural Workers to Jobs
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8">
              LocalFix Kenya connects skilled rural workers with job opportunities. Find work on your terms, build your career, and transform your community.
            </p>
            <div className="flex gap-4 flex-wrap">
              <Link href="/jobs">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-4 rounded-lg shadow-lg transform transition-transform hover:scale-105">
                  Find Jobs
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary/10 text-lg px-8 py-4 rounded-lg shadow-lg transform transition-transform hover:scale-105">
                  Post a Job
                </Button>
              </Link>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative">
            <Image
              src="/hero-rural-workers.jpg"
              alt="Rural workers - connecting to jobs"
              width={500}
              height={500}
              className="rounded-lg shadow-2xl object-cover w-full"
              priority
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-muted/50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-foreground mb-12 text-center">Why Choose LocalFix Kenya?</h2>
          <div className="grid md:grid-cols-4 gap-8">
            <Card className="p-6 bg-card border-border shadow-sm hover:shadow-md transition-shadow">
              <Shield className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Verified Opportunities</h3>
              <p className="text-muted-foreground">All job postings are verified for legitimacy and reliability</p>
            </Card>
            <Card className="p-6 bg-card border-border shadow-sm hover:shadow-md transition-shadow">
              <Users className="w-12 h-12 text-accent mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Direct Connection</h3>
              <p className="text-muted-foreground">Connect directly with employers and service providers</p>
            </Card>
            <Card className="p-6 bg-card border-border shadow-sm hover:shadow-md transition-shadow">
              <TrendingUp className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Career Growth</h3>
              <p className="text-muted-foreground">Build skills and advance your career with quality opportunities</p>
            </Card>
            <Card className="p-6 bg-card border-border shadow-sm hover:shadow-md transition-shadow">
              <Briefcase className="w-12 h-12 text-accent mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Fair Rates</h3>
              <p className="text-muted-foreground">Earn fair compensation for your work and expertise</p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-r from-primary to-accent rounded-lg p-12 text-center shadow-2xl">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">Ready to Transform Your Work?</h2>
          <p className="text-primary-foreground/90 mb-8 text-lg md:text-xl">
            Join thousands of rural workers connecting to opportunities across Kenya
          </p>
          <Link href="/signup">
            <Button size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 text-lg px-8 py-4 rounded-lg shadow-lg transform transition-transform hover:scale-105">
              Get Started Today
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-card py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold mb-4">LocalFix Kenya</h3>
              <p className="text-card/80">Connecting rural workers to opportunities</p>
            </div>
            <div>
              <h3 className="font-bold mb-4">For Workers</h3>
              <ul className="space-y-2 text-card/80">
                <li><Link href="/jobs" className="hover:text-card">Find Jobs</Link></li>
                <li><Link href="/services" className="hover:text-card">Offer Services</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">For Employers</h3>
              <ul className="space-y-2 text-card/80">
                <li><Link href="/dashboard/admin" className="hover:text-card">Post a Job</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Support</h3>
              <ul className="space-y-2 text-card/80">
                <li><a href="mailto:support@localfixkenya.com" className="hover:text-card">Contact Us</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-card/20 pt-8 text-center text-card/60">
            <p>&copy; 2025 LocalFix Kenya. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
