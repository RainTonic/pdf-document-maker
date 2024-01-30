import * as fs from 'fs';
import Handlebars from 'handlebars';
import { merge } from 'lodash';
import puppeteer, { Browser, PDFOptions } from 'puppeteer';
import { pdfPage } from 'puppeteer-report';
import { dirname, isAbsolute, normalizeSafe, resolve } from 'upath';
import { format } from 'date-fns';
import { PdfDocumentMakerOptions } from './pdf-document-maker-options';


export class PdfDocumentMaker {
  static readonly PAGE_HEIGHT_IN_PIXELS: number = 1142;

  private _currentLocale: string = 'en';

  defaultOptions: PDFOptions = {
    printBackground: true,
    format: 'A4',
    scale: 1,

    margin: {
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    }
  }

  /**
   * Set current locale. Used by number pipe at the moment
   * @param locale
   */
  setLocale(locale: string): void {
    this._currentLocale = locale;
  }


  private helpers: any = {
    date: (date: Date, dateFormat: string) => date ? format(date, dateFormat) : '',
    amount: (amount: string | number, format: string) => {
      const splitFormat: string[] = format.split('.');
      const fractionSettings = splitFormat[1]?.split('-') || [];
      const numberFormatter = new Intl.NumberFormat(this._currentLocale, {
        minimumIntegerDigits: Number(splitFormat[0]) || 1,
        minimumFractionDigits: fractionSettings[0] !== undefined ? Number(fractionSettings[0]) : 2,
        maximumFractionDigits: fractionSettings[1] !== undefined ? Number(fractionSettings[1]) : 3,
      });
      const parsedAmount: string | number = amount == undefined || !amount ? 0 : amount;
      return !parsedAmount ? '' : `${numberFormatter.format(+parsedAmount)}`;
    },
    lowercase: (str: string) => str.toLowerCase(),
    uppercase: (str: string) => str.toUpperCase(),
    escape: (str?: string) => str === null || str === undefined ? '-' : str,

  };

  /**
   * It adds helpers to default ones.
   * @param newHelpers
   */
  addHelpers(newHelpers: any) {
    this.helpers = merge(this.helpers, newHelpers);
  }

  /**
   * Resolves a handlebars template and returns the generated html.
   * @param filePath
   * @param templateData
   * @param options
   */
  async getHtmlData(filePath: string, templateData: any, options: PdfDocumentMakerOptions = {}): Promise<string> {
    let templatePath = normalizeSafe(filePath)
    if (!isAbsolute(templatePath)) {
      // Get the dirname of the module that is calling this function
      const callingFileDir = dirname(require.main ? require.main.filename : __filename)
      templatePath = resolve(callingFileDir, templatePath)
    }

    const dataBuffer = await fs.promises.readFile(templatePath);
    let templateString = dataBuffer.toString();

    if (options.partials) {

      for (const key of Object.keys(options.partials)) {
        const includeKey = `##INCLUDE:${key}##`;
        if (templateString.indexOf(key) >= 0) {
          const partialTemplate = await this.getHtmlData(options.partials[key], templateData);
          templateString = templateString.replace(new RegExp(includeKey, 'g'), partialTemplate);
        }
      }
    }

    const template = Handlebars.compile(templateString)

    const currentHelpers = merge(this.helpers, options.helpers || {});
    return template(templateData, { helpers: currentHelpers });
  }

  /**
   * Returns the generated pdf.
   *
   * @param filePath
   * @param templateData
   * @param pdfOptions
   */
  async getPdf(filePath: string, templateData: any, pdfOptions: PdfDocumentMakerOptions = {}, browserArgs: any = {}): Promise<Uint8Array> {
    const browser: Browser = await puppeteer.launch({ headless: 'new', ...browserArgs});

    // Calculate html
    const html: string = await this.getHtmlData(filePath, templateData, pdfOptions);

    const currentPdfOptions: PDFOptions = {
      ...this.defaultOptions,
      ...pdfOptions,
    };


    const page: any = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    await this._handlePageFiller(page, currentPdfOptions);

    const currentPdf = await pdfPage(page, currentPdfOptions);

    await browser.close();

    return currentPdf;
  }


  /**
   * Sets a style to handle pageFiller class.
   * @param page
   * @param pdfOptions
   * @private
   */
  private async _handlePageFiller(page: any, pdfOptions: PdfDocumentMakerOptions): Promise<void> {
    const currentPageHeight: number = (await (await page.$('main')).boundingBox()).height;

    const currentHeaderHeight: number = (await (await page.$('#header'))?.boundingBox())?.height || 0;
    const currentFooterHeight: number = (await (await page.$('#footer'))?.boundingBox())?.height || 0;

    const repeatableHeightElement = pdfOptions.repeatableElementHeight || 20;

    const availableSpaceInPage: number = PdfDocumentMaker.PAGE_HEIGHT_IN_PIXELS -
      (pdfOptions.margin?.top as number || 0) - (pdfOptions.margin?.bottom as number || 0) - currentFooterHeight - currentHeaderHeight;
    const fillerHeight: number =
      currentPageHeight > availableSpaceInPage ?
        (currentPageHeight + (Math.floor(currentPageHeight % availableSpaceInPage) * repeatableHeightElement)) % (availableSpaceInPage) : availableSpaceInPage - (currentPageHeight);

    if (fillerHeight - 12 > 0) {
      await page.addStyleTag({ content: '.pageFiller { height: ' + (fillerHeight - 12) + 'px !important;}' });
    }
  }

}
