export type PhoneCode = {
  country: string;
  iso: string;
  dialCode: string;
  flag: string;
};

/** Converts an ISO 3166-1 alpha-2 code to its flag emoji. */
function f(iso: string): string {
  return [...iso.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('');
}

export const PHONE_CODES: readonly PhoneCode[] = [
  // ── GCC / Middle East (top of list) ──────────────────────────────────────
  {
    country: 'United Arab Emirates',
    iso: 'AE',
    dialCode: '+971',
    flag: f('AE'),
  },
  { country: 'Saudi Arabia', iso: 'SA', dialCode: '+966', flag: f('SA') },
  { country: 'Kuwait', iso: 'KW', dialCode: '+965', flag: f('KW') },
  { country: 'Bahrain', iso: 'BH', dialCode: '+973', flag: f('BH') },
  { country: 'Qatar', iso: 'QA', dialCode: '+974', flag: f('QA') },
  { country: 'Oman', iso: 'OM', dialCode: '+968', flag: f('OM') },
  { country: 'Jordan', iso: 'JO', dialCode: '+962', flag: f('JO') },
  { country: 'Egypt', iso: 'EG', dialCode: '+20', flag: f('EG') },
  { country: 'Lebanon', iso: 'LB', dialCode: '+961', flag: f('LB') },
  { country: 'Iraq', iso: 'IQ', dialCode: '+964', flag: f('IQ') },
  { country: 'Syria', iso: 'SY', dialCode: '+963', flag: f('SY') },
  { country: 'Yemen', iso: 'YE', dialCode: '+967', flag: f('YE') },
  { country: 'Palestine', iso: 'PS', dialCode: '+970', flag: f('PS') },
  { country: 'Morocco', iso: 'MA', dialCode: '+212', flag: f('MA') },
  { country: 'Tunisia', iso: 'TN', dialCode: '+216', flag: f('TN') },
  { country: 'Algeria', iso: 'DZ', dialCode: '+213', flag: f('DZ') },
  { country: 'Libya', iso: 'LY', dialCode: '+218', flag: f('LY') },
  { country: 'Sudan', iso: 'SD', dialCode: '+249', flag: f('SD') },
  { country: 'Turkey', iso: 'TR', dialCode: '+90', flag: f('TR') },
  // ── South & South-East Asia ───────────────────────────────────────────────
  { country: 'India', iso: 'IN', dialCode: '+91', flag: f('IN') },
  { country: 'Pakistan', iso: 'PK', dialCode: '+92', flag: f('PK') },
  { country: 'Bangladesh', iso: 'BD', dialCode: '+880', flag: f('BD') },
  { country: 'Sri Lanka', iso: 'LK', dialCode: '+94', flag: f('LK') },
  { country: 'Nepal', iso: 'NP', dialCode: '+977', flag: f('NP') },
  { country: 'Philippines', iso: 'PH', dialCode: '+63', flag: f('PH') },
  { country: 'Indonesia', iso: 'ID', dialCode: '+62', flag: f('ID') },
  { country: 'Malaysia', iso: 'MY', dialCode: '+60', flag: f('MY') },
  { country: 'Singapore', iso: 'SG', dialCode: '+65', flag: f('SG') },
  // ── East Asia ─────────────────────────────────────────────────────────────
  { country: 'China', iso: 'CN', dialCode: '+86', flag: f('CN') },
  { country: 'Japan', iso: 'JP', dialCode: '+81', flag: f('JP') },
  { country: 'South Korea', iso: 'KR', dialCode: '+82', flag: f('KR') },
  // ── Europe ────────────────────────────────────────────────────────────────
  { country: 'United Kingdom', iso: 'GB', dialCode: '+44', flag: f('GB') },
  { country: 'France', iso: 'FR', dialCode: '+33', flag: f('FR') },
  { country: 'Germany', iso: 'DE', dialCode: '+49', flag: f('DE') },
  { country: 'Italy', iso: 'IT', dialCode: '+39', flag: f('IT') },
  { country: 'Spain', iso: 'ES', dialCode: '+34', flag: f('ES') },
  { country: 'Netherlands', iso: 'NL', dialCode: '+31', flag: f('NL') },
  { country: 'Belgium', iso: 'BE', dialCode: '+32', flag: f('BE') },
  { country: 'Switzerland', iso: 'CH', dialCode: '+41', flag: f('CH') },
  { country: 'Austria', iso: 'AT', dialCode: '+43', flag: f('AT') },
  { country: 'Sweden', iso: 'SE', dialCode: '+46', flag: f('SE') },
  { country: 'Norway', iso: 'NO', dialCode: '+47', flag: f('NO') },
  { country: 'Denmark', iso: 'DK', dialCode: '+45', flag: f('DK') },
  { country: 'Finland', iso: 'FI', dialCode: '+358', flag: f('FI') },
  { country: 'Poland', iso: 'PL', dialCode: '+48', flag: f('PL') },
  { country: 'Russia', iso: 'RU', dialCode: '+7', flag: f('RU') },
  { country: 'Greece', iso: 'GR', dialCode: '+30', flag: f('GR') },
  { country: 'Portugal', iso: 'PT', dialCode: '+351', flag: f('PT') },
  // ── Americas ──────────────────────────────────────────────────────────────
  { country: 'United States', iso: 'US', dialCode: '+1', flag: f('US') },
  { country: 'Canada', iso: 'CA', dialCode: '+1', flag: f('CA') },
  { country: 'Brazil', iso: 'BR', dialCode: '+55', flag: f('BR') },
  { country: 'Argentina', iso: 'AR', dialCode: '+54', flag: f('AR') },
  { country: 'Mexico', iso: 'MX', dialCode: '+52', flag: f('MX') },
  { country: 'Colombia', iso: 'CO', dialCode: '+57', flag: f('CO') },
  // ── Africa ────────────────────────────────────────────────────────────────
  { country: 'South Africa', iso: 'ZA', dialCode: '+27', flag: f('ZA') },
  { country: 'Nigeria', iso: 'NG', dialCode: '+234', flag: f('NG') },
  { country: 'Kenya', iso: 'KE', dialCode: '+254', flag: f('KE') },
  { country: 'Ghana', iso: 'GH', dialCode: '+233', flag: f('GH') },
  { country: 'Ethiopia', iso: 'ET', dialCode: '+251', flag: f('ET') },
  // ── Oceania ───────────────────────────────────────────────────────────────
  { country: 'Australia', iso: 'AU', dialCode: '+61', flag: f('AU') },
  { country: 'New Zealand', iso: 'NZ', dialCode: '+64', flag: f('NZ') },
] as const;

/** UAE is the default country code. */
export const DEFAULT_PHONE_CODE = PHONE_CODES.find((c) => c.iso === 'AE')!;

/**
 * Given a full E.164-like value (e.g. "+97152 855 6635"), returns the
 * matching PhoneCode entry (longest match wins) and the local portion.
 */
export function parsePhone(value: string): {
  code: PhoneCode;
  local: string;
} {
  if (value) {
    const match = [...PHONE_CODES]
      .filter((c) => value.startsWith(c.dialCode))
      .sort((a, b) => b.dialCode.length - a.dialCode.length)[0];
    if (match) {
      return { code: match, local: value.slice(match.dialCode.length) };
    }
  }
  return { code: DEFAULT_PHONE_CODE, local: '' };
}
