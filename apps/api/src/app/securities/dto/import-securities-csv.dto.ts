import { ApiProperty } from '@nestjs/swagger';

export interface CsvSecurityRow {
  name: string;
  symbol: string;
  type: string;
  exchange: string;
  currency: string;
  isin?: string;
  wkn?: string;
}

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export class ImportSecuritiesCsvDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: UploadedFile;
}
