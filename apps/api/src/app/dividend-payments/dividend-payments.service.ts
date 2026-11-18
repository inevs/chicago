import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DividendPaymentsRepository, CreateDividendPaymentData } from './dividend-payments.repository';
import { SecuritiesRepository } from '../securities/securities.repository';
import { CurrenciesRepository } from '../currencies/currencies.repository';
import { CreateDividendPaymentDto } from './dto/create-dividend-payment.dto';
import { UpdateDividendPaymentDto } from './dto/update-dividend-payment.dto';
import { DividendPayment, ImportDividendsCsvResponse, ImportDividendResult } from '@dividends/shared';
import { parse } from 'csv-parse/sync';
import { CsvDividendPaymentRow, UploadedFile } from './dto/import-dividends-csv.dto';

@Injectable()
export class DividendPaymentsService {
  constructor(
    private readonly dividendPaymentsRepository: DividendPaymentsRepository,
    private readonly securitiesRepository: SecuritiesRepository,
    private readonly currenciesRepository: CurrenciesRepository
  ) {}

  async createDividendPayment(
    dto: CreateDividendPaymentDto
  ): Promise<DividendPayment> {
    // Validate that security exists
    await this.ensureSecurityExists(dto.securityId);
    await this.ensureCurrencyExists(dto.originCurrency);
    await this.ensureCurrencyExists(dto.destCurrency);

    // Create dividend payment
    const payment = await this.dividendPaymentsRepository.create({
      exDate: new Date(dto.exDate),
      payoutDate: new Date(dto.payoutDate),
      securityId: dto.securityId,
      shares: dto.shares,
      dividendYield: dto.dividendYield,
      taxAmount: dto.taxAmount,
      originCurrency: dto.originCurrency,
      destCurrency: dto.destCurrency,
      conversionRate: dto.conversionRate,
      finalPayment: dto.finalPayment,
      note: dto.note,
    });

    return payment as unknown as DividendPayment;
  }

  async getAllDividendPayments(): Promise<DividendPayment[]> {
    const payments = await this.dividendPaymentsRepository.findAll();

    return payments as unknown as DividendPayment[];
  }

  async getDividendPaymentById(id: string): Promise<DividendPayment> {
    const payment = await this.dividendPaymentsRepository.findByIdWithSecurity(id);

    if (!payment) {
      throw new NotFoundException('Dividend payment not found');
    }

    return payment as unknown as DividendPayment;
  }

  async getDividendPaymentsBySecurityId(
    securityId: string
  ): Promise<DividendPayment[]> {
    const payments =
      await this.dividendPaymentsRepository.findBySecurityId(securityId);

    return payments as unknown as DividendPayment[];
  }

  async getDividendPaymentsByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<DividendPayment[]> {
    const payments = await this.dividendPaymentsRepository.findByPayoutDateRange(
      startDate,
      endDate
    );

    return payments as unknown as DividendPayment[];
  }

  async updateDividendPayment(
    id: string,
    dto: UpdateDividendPaymentDto
  ): Promise<DividendPayment> {
    // Check if dividend payment exists
    const existing = await this.dividendPaymentsRepository.findById(id);

    if (!existing) {
      throw new NotFoundException('Dividend payment not found');
    }

    // If securityId is being updated, validate that the new security exists
    if (dto.securityId && dto.securityId !== existing.securityId) {
      await this.ensureSecurityExists(dto.securityId);
    }

    if (dto.originCurrency && dto.originCurrency !== existing.originCurrency) {
      await this.ensureCurrencyExists(dto.originCurrency);
    }

    if (dto.destCurrency && dto.destCurrency !== existing.destCurrency) {
      await this.ensureCurrencyExists(dto.destCurrency);
    }

    // Update dividend payment
    const payment = await this.dividendPaymentsRepository.update(id, {
      ...(dto.exDate && { exDate: new Date(dto.exDate) }),
      ...(dto.payoutDate && { payoutDate: new Date(dto.payoutDate) }),
      ...(dto.securityId && { securityId: dto.securityId }),
      ...(dto.shares !== undefined && { shares: dto.shares }),
      ...(dto.dividendYield !== undefined && { dividendYield: dto.dividendYield }),
      ...(dto.taxAmount !== undefined && { taxAmount: dto.taxAmount }),
      ...(dto.originCurrency && { originCurrency: dto.originCurrency }),
      ...(dto.destCurrency && { destCurrency: dto.destCurrency }),
      ...(dto.conversionRate !== undefined && { conversionRate: dto.conversionRate }),
      ...(dto.finalPayment !== undefined && { finalPayment: dto.finalPayment }),
      ...(dto.note !== undefined && { note: dto.note }),
    });

    return payment as unknown as DividendPayment;
  }

  async deleteDividendPayment(id: string): Promise<void> {
    // Check if dividend payment exists
    const existing = await this.dividendPaymentsRepository.findById(id);

    if (!existing) {
      throw new NotFoundException('Dividend payment not found');
    }

    // Delete the payment
    await this.dividendPaymentsRepository.delete(id);
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

  async importFromCsv(file: UploadedFile): Promise<ImportDividendsCsvResponse> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file provided');
    }

    const csvContent = file.buffer.toString('utf-8');

    if (!csvContent || csvContent.trim().length === 0) {
      throw new BadRequestException('CSV file is empty');
    }

    // Parse CSV
    let records: CsvDividendPaymentRow[];
    try {
      records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        cast: false,
      }) as CsvDividendPaymentRow[];
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

    // Validate headers
    // Note: 'Steuer', 'Wechselkurs', and 'Notiz' are optional, but their columns must exist
    const requiredHeaders = ['ISIN', 'Ex-Datum', 'Auszahlungsdatum', 'Anzahl Aktien', 'Dividende pro Aktie', 'Steuer', 'Ursprungswährung', 'Zielwährung', 'Wechselkurs', 'Endzahlung'];
    const firstRecord = records[0];
    const missingHeaders = requiredHeaders.filter(
      (header) => !(header in firstRecord)
    );

    if (missingHeaders.length > 0) {
      throw new BadRequestException(
        `Missing required headers: ${missingHeaders.join(', ')}. Required headers: ${requiredHeaders.join(', ')}`
      );
    }

    // Batch load securities by ISIN and currencies to avoid N+1 queries
    const isinsToCheck = [...new Set(
      records
        .map(r => r.ISIN?.trim().toUpperCase())
        .filter(i => i && i.length > 0)
    )];

    const currenciesToCheck = [...new Set([
      ...records.map(r => r.Ursprungswährung?.trim().toUpperCase()).filter(c => c && c.length > 0),
      ...records.map(r => r.Zielwährung?.trim().toUpperCase()).filter(c => c && c.length > 0)
    ])];

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
    const results: ImportDividendResult[] = [];
    const paymentsToCreate: CreateDividendPaymentData[] = [];
    const ROW_NUMBER_OFFSET = 2; // CSV header row + 0-indexed array

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNumber = i + ROW_NUMBER_OFFSET;

      try {
        // Trim and normalize data
        const isin = row.ISIN?.trim().toUpperCase();
        const exDatumStr = row['Ex-Datum']?.trim();
        const auszahlungsdatumStr = row.Auszahlungsdatum?.trim();
        const anzahlAktienStr = row['Anzahl Aktien']?.trim();
        const dividendeProAktieStr = row['Dividende pro Aktie']?.trim();
        const steuerStr = row.Steuer?.trim();
        const ursprungswährung = row.Ursprungswährung?.trim().toUpperCase();
        const zielwährung = row.Zielwährung?.trim().toUpperCase();
        const wechselkursStr = row.Wechselkurs?.trim();
        const endzahlungStr = row.Endzahlung?.trim();
        const notiz = row.Notiz?.trim() || null;

        // Basic validation - check for empty strings after trimming
        // Note: steuerStr and wechselkursStr are optional
        if (!isin || !exDatumStr || !auszahlungsdatumStr || !anzahlAktienStr || !dividendeProAktieStr || !ursprungswährung || !zielwährung || !endzahlungStr) {
          results.push({
            row: rowNumber,
            isin: isin || 'UNKNOWN',
            status: 'error',
            reason: 'Missing required fields',
          });
          continue;
        }

        // Check if security exists
        const securityId = isinToSecurityId.get(isin);
        if (!securityId) {
          results.push({
            row: rowNumber,
            isin,
            status: 'error',
            reason: `Security with ISIN ${isin} not found`,
          });
          continue;
        }

        // Check if currencies exist
        if (!existingCurrenciesSet.has(ursprungswährung)) {
          results.push({
            row: rowNumber,
            isin,
            status: 'error',
            reason: `Currency ${ursprungswährung} not found`,
          });
          continue;
        }

        if (!existingCurrenciesSet.has(zielwährung)) {
          results.push({
            row: rowNumber,
            isin,
            status: 'error',
            reason: `Currency ${zielwährung} not found`,
          });
          continue;
        }

        // Parse dates
        const exDate = new Date(exDatumStr);
        const payoutDate = new Date(auszahlungsdatumStr);

        if (isNaN(exDate.getTime()) || isNaN(payoutDate.getTime())) {
          results.push({
            row: rowNumber,
            isin,
            status: 'error',
            reason: 'Invalid date format',
          });
          continue;
        }

        // Parse numeric fields
        // Use default values for optional fields: taxAmount = 0, conversionRate = 1
        const shares = parseFloat(anzahlAktienStr);
        const dividendYield = parseFloat(dividendeProAktieStr);
        const taxAmount = steuerStr && steuerStr.length > 0 ? parseFloat(steuerStr) : 0;
        const conversionRate = wechselkursStr && wechselkursStr.length > 0 ? parseFloat(wechselkursStr) : 1;
        const finalPayment = parseFloat(endzahlungStr);

        if (isNaN(shares) || isNaN(dividendYield) || isNaN(taxAmount) || isNaN(conversionRate) || isNaN(finalPayment)) {
          results.push({
            row: rowNumber,
            isin,
            status: 'error',
            reason: 'Invalid numeric value',
          });
          continue;
        }

        // Validate numeric ranges
        if (shares <= 0 || dividendYield < 0 || taxAmount < 0 || conversionRate <= 0 || finalPayment < 0) {
          results.push({
            row: rowNumber,
            isin,
            status: 'error',
            reason: 'Invalid numeric range (shares must be > 0, rates must be > 0, amounts must be >= 0)',
          });
          continue;
        }

        // Add to batch create list
        paymentsToCreate.push({
          exDate,
          payoutDate,
          securityId,
          shares,
          dividendYield,
          taxAmount,
          originCurrency: ursprungswährung,
          destCurrency: zielwährung,
          conversionRate,
          finalPayment,
          note: notiz,
        });

        results.push({
          row: rowNumber,
          isin,
          status: 'created',
        });
      } catch (error) {
        results.push({
          row: rowNumber,
          isin: row.ISIN?.trim().toUpperCase() || 'UNKNOWN',
          status: 'error',
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Batch create dividend payments
    if (paymentsToCreate.length > 0) {
      const createdPayments =
        await this.dividendPaymentsRepository.createMany(paymentsToCreate);

      // Update results with created payment IDs
      let createdIndex = 0;
      for (const result of results) {
        if (result.status === 'created') {
          result.dividendPaymentId = createdPayments[createdIndex]?.id;
          createdIndex++;
        }
      }
    }

    // Calculate summary statistics
    const created = results.filter((r) => r.status === 'created').length;
    const skipped = results.filter((r) => r.status === 'skipped').length;
    const errors = results.filter((r) => r.status === 'error').length;

    return {
      total: records.length,
      created,
      skipped,
      errors,
      results,
    };
  }
}
