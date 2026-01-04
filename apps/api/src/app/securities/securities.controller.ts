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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SecuritiesService } from './securities.service';
import { CreateSecurityDto } from './dto/create-security.dto';
import { UpdateSecurityDto } from './dto/update-security.dto';
import { Security } from '@dividends/shared';
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
}
