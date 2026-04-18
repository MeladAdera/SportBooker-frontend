import { useTranslation } from 'react-i18next';
import { SiWhatsapp } from 'react-icons/si';

import { buttonVariants } from '@/components/ui/button';
import { getWhatsAppMeUrl } from '@/lib/whatsapp';
import { cn } from '@/lib/utils';

type WhatsAppContactButtonProps = {
  phone: string;
  className?: string;
};

/**
 * Icon link to open WhatsApp chat (wa.me) for an E.164 or similar phone value.
 * Renders nothing if the number cannot be turned into a valid wa.me target.
 */
export function WhatsAppContactButton({
  phone,
  className,
}: WhatsAppContactButtonProps) {
  const { t } = useTranslation('operator');
  const url = getWhatsAppMeUrl(phone);
  if (!url) return null;

  const label = t('players.detail.whatsappChat');

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      aria-label={label}
      className={cn(
        buttonVariants({ variant: 'outline', size: 'icon' }),
        'size-8 shrink-0',
        className,
      )}
    >
      <SiWhatsapp className="size-4 text-[#25D366]" aria-hidden />
    </a>
  );
}
