import { PDFOptions } from 'puppeteer';

export interface PdfDocumentMakerOptions extends PDFOptions {
  partials?: { [key: string]: string },
  helpers?: any,
  repeatableElementHeight?: number,
}
