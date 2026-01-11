import { ApiProperty } from '@nestjs/swagger';

export interface CsvSecurityTransactionRow {
  ISIN: string;
  Datum: string;
  Typ: string;
  Menge: string;
  Preis: string;
  Gebühren: string;
  Währung: string;
  Wechselkurs: string;
  Gesamtwert: string;
  Notiz?: string;
}

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export class ImportSecurityTransactionsCsvDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: UploadedFile;
}
