import { LegalDocumentLayout } from '@/features/legal/components/LegalDocumentLayout';

export function DisclaimerPage() {
  return (
    <LegalDocumentLayout
      title="Disclaimer and Limitation of Liability"
      lastUpdated="April 19, 2026"
      intro={[
        'This disclaimer clarifies operational boundaries for SportBooker and tenant operators.',
        'By using the platform, you acknowledge the following limitations.',
      ]}
      sections={[
        {
          title: '1. Informational use',
          paragraphs: [
            'Match listings, schedules, pricing, and availability are provided by tenants and may change due to venue, organizer, or participant constraints.',
            'Users should confirm critical details directly with the tenant when timing or attendance is sensitive.',
          ],
        },
        {
          title: '2. No professional advice',
          paragraphs: [
            'SportBooker does not provide medical, legal, tax, financial, or coaching advice. Any in-app content is for general service operation and communication only.',
          ],
        },
        {
          title: '3. As-is service',
          paragraphs: [
            'The platform is provided on an "as is" and "as available" basis. While we aim for high reliability, we do not guarantee uninterrupted operation, error-free behavior, or perfect compatibility with all devices and networks.',
          ],
        },
        {
          title: '4. Third-party services',
          paragraphs: [
            'SportBooker relies on external providers for infrastructure, email delivery, and payment processing. We are not responsible for outages or data handling practices that are solely controlled by those providers.',
          ],
        },
        {
          title: '5. Liability limits',
          paragraphs: [
            'To the maximum extent permitted by law, SportBooker and tenant operators are not liable for indirect, incidental, special, consequential, or punitive damages arising from use of the platform.',
            'Where liability cannot be excluded by law, it is limited to the amount you paid for the specific affected service during the twelve months before the event giving rise to the claim.',
          ],
        },
        {
          title: '6. User responsibility',
          paragraphs: [
            'You are responsible for account security, accurate profile details, lawful use of features, and compliance with tenant-specific participation rules.',
          ],
        },
      ]}
    />
  );
}
