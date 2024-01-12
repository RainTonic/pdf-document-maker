import { PDFOptions } from 'puppeteer';

export interface DocumentPdfMakerOptions extends PDFOptions {
  partials?: { [key: string]: string },
  helpers?: any,
  repeatableElementHeight?: number,
}
