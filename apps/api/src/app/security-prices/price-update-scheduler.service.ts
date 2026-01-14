import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SecurityPricesService } from './security-prices.service';

@Injectable()
export class PriceUpdateSchedulerService {
  private readonly logger = new Logger(PriceUpdateSchedulerService.name);

  constructor(private readonly securityPricesService: SecurityPricesService) {}

  /**
   * Daily job to update security prices from the last update date to today.
   * Runs every day at 7:00 AM UTC.
   * You can adjust the cron expression to fit your needs:
   * - '0 0 7 * * *' - Daily at 7AM UTC (current setting)
   * - CronExpression.EVERY_DAY_AT_MIDNIGHT - Daily at midnight
   * - CronExpression.EVERY_DAY_AT_NOON - Daily at noon
   */
  @Cron('0 0 7 * * *')
  async handleDailyPriceUpdate() {
    this.logger.log('Starting scheduled daily price update...');

    try {
      // Get the last price update date across all securities
      const lastUpdateDate = await this.securityPricesService.getLastPriceUpdateDate();

      if (!lastUpdateDate) {
        this.logger.warn('No existing price data found. Running full historical sync...');
        // If no prices exist, sync from default start date
        const result = await this.securityPricesService.syncHistoricalPrices();
        this.logger.log(`Full historical sync completed: ${JSON.stringify(result)}`);
        return;
      }

      // Calculate the "from" date (day after last update)
      const fromDate = new Date(lastUpdateDate);
      fromDate.setDate(fromDate.getDate() + 1);

      // Set "to" date to today
      const toDate = new Date();

      // Check if we need to update (don't run if we're already up to date)
      if (fromDate > toDate) {
        this.logger.log('Prices are already up to date. No update needed.');
        return;
      }

      this.logger.log(`Updating prices from ${fromDate.toISOString().slice(0, 10)} to ${toDate.toISOString().slice(0, 10)}`);

      // Sync prices from last update date to today
      const result = await this.securityPricesService.syncHistoricalPrices({
        from: fromDate,
        to: toDate,
      });

      this.logger.log(`Daily price update completed successfully: ${JSON.stringify(result)}`);

      // Log any failures
      if (result.failures.length > 0) {
        this.logger.warn(`Some securities failed to update: ${JSON.stringify(result.failures)}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Daily price update failed: ${message}`, error instanceof Error ? error.stack : undefined);
    }
  }

  /**
   * Manual trigger for testing or ad-hoc updates.
   * This can be called directly to force an immediate price update.
   */
  async triggerManualUpdate(): Promise<void> {
    this.logger.log('Manual price update triggered');
    await this.handleDailyPriceUpdate();
  }
}
