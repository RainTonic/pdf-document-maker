# PDF Document Maker

## Introduction
PDF Document Maker is a library to handle PDF generation. It's a wrapper of puppeteer and puppeteer-report.
It handles handlebars templates and introduces some nice features like a preset of helpers and include function on templates.

## Installation
Use

`npm install pdf-document-maker`

or

`yarn add pdf-document-maker`

Depending on your package manager.
At the moment the library uses puppeteer-core@19.11.1

## How to use
Page scaling is set to 1, so 100px = 26mm. 
Page structure:

```html
<html>
  <head>
    <meta charset='utf-8'/>
    <title></title>
    <style>
      <!-- Your css here -->
    </style>
  </head>
  <body>
    <header id="header"></header>
    <main id="main"></main>
    <footer id="footer"></footer>
  </body>
</html>
```
**IMPORTANT: Do not set margins to these elements! Use padding instead.**

Class usage:
```typescript
const pdfMaker = new PdfDocumentMaker();
const pdfResult = await pdfMaker.getPdf(filePath, data, options);
```

## Features

### Helpers
List of helpers included:
- **date**: Angular date pipe like
- **number**: Angular number pipe like 
- **lowercase**: set input as lowercase
- **uppercase**: set input as uppercase
- **escape**: set a `-` if the value in input is null or undefined. 

### Include
You can use include function inside the templates. To use it you must use this syntax: 

`##INCLUDE:<template-name>##`

inside your template.

**IMPORTANT**: include function works only on first level (optimization issues).

### Page filler
You can use `.pageFiller` class inside template to have an element that covers the remaining part of the page.
