import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const white = rgb(1, 1, 1);
const black = rgb(0.04, 0.08, 0.13);

function dataUrlToBytes(dataUrl) {
  const base64 = String(dataUrl || '').split(',').pop() || '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function safeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function brl(value) {
  const numeric = Number(String(value || '').replace(/R\$/gi, '').replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
  return numeric.toLocaleString('pt-BR', { currency: 'BRL', minimumFractionDigits: 2, style: 'currency' });
}

function extensoAte999(number) {
  const units = ['', 'um', 'dois', 'tres', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const teens = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const tens = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const hundreds = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

  if (number === 0) return '';
  if (number === 100) return 'cem';
  if (number < 10) return units[number];
  if (number < 20) return teens[number - 10];
  if (number < 100) return `${tens[Math.floor(number / 10)]}${number % 10 ? ` e ${units[number % 10]}` : ''}`;
  return `${hundreds[Math.floor(number / 100)]}${number % 100 ? ` e ${extensoAte999(number % 100)}` : ''}`;
}

function numeroPorExtenso(value) {
  const numeric = Number(String(value || '').replace(/R\$/gi, '').replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
  const inteiro = Math.floor(numeric);
  const centavos = Math.round((numeric - inteiro) * 100);
  const parts = [];
  const milhoes = Math.floor(inteiro / 1_000_000);
  const milhares = Math.floor((inteiro % 1_000_000) / 1000);
  const resto = inteiro % 1000;

  if (milhoes) parts.push(`${extensoAte999(milhoes)} ${milhoes === 1 ? 'milhao' : 'milhoes'}`);
  if (milhares) parts.push(milhares === 1 ? 'mil' : `${extensoAte999(milhares)} mil`);
  if (resto) parts.push(extensoAte999(resto));

  const reais = parts.length ? `${parts.join(' e ')} ${inteiro === 1 ? 'real' : 'reais'}` : 'zero real';
  if (!centavos) return reais;
  return `${reais} e ${extensoAte999(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`;
}

function clear(page, x, y, width, height) {
  page.drawRectangle({ x, y, width, height, color: white });
}

function draw(page, text, x, y, options = {}) {
  const { font, size = 10, maxWidth = 470, lineHeight = size + 3 } = options;
  const words = safeText(text).split(' ');
  let line = '';
  let cursorY = y;

  words.forEach((word) => {
    const nextLine = line ? `${line} ${word}` : word;
    const width = font.widthOfTextAtSize(nextLine, size);
    if (width > maxWidth && line) {
      page.drawText(line, { x, y: cursorY, font, size, color: black });
      line = word;
      cursorY -= lineHeight;
    } else {
      line = nextLine;
    }
  });

  if (line) page.drawText(line, { x, y: cursorY, font, size, color: black });
}

function drawField(page, label, value, x, y, options = {}) {
  draw(page, `${label}: ${safeText(value) || '-'}`, x, y, options);
}

function getTodayLabel() {
  return new Intl.DateTimeFormat('pt-BR').format(new Date());
}

function fileNameSafe(value) {
  return safeText(value).replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '') || 'contrato';
}

async function preparePdf(template) {
  const pdf = await PDFDocument.load(dataUrlToBytes(template.fileData));
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  return { pdf, font, bold };
}

async function generateMotorContract(template, form) {
  const { pdf, font, bold } = await preparePdf(template);
  const pages = pdf.getPages();
  const paymentPage = pages[1];
  clear(paymentPage, 258, 180, 285, 22);
  draw(paymentPage, `${brl(form.value)} - ${form.paymentTerms}`, 260, 187, { font, size: 11, maxWidth: 270 });

  const page = pages[2];
  clear(page, 106, 646, 145, 18);
  draw(page, form.motorModel, 108, 650, { font, size: 10, maxWidth: 150 });
  clear(page, 386, 646, 135, 18);
  draw(page, form.motorSerial, 388, 650, { font, size: 10, maxWidth: 130 });

  clear(page, 88, 568, 170, 18);
  draw(page, form.aircraftManufacturer, 90, 572, { font, size: 10, maxWidth: 165 });
  clear(page, 75, 543, 160, 18);
  draw(page, form.aircraftModel, 77, 547, { font, size: 10, maxWidth: 155 });
  clear(page, 355, 543, 130, 18);
  draw(page, form.aircraftSerial, 357, 547, { font, size: 10, maxWidth: 125 });
  clear(page, 72, 518, 140, 18);
  draw(page, form.aircraftPrefix, 74, 522, { font, size: 10, maxWidth: 135 });

  clear(page, 34, 384, 520, 102);
  drawField(page, 'Nome', form.name, 36, 470, { font, size: 10, maxWidth: 500 });
  drawField(page, 'Endereco', form.address, 36, 454, { font, size: 10, maxWidth: 500 });
  draw(page, `Cidade: ${safeText(form.city) || '-'}    Estado: ${safeText(form.state) || '-'}    CEP: ${safeText(form.zipCode) || '-'}`, 36, 438, { font, size: 10, maxWidth: 500 });
  drawField(page, 'CPF/CNPJ', form.document, 36, 422, { font, size: 10, maxWidth: 500 });
  drawField(page, 'E-mail', form.email, 36, 406, { font, size: 10, maxWidth: 500 });
  draw(page, `Telefone: ${safeText(form.phone) || '-'}    Data: ${safeText(form.date) || getTodayLabel()}`, 36, 390, { font, size: 10, maxWidth: 500 });

  clear(page, 250, 246, 150, 44);
  draw(page, form.name, 263, 274, { font: bold, size: 10, maxWidth: 190 });
  draw(page, form.document, 263, 248, { font, size: 10, maxWidth: 190 });

  return {
    bytes: await pdf.save(),
    fileName: `Contrato_motor_${fileNameSafe(form.name)}.pdf`,
  };
}

async function generateTrainingContract(template, form) {
  const { pdf, font, bold } = await preparePdf(template);
  const pages = pdf.getPages();
  const page1 = pages[0];
  clear(page1, 80, 704, 430, 40);
  draw(page1, `${form.name}, situada em ${form.address}, inscrita no CNPJ/CPF sob no ${form.document}.`, 84, 719, { font, size: 10, maxWidth: 420 });
  clear(page1, 118, 278, 310, 18);
  draw(page1, `${form.courses} - ${form.duration}`, 121, 282, { font, size: 10, maxWidth: 300 });

  const page2 = pages[1];
  clear(page2, 136, 197, 360, 18);
  draw(page2, `${brl(form.totalValue)} (${numeroPorExtenso(form.totalValue)})`, 139, 201, { font, size: 10, maxWidth: 350 });
  clear(page2, 252, 160, 230, 20);
  draw(page2, form.paymentTerms, 254, 164, { font, size: 10, maxWidth: 220 });

  const lastPage = pages[pages.length - 1];
  clear(lastPage, 140, 559, 160, 18);
  draw(lastPage, form.date || getTodayLabel(), 142, 563, { font, size: 10, maxWidth: 150 });
  clear(lastPage, 83, 486, 230, 44);
  draw(lastPage, form.name, 85, 502, { font: bold, size: 10, maxWidth: 230 });
  draw(lastPage, form.document, 85, 488, { font, size: 10, maxWidth: 230 });

  return {
    bytes: await pdf.save(),
    fileName: `Contrato_treinamento_${fileNameSafe(form.name)}.pdf`,
  };
}

async function generateReturnContract(template, form) {
  const { pdf, font, bold } = await preparePdf(template);
  const page = pdf.getPages()[0];
  const total = (form.items || []).reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unitValue || 0)), 0);

  clear(page, 80, 688, 170, 18);
  draw(page, `${form.city || '-'}, ${form.date || getTodayLabel()}`, 83, 692, { font, size: 10, maxWidth: 170 });
  clear(page, 484, 486, 55, 16);
  draw(page, form.invoiceNumber, 486, 490, { font, size: 9, maxWidth: 55 });
  clear(page, 92, 474, 70, 16);
  draw(page, form.date || getTodayLabel(), 95, 478, { font, size: 9, maxWidth: 70 });

  clear(page, 82, 431, 460, 76);
  (form.items || []).slice(0, 5).forEach((item, index) => {
    const y = 438 - index * 14;
    const quantity = Number(item.quantity || 0);
    const unitValue = Number(item.unitValue || 0);
    const lineTotal = Number(item.totalValue || quantity * unitValue || 0);
    draw(page, item.productCode, 84, y, { font, size: 8, maxWidth: 85 });
    draw(page, item.description, 214, y, { font, size: 8, maxWidth: 90 });
    draw(page, String(quantity || ''), 309, y, { font, size: 8, maxWidth: 35 });
    draw(page, brl(unitValue), 405, y, { font, size: 8, maxWidth: 70 });
    draw(page, brl(lineTotal), 498, y, { font, size: 8, maxWidth: 70 });
  });

  clear(page, 449, 314, 85, 18);
  draw(page, brl(total), 452, 318, { font: bold, size: 9, maxWidth: 80 });

  clear(page, 80, 160, 250, 72);
  draw(page, form.name, 83, 216, { font: bold, size: 10, maxWidth: 240 });
  draw(page, form.document, 83, 204, { font, size: 10, maxWidth: 240 });
  draw(page, form.address, 83, 192, { font, size: 10, maxWidth: 240 });
  draw(page, `${form.city || '-'} - ${form.state || '-'}`, 83, 180, { font, size: 10, maxWidth: 240 });
  draw(page, form.zipCode, 83, 168, { font, size: 10, maxWidth: 240 });

  return {
    bytes: await pdf.save(),
    fileName: `Devolucao_${fileNameSafe(form.name)}.pdf`,
  };
}

export async function generateContractPdf(type, template, form) {
  if (!template?.fileData) throw new Error('Faca upload do modelo de contrato antes de gerar o PDF.');
  if (type === 'motor') return generateMotorContract(template, form);
  if (type === 'training') return generateTrainingContract(template, form);
  if (type === 'return') return generateReturnContract(template, form);
  throw new Error('Tipo de contrato invalido.');
}
