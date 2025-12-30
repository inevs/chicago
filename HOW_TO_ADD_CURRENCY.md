# How to Add a New Currency

## Quick Start Guide

### Step 1: Open the Currency Dialog

1. Look at the top-right corner of the application
2. Click the blue **"Neu"** button
3. A dropdown menu will appear
4. Click on **"Neue Währung"** (it has a purple dollar icon)

```
┌─────────────────────────────────────────────────────────┐
│  [1M] [1J] [5J] [Max]     [☀️]   [Neu ▼]                │
│                                      │                   │
│                                      ├─ Neues Wertpapier│
│                                      ├─ Neue Buchung    │
│                                      ├─ Neue Wertpapier-│
│                                      │   Transaktion     │
│                                      ├─ Neue Währung ⭐  │
│                                      ├───────────────────│
│                                      ├─ Daten exportieren│
│                                      └─ Daten importieren│
└─────────────────────────────────────────────────────────┘
```

### Step 2: Fill in the Currency Details

A modal dialog will appear with two fields:

**ISO-Code (3 Buchstaben)**
- Enter the 3-letter ISO 4217 currency code
- Examples: `CHF`, `SEK`, `NOK`, `DKK`, `JPY`
- It will automatically convert to uppercase as you type
- Must be a valid ISO 4217 code

**Name**
- Enter the full name of the currency
- Examples:
  - `Schweizer Franken` (for CHF)
  - `Schwedische Krone` (for SEK)
  - `Norwegische Krone` (for NOK)
  - `Japanischer Yen` (for JPY)

### Step 3: Submit

Click the green **"Hinzufügen"** button at the bottom of the modal.

### Step 4: Success!

- A success message will appear
- The modal will close automatically
- Your new currency is now available in all currency dropdowns throughout the app

## Examples of Common Currencies

| Code | Name (German) | Name (English) |
|------|---------------|----------------|
| CHF | Schweizer Franken | Swiss Franc |
| SEK | Schwedische Krone | Swedish Krona |
| NOK | Norwegische Krone | Norwegian Krone |
| DKK | Dänische Krone | Danish Krone |
| JPY | Japanischer Yen | Japanese Yen |
| CNY | Chinesischer Yuan | Chinese Yuan |
| HKD | Hongkong-Dollar | Hong Kong Dollar |
| SGD | Singapur-Dollar | Singapore Dollar |
| AUD | Australischer Dollar | Australian Dollar |
| CAD | Kanadischer Dollar | Canadian Dollar |
| NZD | Neuseeland-Dollar | New Zealand Dollar |
| PLN | Polnischer Zloty | Polish Zloty |
| CZK | Tschechische Krone | Czech Koruna |
| HUF | Ungarischer Forint | Hungarian Forint |
| RON | Rumänischer Leu | Romanian Leu |
| BGN | Bulgarischer Lew | Bulgarian Lev |
| HRK | Kroatische Kuna | Croatian Kuna |
| RUB | Russischer Rubel | Russian Ruble |
| TRY | Türkische Lira | Turkish Lira |
| ZAR | Südafrikanischer Rand | South African Rand |
| BRL | Brasilianischer Real | Brazilian Real |
| MXN | Mexikanischer Peso | Mexican Peso |
| ARS | Argentinischer Peso | Argentine Peso |
| CLP | Chilenischer Peso | Chilean Peso |
| INR | Indische Rupie | Indian Rupee |
| KRW | Südkoreanischer Won | South Korean Won |
| THB | Thailändischer Baht | Thai Baht |
| IDR | Indonesische Rupiah | Indonesian Rupiah |
| MYR | Malaysischer Ringgit | Malaysian Ringgit |
| PHP | Philippinischer Peso | Philippine Peso |
| VND | Vietnamesischer Dong | Vietnamese Dong |

## Error Messages

### "ISO-Code muss genau 3 Buchstaben lang sein"
- You entered fewer or more than 3 characters
- Solution: Enter exactly 3 letters (e.g., CHF, USD, EUR)

### "ISO-Code darf nur Buchstaben enthalten"
- You entered numbers or special characters
- Solution: Use only letters A-Z (e.g., USD, not U$D)

### "Bitte geben Sie einen Namen ein"
- The name field is empty
- Solution: Enter the full currency name

### "Currency code must be a valid ISO 4217 code"
- The code you entered is not a recognized ISO 4217 currency code
- Solution: Check the ISO 4217 currency code list and enter a valid code
- Common mistake: Entering "XXX" or made-up codes

### "Currency with code XXX already exists"
- This currency has already been added to the system
- Solution: Use the existing currency or check if you meant a different code

## Tips

1. **Use Official Codes**: Always use the official ISO 4217 3-letter code
2. **Check Existing Currencies**: Before adding, check if the currency already exists
3. **Uppercase Automatic**: Don't worry about uppercase - it's handled automatically
4. **Full Names**: Use the full currency name in German for consistency
5. **Dark Mode**: The modal works in both light and dark mode

## Finding ISO 4217 Codes

If you're unsure about a currency code:
1. Search online for "ISO 4217 currency codes"
2. Check the backend file: `apps/api/src/app/currencies/constants/iso-4217-codes.ts`
3. Most currencies follow a pattern:
   - First 2 letters = country code (CH for Switzerland)
   - Last letter = currency initial (F for Franc)
   - Example: CHF = Switzerland Franc

## Need Help?

- Check the complete list of supported currencies in the backend
- Contact your system administrator if you need a currency that's not in the ISO 4217 list
- Report any bugs or issues through the application's feedback system
