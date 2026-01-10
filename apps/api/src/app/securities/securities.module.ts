import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { SecuritiesController } from './securities.controller';
import { SecuritiesService } from './securities.service';
import { PrismaService } from '../../prisma.service';
import { SecurityPricesModule } from '../security-prices/security-prices.module';

@Module({
  imports: [
    SecurityPricesModule,
    MulterModule.register({
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
      fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
          cb(null, true);
        } else {
          cb(new Error('Only CSV files are allowed'), false);
        }
      },
    }),
  ],
  controllers: [SecuritiesController],
  providers: [SecuritiesService, PrismaService],
  exports: [SecuritiesService],
})
export class SecuritiesModule {}
