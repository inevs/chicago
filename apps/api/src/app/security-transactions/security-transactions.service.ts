import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SecurityTransactionsRepository } from './security-transactions.repository';
import { SecuritiesRepository } from '../securities/securities.repository';
import { CurrenciesRepository } from '../currencies/currencies.repository';
import { CreateSecurityTransactionDto } from './dto/create-security-transaction.dto';
import { UpdateSecurityTransactionDto } from './dto/update-security-transaction.dto';
import { SecurityTransaction, ImportTransactionsCsvResponse, ImportTransactionResult, TransactionType } from '@dividends/shared';
import { parse } from 'csv-parse/sync';
import { CsvSecurityTransactionRow, UploadedFile } from './dto/import-security-transactions-csv.dto';

@Injectable()
export class SecurityTransactionsService {
  constructor(
    private readonly securityTransactionsRepository: SecurityTransactionsRepository,
    private readonly securitiesRepository: SecuritiesRepository,
    private readonly currenciesRepository: CurrenciesRepository
  ) {}

  async createSecurityTransaction(
    dto: CreateSecurityTransactionDto
  ): Promise<SecurityTransaction> {
    // Validate that security exists
    await this.ensureSecurityExists(dto.securityId);
    await this.ensureCurrencyExists(dto.currency);

    // Create security transaction
    const transaction = await this.securityTransactionsRepository.create({
      date: new Date(dto.date),
      type: dto.type,
      securityId: dto.securityId,
      quantity: dto.quantity,
      pricePerShare: dto.pricePerShare,
      fees: dto.fees,
      currency: dto.currency,
      exchangeRate: dto.exchangeRate,
      totalValue: dto.totalValue,
      note: dto.note,
    });

    return transaction as unknown as SecurityTransaction;
  }

  async getAllSecurityTransactions(): Promise<SecurityTransaction[]> {
    const transactions = await this.securityTransactionsRepository.findAll();

    return transactions as unknown as SecurityTransaction[];
  }

  async getSecurityTransactionById(id: string): Promise<SecurityTransaction> {
    const transaction =
      await this.securityTransactionsRepository.findByIdWithSecurity(id);

    if (!transaction) {
      throw new NotFoundException('Security transaction not found');
    }

    return transaction as unknown as SecurityTransaction;
  }

  async getSecurityTransactionsBySecurityId(
    securityId: string
  ): Promise<SecurityTransaction[]> {
    const transactions =
      await this.securityTransactionsRepository.findBySecurityId(securityId);

    return transactions as unknown as SecurityTransaction[];
  }

  async getSecurityTransactionsByType(
    type: 'BUY' | 'SELL'
  ): Promise<SecurityTransaction[]> {
    const transactions = await this.securityTransactionsRepository.findByType(type);

    return transactions as unknown as SecurityTransaction[];
  }

  async getSecurityTransactionsByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<SecurityTransaction[]> {
    const transactions = await this.securityTransactionsRepository.findByDateRange(
      startDate,
      endDate
    );

    return transactions as unknown as SecurityTransaction[];
  }

  async updateSecurityTransaction(
    id: string,
    dto: UpdateSecurityTransactionDto
  ): Promise<SecurityTransaction> {
    // Check if security transaction exists
    const existing = await this.securityTransactionsRepository.findById(id);

    if (!existing) {
      throw new NotFoundException('Security transaction not found');
    }

    // If securityId is being updated, validate that the new security exists
    if (dto.securityId && dto.securityId !== existing.securityId) {
      await this.ensureSecurityExists(dto.securityId);
    }

    if (dto.currency && dto.currency !== existing.currency) {
      await this.ensureCurrencyExists(dto.currency);
    }

    // Update security transaction
    const transaction = await this.securityTransactionsRepository.update(id, {
      ...(dto.date && { date: new Date(dto.date) }),
      ...(dto.type && { type: dto.type }),
      ...(dto.securityId &&
        dto.securityId !== existing.securityId && {
          securityId: dto.securityId,
        }),
      ...(dto.quantity !== undefined && { quantity: dto.quantity }),
      ...(dto.pricePerShare !== undefined && { pricePerShare: dto.pricePerShare }),
      ...(dto.fees !== undefined && { fees: dto.fees }),
      ...(dto.currency &&
        dto.currency !== existing.currency && {
          currency: dto.currency,
        }),
      ...(dto.exchangeRate !== undefined && { exchangeRate: dto.exchangeRate }),
      ...(dto.totalValue !== undefined && { totalValue: dto.totalValue }),
      ...(dto.note !== undefined && { note: dto.note }),
    });

    return transaction as unknown as SecurityTransaction;
  }

  async deleteSecurityTransaction(id: string): Promise<void> {
    // Check if security transaction exists
    const existing = await this.securityTransactionsRepository.findById(id);

    if (!existing) {
      throw new NotFoundException('Security transaction not found');
    }

    // Delete the transaction
    await this.securityTransactionsRepository.delete(id);
  }

  private async ensureSecurityExists(securityId: string): Promise<void> {
    if (!(await this.securitiesRepository.existsById(securityId))) {
      throw new NotFoundException(
        `Security with ID ${securityId} not found`
      );
    }
  }

  private async ensureCurrencyExists(code: string): Promise<void> {
    if (!(await this.currenciesRepository.existsByCode(code))) {
      throw new NotFoundException(`Currency with code ${code} not found`);
    }
  }

  async importFromCsv(file: UploadedFile): Promise<ImportTransactionsCsvResponse> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file provided');
    }

    const csvContent = file.buffer.toString('utf-8');

    if (!csvContent || csvContent.trim().length === 0) {
      throw new BadRequestException('CSV file is empty');
    }

    // Parse CSV
    let records: CsvSecurityTransactionRow[];
    try {
      records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        cast: false,
      }) as CsvSecurityTransactionRow[];
    } catch (error) {
      throw new BadRequestException(`Invalid CSV format. Please check file encoding and structure.`);
    }

    if (records.length === 0) {
      throw new BadRequestException('CSV file contains no data rows');
    }

    // Validate row count limit (max 1000 rows)
    const MAX_ROWS = 1000;
    if (records.length > MAX_ROWS) {
      throw new BadRequestException(
        `CSV file contains too many rows. Maximum allowed: ${MAX_ROWS}, found: ${records.length}`
      );
    }

    // Validate headers (Wechselkurs is present but can be empty)
    const requiredHeaders = ['ISIN', 'Datum', 'Typ', 'Menge', 'Preis', 'Gebühren', 'Währung', 'Wechselkurs', 'Gesamtwert'];
    const firstRecord = records[0];
    const missingHeaders = requiredHeaders.filter(
      (header) => !(header in firstRecord)
    );

    if (missingHeaders.length > 0) {
      throw new BadRequestException(
        `Missing required headers: ${missingHeaders.join(', ')}. Required headers: ${requiredHeaders.join(', ')} (Wechselkurs can be empty, defaults to 1.0)`
      );
    }

    // Batch load securities by ISIN and currencies to avoid N+1 queries
    const isinsToCheck = [...new Set(
      records
        .map(r => r.ISIN?.trim().toUpperCase())
        .filter(i => i && i.length > 0)
    )];

    const currenciesToCheck = [...new Set(
      records
        .map(r => r.Währung?.trim().toUpperCase())
        .filter(c => c && c.length > 0)
    )];

    const [existingSecurities, existingCurrencies] = await Promise.all([
      this.securitiesRepository.findIdsByIsins(isinsToCheck),
      this.currenciesRepository.findExistingCodes(currenciesToCheck),
    ]);

    // Create lookup maps for O(1) access
    const isinToSecurityId = new Map(
      existingSecurities
        .filter(s => s.isin)
        .map(s => [s.isin!.toUpperCase(), s.id])
    );
    const existingCurrenciesSet = new Set(existingCurrencies);

    // Process and validate each row
    const results: ImportTransactionResult[] = [];
    const transactionsToCreate: Array<{
      date: Date;
      type: TransactionType;
      securityId: string;
      quantity: number;
      pricePerShare: number;
      fees: number;
      currency: string;
      exchangeRate: number;
      totalValue: number;
      note: string | null;
    }> = [];
    const ROW_NUMBER_OFFSET = 2; // CSV header row + 0-indexed array

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNumber = i + ROW_NUMBER_OFFSET;

      try {
        // Trim and normalize data
        const isin = row.ISIN?.trim().toUpperCase();
        const dateStr = row.Datum?.trim();
        const typ = row.Typ?.trim().toUpperCase();
        const mengeStr = row.Menge?.trim();
        const preisStr = row.Preis?.trim();
        const gebührenStr = row.Gebühren?.trim();
        const währung = row.Währung?.trim().toUpperCase();
        const wechselkursStr = row.Wechselkurs?.trim();
        const gesamtwertStr = row.Gesamtwert?.trim();
        const notiz = row.Notiz?.trim() || null;

        // Basic validation - check for empty strings after trimming
        // Note: wechselkursStr is optional, will default to 1.0 if empty
        if (!isin || !dateStr || !typ || !mengeStr || !preisStr || !gebührenStr || !währung || !gesamtwertStr) {
          results.push({
            row: rowNumber,
            isin: isin || 'UNKNOWN',
            status: 'error',
            reason: 'Missing required fields',
          });
          continue;
        }

        // Validate transaction type
        if (!['BUY', 'SELL'].includes(typ)) {
          results.push({
            row: rowNumber,
            isin,
            status: 'error',
            reason: `Invalid type: ${typ}. Must be BUY or SELL`,
          });
          continue;
        }

        // Parse numeric fields
        const menge = parseFloat(mengeStr);
        const preis = parseFloat(preisStr);
        const gebühren = parseFloat(gebührenStr);
        // Default to 1.0 if wechselkurs is empty or not provided (for same-currency transactions)
        const wechselkurs = wechselkursStr && wechselkursStr.length > 0 ? parseFloat(wechselkursStr) : 1.0;
        const gesamtwert = parseFloat(gesamtwertStr);

        if (isNaN(menge) || isNaN(preis) || isNaN(gebühren) || isNaN(wechselkurs) || isNaN(gesamtwert)) {
          results.push({
            row: rowNumber,
            isin,
            status: 'error',
            reason: 'Invalid numeric value',
          });
          continue;
        }

        // Validate date format
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          results.push({
            row: rowNumber,
            isin,
            status: 'error',
            reason: 'Invalid date format',
          });
          continue;
        }

        // ISIN Lookup - if security not found, skip (not error)
        const securityId = isinToSecurityId.get(isin);
        if (!securityId) {
          results.push({
            row: rowNumber,
            isin,
            status: 'skipped',
            reason: `Security with ISIN ${isin} not found`,
          });
          continue;
        }

        // Validate currency exists
        if (!existingCurrenciesSet.has(währung)) {
          results.push({
            row: rowNumber,
            isin,
            status: 'error',
            reason: `Currency ${währung} not found`,
          });
          continue;
        }

        // Prepare transaction for batch creation
        transactionsToCreate.push({
          date,
          type: typ as TransactionType,
          securityId,
          quantity: menge,
          pricePerShare: preis,
          fees: gebühren,
          currency: währung,
          exchangeRate: wechselkurs,
          totalValue: gesamtwert,
          note: notiz,
        });

        results.push({
          row: rowNumber,
          isin,
          status: 'created',
          transactionId: undefined, // Will be populated after batch insert
        });
      } catch (error) {
        const sanitizedMessage = this.sanitizeErrorMessage(error.message);
        results.push({
          row: rowNumber,
          isin: row.ISIN?.trim() || 'UNKNOWN',
          status: 'error',
          reason: sanitizedMessage,
        });
      }
    }

    // Batch create all valid transactions
    if (transactionsToCreate.length > 0) {
      try {
        const createResult =
          await this.securityTransactionsRepository.createMany(transactionsToCreate);

        // Update results with actual transaction IDs
        let createdIndex = 0;
        for (const result of results) {
          if (result.status === 'created' && createdIndex < createResult.length) {
            const createdTransaction = createResult[createdIndex];
            result.transactionId = createdTransaction.id;
            createdIndex++;
          }
        }
      } catch (error) {
        console.error('Batch insert failed:', error);
        throw new BadRequestException('Failed to create transactions. Please check your data and try again.');
      }
    }

    // Build response
    const response: ImportTransactionsCsvResponse = {
      total: records.length,
      created: results.filter((r) => r.status === 'created').length,
      skipped: results.filter((r) => r.status === 'skipped').length,
      errors: results.filter((r) => r.status === 'error').length,
      results,
    };

    return response;
  }

  /**
   * Sanitize error messages to avoid exposing internal implementation details
   */
  private sanitizeErrorMessage(message: string): string {
    // Remove database-specific error details
    if (message.includes('Prisma')) {
      return 'Database error occurred';
    }
    if (message.includes('unique constraint') || message.includes('UNIQUE')) {
      return 'Duplicate entry detected';
    }
    // Return generic message for unknown errors
    if (!message || message.length > 200) {
      return 'Invalid data';
    }
    return message;
  }
}
