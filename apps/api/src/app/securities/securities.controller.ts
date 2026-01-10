import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { SecuritiesService } from './securities.service';
import { CreateSecurityDto } from './dto/create-security.dto';
import { UpdateSecurityDto } from './dto/update-security.dto';
import { UploadedFile as UploadedFileType } from './dto/import-securities-csv.dto';
import { Security, ImportCsvResponse } from '@dividends/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('securities')
@ApiBearerAuth()
@Controller('securities')
@UseGuards(JwtAuthGuard)
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
  @ApiOperation({ summary: 'Create a new security' })
  @ApiBody({ type: CreateSecurityDto })
  @ApiResponse({
    status: 201,
    description: 'Security created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async create(@Body() dto: CreateSecurityDto): Promise<Security> {
    return this.securitiesService.createSecurity(dto);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search securities by name or symbol' })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Search query for security name or symbol',
  })
  @ApiResponse({
    status: 200,
    description: 'List of matching securities',
  })
  async search(@Query('q') query: string): Promise<Security[]> {
    return this.securitiesService.searchSecurities(query || '');
  }

  @Get()
  @ApiOperation({ summary: 'Get all securities' })
  @ApiResponse({
    status: 200,
    description: 'List of all securities',
  })
  async findAll(): Promise<Security[]> {
    return this.securitiesService.getAllSecurities();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a security by ID' })
  @ApiParam({ name: 'id', description: 'Security UUID' })
  @ApiResponse({
    status: 200,
    description: 'Security found',
  })
  @ApiResponse({ status: 404, description: 'Security not found' })
  async findOne(@Param('id') id: string): Promise<Security> {
    return this.securitiesService.getSecurityById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a security' })
  @ApiParam({ name: 'id', description: 'Security UUID' })
  @ApiBody({ type: UpdateSecurityDto })
  @ApiResponse({
    status: 200,
    description: 'Security updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Security not found' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSecurityDto
  ): Promise<Security> {
    return this.securitiesService.updateSecurity(id, dto);
  }

  @Post('import/csv')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Import securities from CSV file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'CSV file with securities data',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Import results with statistics',
  })
  @ApiResponse({ status: 400, description: 'Invalid CSV file or format' })
  @UseGuards(JwtAuthGuard)
  async importCsv(
    @UploadedFile() file: UploadedFileType
  ): Promise<ImportCsvResponse> {
    return this.securitiesService.importFromCsv(file);
  }
}
