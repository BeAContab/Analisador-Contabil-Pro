import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { BalanceComparisonReport, CompanyReport, LedgerLine, UnclassifiedLine } from '../types';
import { balanceNature, isZeroMoney, parseBrazilianMoney } from './format';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface TextItem {
  text: string;
  x: number;
  y: number;
  page: number;
}

interface PageLine {
  page: number;
  text: string;
}

interface PdfTextItem {
  str: string;
  transform: number[];
}

const accountRegex = /^\s*(\d+(?:\.\d+)*)\b/;
const cnpjRegex = /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/;
const companyCodeRegex = /^\(\s*(\d+)\s*-\s*(\d+)\s*\)\s*(.+)$/;
const moneyRegex = /\(?\d{1,3}(?:\.\d{3})*,\d{2}\)?[DC]?|\(?\d+,\d{2}\)?[DC]?|\b0(?:[,.]00)?\b/gi;
const moneyBoundaryRegex = /([A-Za-zÀ-ÿ])(\(?\d{1,3}(?:\.\d{3})*,\d{2}\)?[DC]?)/g;
const defaultNatureAccounts = ['1.2.05.007', '2.4.13.004'];

export async function parsePdfFile(file: File): Promise<CompanyReport> {
  const errors: string[] = [];

  try {
    const buffer = await file.arrayBuffer();
    const document = await pdfjsLib.getDocument({ data: buffer }).promise;
    const pageLines: PageLine[] = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const items = content.items
        .filter((item) => typeof item === 'object' && item !== null && 'str' in item && 'transform' in item)
        .map((item) => {
          const textItem = item as PdfTextItem;
          return {
            text: textItem.str,
            x: textItem.transform[4],
            y: textItem.transform[5],
            page: pageNumber
          };
        })
        .filter((item) => item.text.trim().length > 0);

      pageLines.push(...groupItemsIntoLines(items));
    }

    const allText = pageLines.map((line) => line.text).join('\n');
    const meta = extractMetadata(allText, file.name);
    const parsed = extractLedgerLines(pageLines);
    const rows = parsed.rows;
    const invertedRows = rows
      .filter((row) => {
        const nature = balanceNature(row.currentBalance);
        return (
          !isDefaultNatureAccount(row.account) &&
          ((row.account.startsWith('1') && nature === 'C') ||
            (row.account.startsWith('2') && nature === 'D'))
        );
      })
      .map((row) => ({
        ...row,
        alertType: row.account.startsWith('1')
          ? ('Ativo com saldo C' as const)
          : ('Passivo/PL com saldo D' as const)
      }));

    const zeroMovementRows = enrichZeroMovementRows(
      rows.filter((row) => isZeroMoney(row.debit, row.debitNumber) && isZeroMoney(row.credit, row.creditNumber)),
      rows
    );
    const comparisonReport = buildComparisonReport(rows);

    if (rows.length === 0) {
      errors.push('Não foi possível identificar linhas contábeis neste arquivo.');
    }

    return {
      id: `${file.name}-${file.size}-${file.lastModified}`,
      fileName: file.name,
      companyCode: meta.companyCode,
      companyName: meta.companyName,
      cnpj: meta.cnpj,
      period: meta.period,
      rows,
      unclassified: parsed.unclassified,
      invertedRows,
      zeroMovementRows,
      comparisonReport,
      errors
    };
  } catch (error) {
    return {
      id: `${file.name}-${file.size}-${file.lastModified}`,
      fileName: file.name,
      companyCode: undefined,
      companyName: file.name.replace(/\.pdf$/i, ''),
      cnpj: 'CNPJ não identificado',
      period: 'Período não identificado',
      rows: [],
      unclassified: [],
      invertedRows: [],
      zeroMovementRows: [],
      comparisonReport: buildComparisonReport([]),
      errors: ['Não foi possível ler este PDF. Verifique se o arquivo está no formato esperado.']
    };
  }
}

function groupItemsIntoLines(items: TextItem[]): PageLine[] {
  const buckets: TextItem[][] = [];

  [...items]
    .sort((a, b) => b.y - a.y || a.x - b.x)
    .forEach((item) => {
      const bucket = buckets.find((line) => Math.abs(line[0].y - item.y) <= 3);
      if (bucket) {
        bucket.push(item);
      } else {
        buckets.push([item]);
      }
    });

  return buckets.map((bucket) => {
    const sorted = bucket.sort((a, b) => a.x - b.x);
    const pieces: string[] = [];
    let previousX = 0;

    sorted.forEach((item, index) => {
      const gap = index === 0 ? 0 : item.x - previousX;
      if (index > 0 && gap > 12) pieces.push(' ');
      pieces.push(item.text);
      previousX = item.x + Math.max(item.text.length * 4, 8);
    });

    return {
      page: sorted[0].page,
      text: normalizeLine(pieces.join(''))
    };
  });
}

function extractMetadata(text: string, fileName: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => normalizeLine(line))
    .filter(Boolean);

  const companyLine =
    lines.find((line) => /^\(\s*[^)]*\)\s+.+/i.test(line)) ||
    lines.find((line) => /LTDA|S\/A|EIRELI|ME\b|EPP\b/i.test(line));

  const companyCodeMatch = companyLine?.match(companyCodeRegex);
  const companyCode = companyCodeMatch ? `${companyCodeMatch[1]}-${companyCodeMatch[2]}` : undefined;
  const companyName = companyCodeMatch
    ? companyCodeMatch[3].trim()
    : companyLine
      ? companyLine.replace(/^\(\s*[^)]*\)\s*/, '').trim() || companyLine
      : fileName.replace(/\.pdf$/i, '');

  const cnpj = text.match(cnpjRegex)?.[0] ?? 'CNPJ não identificado';
  const referenceLine = lines.find((line) => /Refer[eê]ncia/i.test(line));
  const period =
    referenceLine?.match(/(\d{2}\/[A-ZÀ-ÿ]{3}\/\d{4}\s+at[eé]\s+\d{2}\/[A-ZÀ-ÿ]{3}\/\d{4})/i)?.[1] ??
    'Período não identificado';

  return { companyCode, companyName, cnpj, period };
}

function extractLedgerLines(lines: PageLine[]) {
  const rows: LedgerLine[] = [];
  const unclassified: UnclassifiedLine[] = [];
  const candidates = mergeContinuationLines(lines);

  candidates.forEach((line) => {
    if (!accountRegex.test(line.text)) return;

    const row = parseLedgerLine(line.text, line.page);
    if (row) {
      rows.push(row);
    } else {
      unclassified.push({
        page: line.page,
        text: line.text,
        reason: 'Linha começa com conta contábil, mas não possui quatro valores monetários identificáveis.'
      });
    }
  });

  return { rows, unclassified };
}

function mergeContinuationLines(lines: PageLine[]): PageLine[] {
  const merged: PageLine[] = [];

  lines.forEach((line) => {
    const text = normalizeLine(line.text);
    if (!text) return;

    const startsAccount = accountRegex.test(text);
    const previous = merged[merged.length - 1];

    if (!startsAccount && previous && accountRegex.test(previous.text) && !hasFourMoneyValues(previous.text)) {
      previous.text = normalizeLine(`${previous.text} ${text}`);
    } else {
      merged.push({ page: line.page, text });
    }
  });

  return merged;
}

function parseLedgerLine(rawLine: string, page: number): LedgerLine | null {
  const raw = normalizeLine(rawLine.replace(moneyBoundaryRegex, '$1 $2'));
  const accountMatch = raw.match(accountRegex);
  if (!accountMatch) return null;

  const account = accountMatch[1];
  let rest = raw.slice(accountMatch[0].length).trim();
  let code: string | undefined;

  const leadingCode = rest.match(/^(\d{1,8})\s+(?=\D)/);
  if (leadingCode) {
    code = leadingCode[1];
    rest = rest.slice(leadingCode[0].length).trim();
  }

  const trailingCode = rest.match(/\s+(\d{1,8})$/);
  if (!code && trailingCode) {
    code = trailingCode[1];
    rest = rest.slice(0, trailingCode.index).trim();
  }

  const moneyMatches = [...rest.matchAll(moneyRegex)];
  if (moneyMatches.length < 4) return null;

  const lastFour = moneyMatches.slice(-4);
  const firstMoney = lastFour[0];
  const firstMoneyIndex = firstMoney.index ?? -1;
  if (firstMoneyIndex < 0) return null;

  const name = rest.slice(0, firstMoneyIndex).trim();
  if (!name) return null;

  const values = lastFour.map((match) => match[0]);
  const [previousBalance, debit, credit, currentBalance] = values;

  return {
    account,
    name,
    previousBalance,
    debit,
    credit,
    currentBalance,
    code,
    page,
    raw,
    debitNumber: parseBrazilianMoney(debit),
    creditNumber: parseBrazilianMoney(credit)
  };
}

function hasFourMoneyValues(text: string): boolean {
  return [...text.matchAll(moneyRegex)].length >= 4;
}

function isDefaultNatureAccount(account: string): boolean {
  return defaultNatureAccounts.some((defaultAccount) => account === defaultAccount || account.startsWith(`${defaultAccount}.`));
}

function enrichZeroMovementRows(zeroRows: LedgerLine[], allRows: LedgerLine[]): LedgerLine[] {
  const accountNames = new Map(allRows.map((row) => [row.account, row.name]));

  return zeroRows.map((row) => {
    const levels = row.account.split('.');
    if (levels.length < 5) return row;

    const parentAccount = levels.slice(0, 4).join('.');
    const parentName = accountNames.get(parentAccount);
    if (!parentName || row.name.startsWith(`${parentName} - `)) return row;

    return {
      ...row,
      name: `${parentName} - ${row.name}`
    };
  });
}

function buildComparisonReport(rows: LedgerLine[]): BalanceComparisonReport {
  const distributionRow = rows.find(
    (row) =>
      row.account === '1.1.04.019' ||
      normalizeForCompare(row.name).includes('DISTRIBUICAO ANTECIPADA DE LUCROS')
  );
  const resultRow = rows.find(
    (row) => row.account === '3' || normalizeForCompare(row.name) === 'RESULTADO DO PERIODO'
  );

  const distributionValue = distributionRow ? Math.abs(parseBrazilianMoney(distributionRow.currentBalance)) : 0;
  const resultValue = resultRow ? Math.abs(parseBrazilianMoney(resultRow.currentBalance)) : 0;
  const difference = distributionValue - resultValue;
  const isDistributionGreater = distributionValue > resultValue;

  let message = 'Tudo OK: a Distribuição Antecipada de Lucros não é maior que o Resultado do Período.';
  if (!distributionRow || !resultRow) {
    message = 'Atenção: não foi possível localizar uma ou ambas as contas necessárias para a comparação.';
  } else if (isDistributionGreater) {
    message = 'Atenção: a Distribuição Antecipada de Lucros é maior que o Resultado do Período.';
  }

  return {
    distributionRow,
    resultRow,
    distributionValue,
    resultValue,
    difference,
    isDistributionGreater,
    message
  };
}

function normalizeForCompare(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
