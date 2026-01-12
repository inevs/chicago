import { ApiProperty } from '@nestjs/swagger';

export interface CsvDividendPaymentRow {
  ISIN: string;
  'Ex-Datum': string;
  Auszahlungsdatum: string;
  'Anzahl Aktien': string;
  'Dividende pro Aktie': string;
  Steuer: string;
  Ursprungswährung: string;
  Zielwährung: string;
  Wechselkurs: string;
  Endzahlung: string;
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

export class ImportDividendsCsvDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: UploadedFile;
}
