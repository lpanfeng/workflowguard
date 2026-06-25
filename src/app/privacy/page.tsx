import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto max-w-3xl px-4">
        <Link href="/" className="text-muted-foreground hover:text-foreground mb-8 inline-block text-sm">
          ← Back to Home
        </Link>
        
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last Updated: 2026-06-25</p>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              WorkflowGuard ("we", "our", "us") is committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your 
              information when you use our platform.
            </p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
            <p className="text-muted-foreground mb-3">We collect information in the following categories:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Account Information:</strong> Name, email address, and password when you register.</li>
              <li><strong>Workflow Data:</strong> Workflows, tasks, templates, and configurations you create.</li>
              <li><strong>Audit Logs:</strong> Records of actions taken within the platform, including approvals, rejections, and execution history.</li>
              <li><strong>Usage Data:</strong> Pages visited, features used, and interaction patterns to improve our service.</li>
              <li><strong>Technical Data:</strong> IP address, browser type, device information, and cookies.</li>
            </ul>
          </section>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use the collected information to: (a) operate and maintain the platform; 
              (b) process your workflows and tasks; (c) send you technical notifications; 
              (d) monitor and analyze usage trends; (e) detect and prevent fraud or security incidents.
            </p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">4. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use cookies and similar tracking technologies to track activity on our platform. 
              You can set your browser to refuse cookies, but some features may not work properly.
            </p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">5. Your Rights (GDPR)</h2>
            <p className="text-muted-foreground mb-3">Under GDPR and other privacy laws, you have the right to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Access:</strong> Request a copy of your personal data.</li>
              <li><strong>Correct:</strong> Request correction of inaccurate data.</li>
              <li><strong>Delete:</strong> Request deletion of your personal data.</li>
              <li><strong>Export:</strong> Download your data in a machine-readable format.</li>
              <li><strong>Object:</strong> Object to processing of your data for certain purposes.</li>
            </ul>
          </section>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">6. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement industry-standard security measures to protect your data, including encryption 
              in transit (TLS) and at rest. However, no method of transmission over the Internet is 100% secure.
            </p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">7. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about this Privacy Policy, please contact us at privacy@workflowguard.dev.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
