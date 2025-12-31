/**
 * Valid ISO 4217 currency codes
 * Source: https://www.iso.org/iso-4217-currency-codes.html
 * Updated: 2024
 */
export const ISO_4217_CODES = new Set([
  // Major currencies
  'USD', // United States Dollar
  'EUR', // Euro
  'GBP', // British Pound Sterling
  'JPY', // Japanese Yen
  'CHF', // Swiss Franc
  'CAD', // Canadian Dollar
  'AUD', // Australian Dollar
  'NZD', // New Zealand Dollar
  'CNY', // Chinese Yuan
  'HKD', // Hong Kong Dollar
  'SGD', // Singapore Dollar
  'SEK', // Swedish Krona
  'NOK', // Norwegian Krone
  'DKK', // Danish Krone
  'KRW', // South Korean Won
  'INR', // Indian Rupee
  'MXN', // Mexican Peso
  'BRL', // Brazilian Real
  'ZAR', // South African Rand
  'RUB', // Russian Ruble
  'TRY', // Turkish Lira
  'PLN', // Polish Zloty
  'THB', // Thai Baht
  'IDR', // Indonesian Rupiah
  'MYR', // Malaysian Ringgit
  'PHP', // Philippine Peso
  'CZK', // Czech Koruna
  'ILS', // Israeli New Shekel
  'CLP', // Chilean Peso
  'AED', // United Arab Emirates Dirham
  'COP', // Colombian Peso
  'SAR', // Saudi Riyal
  'TWD', // New Taiwan Dollar
  'ARS', // Argentine Peso
  'RON', // Romanian Leu
  'HUF', // Hungarian Forint

  // European currencies
  'ISK', // Icelandic Króna
  'HRK', // Croatian Kuna
  'BGN', // Bulgarian Lev
  'RSD', // Serbian Dinar
  'UAH', // Ukrainian Hryvnia
  'BAM', // Bosnia and Herzegovina Convertible Mark
  'MKD', // Macedonian Denar
  'ALL', // Albanian Lek
  'MDL', // Moldovan Leu
  'GEL', // Georgian Lari
  'AMD', // Armenian Dram
  'AZN', // Azerbaijani Manat
  'BYN', // Belarusian Ruble

  // Middle East & Africa
  'EGP', // Egyptian Pound
  'NGN', // Nigerian Naira
  'KES', // Kenyan Shilling
  'GHS', // Ghanaian Cedi
  'MAD', // Moroccan Dirham
  'TND', // Tunisian Dinar
  'UGX', // Ugandan Shilling
  'TZS', // Tanzanian Shilling
  'ETB', // Ethiopian Birr
  'XOF', // West African CFA Franc
  'XAF', // Central African CFA Franc
  'ZMW', // Zambian Kwacha
  'MWK', // Malawian Kwacha
  'BWP', // Botswana Pula
  'MUR', // Mauritian Rupee
  'SCR', // Seychellois Rupee
  'JOD', // Jordanian Dinar
  'KWD', // Kuwaiti Dinar
  'BHD', // Bahraini Dinar
  'OMR', // Omani Rial
  'QAR', // Qatari Riyal
  'IQD', // Iraqi Dinar
  'LBP', // Lebanese Pound
  'SYP', // Syrian Pound
  'YER', // Yemeni Rial

  // Asia-Pacific
  'VND', // Vietnamese Dong
  'BDT', // Bangladeshi Taka
  'PKR', // Pakistani Rupee
  'LKR', // Sri Lankan Rupee
  'NPR', // Nepalese Rupee
  'MMK', // Myanmar Kyat
  'KHR', // Cambodian Riel
  'LAK', // Lao Kip
  'BND', // Brunei Dollar
  'FJD', // Fijian Dollar
  'PGK', // Papua New Guinean Kina
  'WST', // Samoan Tala
  'TOP', // Tongan Paʻanga
  'VUV', // Vanuatu Vatu
  'SBD', // Solomon Islands Dollar
  'MNT', // Mongolian Tugrik
  'KZT', // Kazakhstani Tenge
  'UZS', // Uzbekistani Som
  'KGS', // Kyrgyzstani Som
  'TJS', // Tajikistani Somoni
  'TMT', // Turkmenistani Manat
  'AFN', // Afghan Afghani
  'IRR', // Iranian Rial

  // Americas
  'PEN', // Peruvian Sol
  'UYU', // Uruguayan Peso
  'PYG', // Paraguayan Guarani
  'BOB', // Bolivian Boliviano
  'VES', // Venezuelan Bolívar
  'CRC', // Costa Rican Colón
  'GTQ', // Guatemalan Quetzal
  'HNL', // Honduran Lempira
  'NIO', // Nicaraguan Córdoba
  'PAB', // Panamanian Balboa
  'DOP', // Dominican Peso
  'JMD', // Jamaican Dollar
  'TTD', // Trinidad and Tobago Dollar
  'BBD', // Barbadian Dollar
  'BSD', // Bahamian Dollar
  'BZD', // Belize Dollar
  'XCD', // East Caribbean Dollar
  'HTG', // Haitian Gourde
  'AWG', // Aruban Florin
  'ANG', // Netherlands Antillean Guilder
  'SRD', // Surinamese Dollar
  'GYD', // Guyanese Dollar

  // Other
  'XDR', // Special Drawing Rights (IMF)
  'XAU', // Gold (troy ounce)
  'XAG', // Silver (troy ounce)
  'XPT', // Platinum (troy ounce)
  'XPD', // Palladium (troy ounce)
]);

/**
 * Check if a currency code is a valid ISO 4217 code
 */
export function isValidISO4217Code(code: string): boolean {
  return ISO_4217_CODES.has(code.toUpperCase());
}

/**
 * Get all valid ISO 4217 currency codes as an array
 */
export function getAllISO4217Codes(): string[] {
  return Array.from(ISO_4217_CODES).sort();
}
