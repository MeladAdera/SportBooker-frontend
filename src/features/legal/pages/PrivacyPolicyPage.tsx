import { LegalDocumentLayout } from '@/features/legal/components/LegalDocumentLayout';

export function PrivacyPolicyPage() {
  return (
    <LegalDocumentLayout
      title="Privacy Policy"
      lastUpdated="April 19, 2026"
      intro={[
        'This Privacy Policy explains how SportBooker and the tenant clubs or organizations using SportBooker collect and use personal data when you create an account, browse matches, make bookings, and manage payments.',
        'SportBooker is a multi-tenant platform. Your selected tenant (club/operator) manages its community and booking operations, while SportBooker provides the shared technical infrastructure and security controls that run the service.',
      ]}
      sections={[
        {
          title: '1. Data we collect',
          paragraphs: [
            'We collect account data such as name, email, phone number, password hash, preferred language, and optional profile details (for example playing position, skill level, nationality, and date of birth if you provide them).',
            'We also collect booking and activity data such as matches viewed, reservations, cancellations, wallet transactions, and tenant interactions required to operate scheduling and account history.',
          ],
        },
        {
          title: '2. How we use data',
          paragraphs: [
            'We use your data to authenticate your account, deliver core features, prevent abuse, process support requests, send transactional messages (verification, password reset, and booking status), and maintain platform reliability.',
            'We do not use your account data for unrelated advertising. Operational analytics may be used to improve performance, reliability, and product quality.',
          ],
        },
        {
          title: '3. Payments and financial data',
          paragraphs: [
            'Top-up and payment operations are handled by integrated payment providers. SportBooker does not store full card numbers or CVV values on this application.',
            'Payment providers process financial information under their own compliance obligations and privacy terms.',
          ],
        },
        {
          title: '4. Sharing and disclosure',
          paragraphs: [
            'Data is shared only with the tenant you are using and with service providers required to operate the platform (for example cloud hosting, email delivery, and payment processors).',
            'We may disclose data when required by law, legal process, or to protect users, tenants, and platform security.',
          ],
        },
        {
          title: '5. Security and retention',
          paragraphs: [
            'We apply technical and organizational safeguards such as authenticated access controls, role-based permissions, and monitored infrastructure. No internet service can be guaranteed as 100% secure.',
            'Personal data is retained only as long as needed for service operation, legal obligations, dispute resolution, fraud prevention, and legitimate audit needs.',
          ],
        },
        {
          title: '6. Your choices and rights',
          paragraphs: [
            'You can access and update profile data from your account where available. You may request correction, deletion, or export by contacting your tenant operator or support channels provided in the app.',
            'If local law provides additional rights (such as objection or restriction), requests will be handled in accordance with applicable data protection laws.',
          ],
        },
        {
          title: '7. International processing',
          paragraphs: [
            'SportBooker services may process data in multiple regions where infrastructure or providers operate. Appropriate safeguards are applied when cross-border transfers are required.',
          ],
        },
      ]}
    />
  );
}
