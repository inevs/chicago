import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Security } from '@dividends/shared';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getData(): Security {
    return this.appService.getData();
  }
}
