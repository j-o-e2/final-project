"use client"

import Link from "next/link"

export default function TermsPage() {
  return (
    <div className="min-h-screen flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-3xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Terms &amp; Conditions</h1>
          <p className="text-sm text-muted-foreground mt-2">Last updated: Dec 18, 2025</p>
        </div>

        <div className="prose prose-invert bg-card/50 p-6 rounded-lg border border-border">
          <h2>Overview</h2>
          <p>
            These Terms govern your access to and use of LocalFix Kenya. By using our services you agree to these Terms.
          </p>

          <h2>Payments &amp; Fees</h2>
          <p>
            LocalFix Kenya facilitates bookings and job approvals. The platform charges a service fee of <strong>10%</strong> on payments processed through the platform, which is deducted from the payment made to service providers.
          </p>

          <h2>Refunds</h2>
          <p>
            Payments are <strong>non-refundable by default</strong>. Refunds may be issued at the sole discretion of LocalFix Kenya in limited circumstances (for example, double-charges, payment processor errors, or verified service non-delivery). Requests for refunds should be made via our support channels and will be evaluated case-by-case.
          </p>

          <h2>No Direct User-to-User Transfers</h2>
          <p>
            LocalFix Kenya does not enable direct peer-to-peer monetary transfers between users. All payments processed by the platform are subject to our fees and policies.
          </p>

          <h2>Accounts</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account and for all activities that occur under your account.
          </p>

          <h2>Liability</h2>
          <p>
            To the maximum extent permitted by law, LocalFix Kenya is not liable for indirect, incidental, special, consequential or punitive damages arising from your use of the service.
          </p>

          <h2>Dispute Resolution</h2>
          <p>
            If you have a dispute with another user, please contact support. We may at our discretion assist in resolving disputes but are not responsible for user conduct.
          </p>

          <h2>Contact</h2>
          <p>
            For questions about these Terms contact us at <a href="mailto:support@localfix.example">support@localfix.example</a>.
          </p>

          <div className="mt-6 text-sm text-muted-foreground">
            <p>
              <strong>Legal review recommended:</strong> This page contains a short-form summary. Please consult legal counsel before relying on these Terms in production.
            </p>
            <p className="mt-4">
              <Link href="/" className="text-primary hover:text-primary/80">Back to home</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
