import { Injectable } from '@nestjs/common';
import { Security, SecurityType } from '@dividends/shared';

@Injectable()
export class AppService {
  getData(): Security {
    return {
      id: '1',
      name: 'Example Security',
      symbol: 'EXM',
      isin: null,
      wkn: null,
      type: SecurityType.STOCK,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
