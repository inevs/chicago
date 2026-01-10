import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateSecurityDto } from './dto/create-security.dto';
import { UpdateSecurityDto } from './dto/update-security.dto';
import { CsvSecurityRow, UploadedFile } from './dto/import-securities-csv.dto';
import { Security, ImportCsvResponse, ImportSecurityResult, SecurityType } from '@dividends/shared';
import { SecurityPricesService } from '../security-prices/security-prices.service';
import { parse } from 'csv-parse/sync';

@Injectable()
export class SecuritiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly securityPricesService: SecurityPricesService
  ) {}

  async createSecurity(dto: CreateSecurityDto): Promise<Security> {
    // Check for duplicate symbol
    const existing = await this.prisma.security.findUnique({
      where: { symbol: dto.symbol },
    });

    if (existing) {
      throw new ConflictException(
        'Security with this symbol already exists'
      );
    }

    const currency = await this.prisma.currency.findUnique({
      where: { code: dto.currency },
    });

    if (!currency) {
      throw new NotFoundException(
        `Currency with code ${dto.currency} not found`
      );
    }

    // Create security
    const security = await this.prisma.security.create({
      data: dto,
    });

    // Trigger price update for the new security
    // We don't await this so the API response isn't delayed
    this.securityPricesService
      .syncHistoricalPrices({ securityId: security.id })
      .then((result) => {
        if (result.failures.length > 0) {
          console.warn(
            `Price update finished with failures for new security ${security.symbol}:`,
            result.failures
          );
        } else {
          console.log(
            `Price update completed for new security ${security.symbol}. Inserted ${result.pricesInserted} prices.`
          );
        }
      })
      .catch((err) => {
        console.error(
          `Failed to trigger price update for new security ${security.symbol}:`,
          err
        );
      });

    return security as Security;
  }

  async getAllSecurities(): Promise<Security[]> {
    const securities = await this.prisma.security.findMany({
      orderBy: { symbol: 'asc' },
    });

    return securities as Security[];
  }

  async getSecurityById(id: string): Promise<Security> {
    const security = await this.prisma.security.findUnique({
      where: { id },
    });

    if (!security) {
      throw new NotFoundException('Security not found');
    }

    return security as Security;
  }

  async updateSecurity(id: string, dto: UpdateSecurityDto): Promise<Security> {
    const security = await this.prisma.security.findUnique({
      where: { id },
    });

    if (!security) {
      throw new NotFoundException('Security not found');
    }

    // Check for duplicate symbol if symbol is being changed
    const newSymbol = dto.symbol;
    if (newSymbol && newSymbol !== security.symbol) {
      const existing = await this.prisma.security.findUnique({
        where: { symbol: newSymbol },
      });

      if (existing) {
        throw new ConflictException(
          'Security with this symbol already exists'
        );
      }
    }

    // Validate currency if provided
    const newCurrency = dto.currency;
    if (newCurrency) {
      const currency = await this.prisma.currency.findUnique({
        where: { code: newCurrency },
      });

      if (!currency) {
        throw new NotFoundException(
          `Currency with code ${newCurrency} not found`
        );
      }
    }

    const updated = await this.prisma.security.update({
      where: { id },
      data: dto,
    });

    return updated as Security;
  }

  async searchSecurities(query: string): Promise<Security[]> {
    if (!query || query.trim().length === 0) {
      return this.getAllSecurities();
    }

    const searchTerm = query.trim().toLowerCase();

    const securities = await this.prisma.security.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { symbol: { contains: searchTerm, mode: 'insensitive' } },
          { isin: { contains: searchTerm, mode: 'insensitive' } },
          { wkn: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      orderBy: { symbol: 'asc' },
      take: 10,
    });

    return securities as Security[];
  }

  async importFromCsv(file: UploadedFile): Promise<ImportCsvResponse> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file provided');
    }

    const csvContent = file.buffer.toString('utf-8');

    if (!csvContent || csvContent.trim().length === 0) {
      throw new BadRequestException('CSV file is empty');
    }

    // Parse CSV
    let records: CsvSecurityRow[];
    try {
      records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        cast: false,
      }) as CsvSecurityRow[];
    } catch (error) {
      throw new BadRequestException(`Invalid CSV format: ${error.message}`);
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
    const requiredHeaders = ['name', 'symbol', 'type', 'exchange', 'currency'];
    const firstRecord = records[0];
    const missingHeaders = requiredHeaders.filter(
      (header) => !(header in firstRecord)
    );

    if (missingHeaders.length > 0) {
      throw new BadRequestException(
        `Missing required headers: ${missingHeaders.join(', ')}. Required headers: ${requiredHeaders.join(', ')}`
      );
    }

    // Batch load existing symbols and currencies to avoid N+1 queries
    const symbolsToCheck = records
      .map(r => r.symbol?.trim().toUpperCase())
      .filter(s => s && s.length > 0);

    const currenciesToCheck = [...new Set(
      records
        .map(r => r.currency?.trim().toUpperCase())
        .filter(c => c && c.length > 0)
    )];

    const [existingSecurities, existingCurrencies] = await Promise.all([
      this.prisma.security.findMany({
        where: { symbol: { in: symbolsToCheck } },
        select: { symbol: true },
      }),
      this.prisma.currency.findMany({
        where: { code: { in: currenciesToCheck } },
        select: { code: true },
      }),
    ]);

    const existingSymbolsSet = new Set(existingSecurities.map(s => s.symbol));
    const existingCurrenciesSet = new Set(existingCurrencies.map(c => c.code));

    // Process and validate each row
    const results: ImportSecurityResult[] = [];
    const securitiesToCreate: CreateSecurityDto[] = [];
    const ROW_NUMBER_OFFSET = 2; // CSV header row + 0-indexed array

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNumber = i + ROW_NUMBER_OFFSET;

      try {
        // Trim and prepare data
        const symbol = row.symbol?.trim().toUpperCase();
        const name = row.name?.trim();
        const type = row.type?.trim().toUpperCase();
        const exchange = row.exchange?.trim();
        const currency = row.currency?.trim().toUpperCase();
        const isin = row.isin?.trim() || undefined;
        const wkn = row.wkn?.trim() || undefined;

        // Basic validation - check for empty strings after trimming
        if (!name || !symbol || !type || !exchange || !currency) {
          results.push({
            row: rowNumber,
            symbol: symbol || 'UNKNOWN',
            status: 'error',
            reason: 'Missing required fields',
          });
          continue;
        }

        // Validate type
        if (!['STOCK', 'ETF', 'BOND'].includes(type)) {
          results.push({
            row: rowNumber,
            symbol,
            status: 'error',
            reason: `Invalid type: ${type}. Must be STOCK, ETF, or BOND`,
          });
          continue;
        }

        // Check for duplicate symbol (using pre-loaded set)
        if (existingSymbolsSet.has(symbol)) {
          results.push({
            row: rowNumber,
            symbol,
            status: 'skipped',
            reason: 'Symbol already exists',
          });
          continue;
        }

        // Validate currency exists (using pre-loaded set)
        if (!existingCurrenciesSet.has(currency)) {
          results.push({
            row: rowNumber,
            symbol,
            status: 'error',
            reason: `Currency ${currency} not found`,
          });
          continue;
        }

        // Prepare security for batch creation
        const dto: CreateSecurityDto = {
          name,
          symbol,
          type: type as SecurityType,
          exchange,
          currency,
          isin,
          wkn,
        };

        securitiesToCreate.push(dto);
        existingSymbolsSet.add(symbol); // Prevent duplicates within the same import

        results.push({
          row: rowNumber,
          symbol,
          status: 'created',
          securityId: undefined, // Will be populated after batch insert
        });
      } catch (error) {
        const sanitizedMessage = this.sanitizeErrorMessage(error.message);
        results.push({
          row: rowNumber,
          symbol: row.symbol?.trim() || 'UNKNOWN',
          status: 'error',
          reason: sanitizedMessage,
        });
      }
    }

    // Batch create all valid securities
    const createdSecurityIds: string[] = [];
    if (securitiesToCreate.length > 0) {
      try {
        // Use createMany for batch insert (more efficient than individual creates)
        const createResult = await this.prisma.security.createManyAndReturn({
          data: securitiesToCreate,
          skipDuplicates: true,
        });

        // Update results with actual security IDs
        let createdIndex = 0;
        for (const result of results) {
          if (result.status === 'created' && createdIndex < createResult.length) {
            const createdSecurity = createResult[createdIndex];
            result.securityId = createdSecurity.id;
            createdSecurityIds.push(createdSecurity.id);
            createdIndex++;
          }
        }
      } catch (error) {
        // If batch insert fails, fall back to marking all as errors
        console.error('Batch insert failed:', error);
        throw new BadRequestException('Failed to create securities. Please check your data and try again.');
      }
    }

    // Trigger price sync for all created securities (non-blocking)
    if (createdSecurityIds.length > 0) {
      for (const securityId of createdSecurityIds) {
        this.securityPricesService
          .syncHistoricalPrices({ securityId })
          .then((result) => {
            if (result.failures.length > 0) {
              console.warn(
                `Price sync finished with failures for security ${securityId}:`,
                result.failures
              );
            } else {
              console.log(
                `Price sync completed for security ${securityId}. Inserted ${result.pricesInserted} prices.`
              );
            }
          })
          .catch((err) => {
            console.error(
              `Failed to trigger price sync for security ${securityId}:`,
              err
            );
          });
      }
    }

    // Build response
    const response: ImportCsvResponse = {
      total: records.length,
      created: results.filter((r) => r.status === 'created').length,
      skipped: results.filter((r) => r.status === 'skipped').length,
      errors: results.filter((r) => r.status === 'error').length,
      results,
      pricesSyncTriggered: createdSecurityIds.length > 0,
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
      return 'An error occurred while processing this row';
    }
    return message;
  }
}
