import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto max-w-3xl px-4">
        <Link href="/" className="text-muted-foreground hover:text-foreground mb-8 inline-block text-sm">
          ← Back to Home
        </Link>
        
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last Updated: 2026-06-25</p>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">1. Agreement to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using WorkflowGuard, you agree to be bound by these Terms of Service. 
              If you do not agree, do not use our services.
            </p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">2. Account</h2>
            <p className="text-muted-foreground mb-3">You are responsible for:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Maintaining the confidentiality of your account credentials.</li>
              <li>All activities that occur under your account.</li>
              <li>Complying with applicable laws and regulations.</li>
            </ul>
          </section>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">3. Service Description</h2>
            <p className="text-muted-foreground mb-3">WorkflowGuard provides:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>AI-powered workflow automation with human approval gates.</li>
              <li>Full audit trails for all agent executions.</li>
              <li>Template library and custom workflow creation.</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              <strong>AI Disclaimer:</strong> AI-generated outputs are provided for assistance only. 
              Users are responsible for verifying and approving all AI outputs before they affect 
              downstream systems or decisions.
            </p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">4. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              WorkflowGuard is provided "as is" without warranties. We are not liable for any damages 
              arising from the use of AI-generated content, third-party integrations, or service interruptions.
            </p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">5. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to terminate or suspend your account for violations of these terms, 
              illegal activities, or at our discretion with 30 days notice.
            </p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">6. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These terms are governed by the laws of the jurisdiction in which WorkflowGuard operates. 
              Any disputes shall be resolved through arbitration.
            </p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">7. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these Terms, contact us at legal@workflowguard.dev.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
