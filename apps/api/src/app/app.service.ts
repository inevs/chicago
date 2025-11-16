import { Injectable } from '@nestjs/common';
import { Security } from '@dividends/shared';

@Injectable()
export class AppService {
  getData(): Security {
    return { id: '1', name: 'Example Security', ticker: 'EXM' };
  }
}
