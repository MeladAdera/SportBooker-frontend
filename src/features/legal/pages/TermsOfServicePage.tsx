import { LegalDocumentLayout } from '@/features/legal/components/LegalDocumentLayout';

export function TermsOfServicePage() {
  return (
    <LegalDocumentLayout
      title="Terms of Service"
      lastUpdated="April 19, 2026"
      intro={[
        'These Terms of Service govern your use of SportBooker, including all web features provided to players, operators, and platform administrators.',
        'By creating an account or using the service, you agree to follow these Terms and applicable laws.',
      ]}
      sections={[
        {
          title: '1. Accounts and eligibility',
          paragraphs: [
            'You must provide accurate registration information and keep account credentials confidential. You are responsible for actions performed through your account.',
            'Tenants may set additional membership requirements for their communities. Accounts may be suspended for fraud, abuse, or repeated policy violations.',
          ],
        },
        {
          title: '2. Multi-tenant service model',
          paragraphs: [
            'SportBooker provides shared infrastructure and product capabilities. Each tenant operator manages local match rules, pricing, cancellations, and community moderation within the platform.',
            'Tenant-specific policies may apply in addition to these Terms. Where tenant rules conflict with mandatory law, applicable law prevails.',
          ],
        },
        {
          title: '3. Acceptable use',
          paragraphs: [
            'You agree not to misuse the service, attempt unauthorized access, disrupt availability, submit false bookings, harass users, or upload unlawful content.',
            'Automated scraping, credential stuffing, reverse engineering for abuse, and bypassing access controls are strictly prohibited.',
          ],
        },
        {
          title: '4. Bookings, wallet, and payments',
          paragraphs: [
            'Bookings and wallet balances are subject to availability, tenant configuration, and payment authorization. Confirmed actions are recorded in your account history.',
            'Refunds, credits, and cancellation windows can vary by tenant policy and payment provider constraints.',
          ],
        },
        {
          title: '5. Service availability and changes',
          paragraphs: [
            'We continuously improve the platform and may update features, UX, or security mechanisms. We may apply maintenance windows, rate limits, and anti-abuse controls to protect service quality.',
            'Temporary interruptions can occur due to maintenance, infrastructure incidents, or third-party dependency failures.',
          ],
        },
        {
          title: '6. Intellectual property',
          paragraphs: [
            'SportBooker software, branding, and platform content are protected by intellectual property laws. You may not copy, resell, or distribute protected materials except as permitted by law or written authorization.',
          ],
        },
        {
          title: '7. Termination',
          paragraphs: [
            'You may stop using the service at any time. We may suspend or terminate access for serious violations, legal requirements, or risks to platform integrity and user safety.',
          ],
        },
      ]}
    />
  );
}
