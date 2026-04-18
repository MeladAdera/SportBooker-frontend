/**
 * Build a WhatsApp "click to chat" URL from a phone string (E.164 or other).
 * @see https://faq.whatsapp.com/5913398998672934
 */
export function getWhatsAppMeUrl(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return null;
  return `https://wa.me/${digits}`;
}
