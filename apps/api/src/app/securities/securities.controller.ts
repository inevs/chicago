import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { SecuritiesService } from './securities.service';
import { CreateSecurityDto } from './dto/create-security.dto';
import { Security } from '@dividends/shared';

@Controller('securities')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  })
)
export class SecuritiesController {
  constructor(private readonly securitiesService: SecuritiesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateSecurityDto): Promise<Security> {
    return this.securitiesService.createSecurity(dto);
  }

  @Get()
  async findAll(): Promise<Security[]> {
    return this.securitiesService.getAllSecurities();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Security> {
    return this.securitiesService.getSecurityById(id);
  }
}
