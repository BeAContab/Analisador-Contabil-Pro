import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { AnalysisReport, BalanceComparisonReport, CompanyReport, DepreciationPairRow, LedgerLine, UnclassifiedLine } from '../types';
import { balanceNature, isZeroMoney, parseBrazilianMoney } from './format';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface TextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  page: number;
}

interface PageLine {
  page: number;
  text: string;
}

interface PdfTextItem {
  str: string;
  transform: number[];
  width?: number;
}

const accountRegex = /^\s*([1-9](?:\.\d+)*)(?=\s|$)/;
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
            width: textItem.width ?? Math.max(textItem.str.length * 4, 8),
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
    const analysisReports = buildAnalysisReports(rows);

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
      analysisReports,
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
      analysisReports: buildAnalysisReports([]),
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
      previousX = item.x + Math.max(item.width, 8);
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
    previousBalanceNumber: parseBrazilianMoney(previousBalance),
    debitNumber: parseBrazilianMoney(debit),
    creditNumber: parseBrazilianMoney(credit),
    currentBalanceNumber: parseBrazilianMoney(currentBalance)
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
  const account3Row = findAccountRow(rows, '3');
  const account6Row = findAccountRow(rows, '6');
  const account2413Row = findAccountRow(rows, '2.4.13');

  const distributionValue = distributionRow ? Math.abs(parseBrazilianMoney(distributionRow.currentBalance)) : 0;
  const shouldUseFallback = distributionValue === 0;
  const baseValue = shouldUseFallback
    ? signedCurrentBalance(account3Row) + signedCurrentBalance(account6Row)
    : signedCurrentBalance(account3Row) + signedCurrentBalance(account6Row) + signedCurrentBalance(account2413Row);
  const targetValue = shouldUseFallback ? absoluteCurrentBalance(account2413Row) : distributionValue;
  const comparableBaseValue = shouldUseFallback ? Math.abs(baseValue) : baseValue;
  const comparableTargetValue = shouldUseFallback ? Math.abs(targetValue) : targetValue;
  const difference = comparableBaseValue - comparableTargetValue;
  const hasMissingRows =
    !account3Row || (shouldUseFallback ? !account2413Row : !distributionRow || !account2413Row);
  const isAttention = hasMissingRows || comparableBaseValue < comparableTargetValue;

  let message = shouldUseFallback
    ? 'Tudo OK: a soma das contas 3 e 6 é maior que o S. Atual da conta 2.4.13.'
    : 'Tudo OK: a soma das contas 3, 6 e 2.4.13 é maior que o S. Atual da conta 1.1.04.019.';

  if (hasMissingRows) {
    message = 'Atenção: não foi possível localizar todas as contas necessárias para a comparação.';
  } else if (comparableBaseValue < comparableTargetValue) {
    message = shouldUseFallback
      ? 'Atenção: a soma das contas 3 e 6 está menor que o S. Atual da conta 2.4.13.'
      : 'Atenção: a soma das contas 3, 6 e 2.4.13 está menor que o S. Atual da conta 1.1.04.019.';
  }

  return {
    distributionRow,
    account3Row,
    account6Row,
    account2413Row,
    mode: shouldUseFallback ? 'fallback' : 'distribution',
    baseValue,
    targetValue,
    difference,
    isAttention,
    message
  };
}

function buildAnalysisReports(rows: LedgerLine[]): AnalysisReport[] {
  return [
    buildAnalysis1(rows),
    buildAnalysis2(rows),
    buildAnalysis3(rows),
    buildAnalysis4(rows),
    buildAnalysis5(rows),
    buildAnalysis6(rows),
    buildAnalysis7(rows),
    buildAnalysis8(rows),
    buildAnalysis9(rows),
    buildAnalysis10(rows),
    buildAnalysis11(rows)
  ];
}

function buildAnalysis1(rows: LedgerLine[]): AnalysisReport {
  const clientRow = findAccountRow(rows, '1.1.02');
  const isAttention = Boolean(
    clientRow && balanceNature(clientRow.currentBalance) === 'D' && absoluteValue(clientRow.currentBalance) < 10
  );

  return {
    kind: 'analysis1',
    title: 'Clientes com Saldo Atual Baixo',
    intro: 'Mostra a conta 1.1.02 (Clientes) apenas quando o S. Atual estiver com natureza D e valor menor que 10,00.',
    message: clientRow
      ? isAttention
        ? 'Atenção: a conta 1.1.02 (CLIENTES) está com S. Atual menor que 10 e natureza D.'
        : 'Tudo OK: a conta 1.1.02 (CLIENTES) não está com S. Atual menor que 10D.'
      : 'Atenção: a conta 1.1.02 (CLIENTES) não foi localizada no PDF.',
    rows: isAttention && clientRow ? [clientRow] : [],
    isAttention: !clientRow || isAttention
  };
}

function buildAnalysis2(rows: LedgerLine[]): AnalysisReport {
  const matchedRows = rows.filter(
    (row) => row.code === '142' && normalizeForCompare(row.name) === 'CLIENTE PESSOA FISICA'
  );
  const flaggedRows = matchedRows.filter((row) => {
    const previousIsZero = isZeroMoney(row.previousBalance, row.previousBalanceNumber);
    const currentIsZero = isZeroMoney(row.currentBalance, row.currentBalanceNumber);
    const debitEqualsCredit = numbersAreEqual(row.debitNumber, row.creditNumber);
    return !previousIsZero || !currentIsZero || !debitEqualsCredit;
  });

  return {
    kind: 'analysis2',
    title: 'Cliente Pessoa Física Fora da Regra',
    intro: 'Procura a linha Cliente Pessoa Física com Cod. R. 142 e alerta quando S. Anterior ou S. Atual não estão zerados, ou quando Débito e Crédito são diferentes.',
    message:
      matchedRows.length === 0
        ? 'Atenção: nenhuma linha com nome Cliente Pessoa Física e Cod. R. 142 foi localizada.'
        : flaggedRows.length > 0
          ? 'Atenção: foram encontradas linhas de Cliente Pessoa Física com Cod. R. 142 fora da regra.'
          : 'Tudo OK: as linhas de Cliente Pessoa Física com Cod. R. 142 seguem as regras informadas.',
    rows: flaggedRows,
    isAttention: matchedRows.length === 0 || flaggedRows.length > 0
  };
}

function buildAnalysis3(rows: LedgerLine[]): AnalysisReport {
  const clientRow = findAccountRow(rows, '1.1.02');
  const merchandiseRows = rows.filter((row) => row.code === '2652');
  const serviceRows = rows.filter((row) => row.code === '2700');
  const productRows = rows.filter((row) => row.code === '2603');
  const merchandiseCredit = sumCredits(merchandiseRows);
  const serviceCredit = sumCredits(serviceRows);
  const productCredit = sumCredits(productRows);
  const targetValue = merchandiseCredit + serviceCredit + productCredit;
  const hasMissingRows = !clientRow || merchandiseRows.length === 0 || serviceRows.length === 0 || productRows.length === 0;
  const difference = (clientRow?.debitNumber ?? 0) - targetValue;
  const isBalanced = numbersAreEqual(clientRow?.debitNumber, targetValue);
  const isAttention = !isBalanced;
  const calculationRows =
    !isBalanced
      ? ([clientRow, ...merchandiseRows, ...serviceRows, ...productRows].filter(Boolean) as LedgerLine[])
      : [];

  return {
    kind: 'analysis3',
    title: 'Conciliação Clientes x Receitas Operacionais',
    intro: 'Compara o Débito da conta 1.1.02 (Clientes) com a soma dos Créditos das linhas de Cod. R. 2652, 2700 e 2603.',
    message: isBalanced
      ? 'Tudo OK: o Débito da conta 1.1.02 está igual à soma dos Créditos de Vendas de Mercadorias (Cod. R. 2652), Prestação de Serviços (Cod. R. 2700) e Vendas de Produtos (Cod. R. 2603).'
      : hasMissingRows
      ? 'Atenção: não foi possível localizar a conta 1.1.02 e/ou as linhas de Cod. R. 2652, 2700 e 2603 para comparação.'
      : 'Atenção: o Débito da conta 1.1.02 difere da soma dos Créditos de Vendas de Mercadorias (Cod. R. 2652), Prestação de Serviços (Cod. R. 2700) e Vendas de Produtos (Cod. R. 2603).',
    rows: calculationRows,
    isAttention,
    calculation: {
      formula:
        'Débito da conta 1.1.02 (Clientes) deve ser igual ao Crédito das linhas Cod. R. 2652 (Vendas de Mercadorias) mais Cod. R. 2700 (Prestação de Serviços) mais Cod. R. 2603 (Vendas de Produtos).',
      items: [
        { label: 'Débito de 1.1.02 (CLIENTES)', value: clientRow?.debitNumber ?? 0 },
        { label: 'Crédito Cod. R. 2652 (VENDAS DE MERCADORIAS)', value: merchandiseCredit },
        { label: 'Crédito Cod. R. 2700 (PRESTAÇÃO DE SERVIÇOS)', value: serviceCredit },
        { label: 'Crédito Cod. R. 2603 (VENDAS DE PRODUTOS)', value: productCredit },
        { label: 'Soma das receitas', value: targetValue },
        { label: 'Diferença', value: difference }
      ]
    }
  };
}

function buildAnalysis4(rows: LedgerLine[]): AnalysisReport {
  const clientRows = findAccountFamily(rows, '1.1.02').filter(
    (row) =>
      balanceNature(row.currentBalance) === 'D' &&
      absoluteValue(row.currentBalance) > 0 &&
      absoluteValue(row.currentBalance) <= 10
  );

  return {
    kind: 'analysis4',
    title: 'Clientes com Saldo Residual',
    intro: 'Mostra contas da família 1.1.02 quando o S. Atual estiver com natureza D, maior que 0 e menor ou igual a 10,00.',
    message:
      clientRows.length > 0
        ? 'Atenção: foram encontrados Clientes e/ou subitens com S. Atual maior que 0 e menor ou igual a 10D.'
        : 'Tudo OK: não foram encontrados Clientes ou subitens com S. Atual entre 0 e 10D.',
    rows: clientRows,
    isAttention: clientRows.length > 0
  };
}

function buildAnalysis5(rows: LedgerLine[]): AnalysisReport {
  const flaggedRows = findAccountFamily(rows, '1.1.02').filter(
    (row) => absoluteValue(row.previousBalance) > 0 && row.debitNumber > 0 && isZeroMoney(row.credit, row.creditNumber)
  );

  return {
    kind: 'analysis5',
    title: 'Clientes sem Crédito no Período',
    intro: 'Mostra contas da família 1.1.02 quando S. Anterior e Débito são maiores que zero e o Crédito está zerado.',
    message:
      flaggedRows.length > 0
        ? 'Atenção: foram encontrados Clientes e/ou subitens com S. Anterior e Débito maiores que zero e Crédito zerado.'
        : 'Tudo OK: não foram encontrados Clientes ou subitens nesta condição.',
    rows: flaggedRows,
    isAttention: flaggedRows.length > 0
  };
}

function buildAnalysis6(rows: LedgerLine[]): AnalysisReport {
  const flaggedRows = findAccountFamily(rows, '2.1.03').filter(
    (row) =>
      absoluteValue(row.previousBalance) > 0 &&
      row.creditNumber > 0 &&
      absoluteValue(row.currentBalance) > 0 &&
      isZeroMoney(row.debit, row.debitNumber)
  );

  return {
    kind: 'analysis6',
    title: 'Fornecedores sem Débito no Período',
    intro: 'Mostra contas da família 2.1.03 quando S. Anterior, Crédito e S. Atual são maiores que zero e o Débito está zerado.',
    message:
      flaggedRows.length > 0
        ? 'Atenção: foram encontrados Fornecedores e/ou subitens com Débito zerado e S. Anterior, Crédito e S. Atual positivos.'
        : 'Tudo OK: não foram encontrados Fornecedores ou subitens nesta condição.',
    rows: flaggedRows,
    isAttention: flaggedRows.length > 0
  };
}

function buildAnalysis7(rows: LedgerLine[]): AnalysisReport {
  const stockRow = findAccountRow(rows, '1.1.08');
  const supplierRow = findAccountRow(rows, '2.1.03');
  const missingSupplier = !supplierRow;
  const missingStock = !stockRow;
  const isAttention = missingSupplier || (!missingStock && stockRow.debitNumber > supplierRow.creditNumber);

  return {
    kind: 'analysis7',
    title: 'Validação Estoques x Fornecedores',
    intro: 'Compara o Débito da conta 1.1.08 com o Crédito da conta 2.1.03 e alerta quando Estoques fica maior que Fornecedores.',
    message: missingSupplier
      ? 'Atenção: não foi possível localizar a conta 2.1.03 para comparação.'
      : missingStock
        ? 'Tudo OK: a conta 1.1.08 não foi localizada, então este relatório pode permanecer oculto.'
      : isAttention
        ? 'Atenção: o Débito da conta 1.1.08 está maior que o Crédito da conta 2.1.03.'
        : 'Tudo OK: o Débito da conta 1.1.08 não está maior que o Crédito da conta 2.1.03.',
    rows: !missingStock && isAttention ? [stockRow, supplierRow].filter(Boolean) as LedgerLine[] : [],
    isAttention
  };
}

function buildAnalysis8(rows: LedgerLine[]): AnalysisReport {
  const supplierRows = findAccountFamily(rows, '2.1.03').filter(
    (row) =>
      balanceNature(row.currentBalance) === 'C' &&
      absoluteValue(row.currentBalance) > 0 &&
      absoluteValue(row.currentBalance) <= 10
  );

  return {
    kind: 'analysis8',
    title: 'Fornecedores com Saldo Residual',
    intro: 'Mostra contas da família 2.1.03 quando o S. Atual estiver com natureza C, maior que 0 e menor ou igual a 10,00.',
    message:
      supplierRows.length > 0
        ? 'Atenção: foram encontrados Fornecedores e/ou subitens com S. Atual maior que 0 e menor ou igual a 10C.'
        : 'Tudo OK: não foram encontrados Fornecedores ou subitens com S. Atual entre 0 e 10C.',
    rows: supplierRows,
    isAttention: supplierRows.length > 0
  };
}

function buildAnalysis9(rows: LedgerLine[]): AnalysisReport {
  const flaggedRows = findAccountFamily(rows, '2.1.03').filter(
    (row) => absoluteValue(row.previousBalance) > 0 && row.creditNumber > 0 && isZeroMoney(row.debit, row.debitNumber)
  );

  return {
    kind: 'analysis9',
    title: 'Fornecedores com Crédito sem Débito',
    intro: 'Mostra contas da família 2.1.03 quando S. Anterior e Crédito são maiores que zero e o Débito está zerado.',
    message:
      flaggedRows.length > 0
        ? 'Atenção: foram encontrados Fornecedores e/ou subitens com S. Anterior e Crédito maiores que zero e Débito zerado.'
        : 'Tudo OK: não foram encontrados Fornecedores ou subitens nesta condição.',
    rows: flaggedRows,
    isAttention: flaggedRows.length > 0
  };
}

function buildAnalysis10(rows: LedgerLine[]): AnalysisReport {
  const cmvRows = rows.filter((row) => row.code === '3001');
  const productRows = rows.filter((row) => row.code === '2603');
  const merchandiseRows = rows.filter((row) => row.code === '2652');
  const serviceRows = rows.filter((row) => row.code === '2700');

  const cmvDebits = cmvRows.reduce((sum, row) => sum + row.debitNumber, 0);
  const cmvCredits = cmvRows.reduce((sum, row) => sum + row.creditNumber, 0);
  const netCmv = cmvDebits - cmvCredits;
  const productCredits = sumCredits(productRows);
  const merchandiseCredits = sumCredits(merchandiseRows);
  const serviceCredits = sumCredits(serviceRows);
  const totalRevenue = productCredits + merchandiseCredits + serviceCredits;
  const percentage = totalRevenue > 0 ? netCmv / totalRevenue : 0;
  const missingCodes: string[] = [];
  if (cmvRows.length === 0) missingCodes.push('3001');
  if (productRows.length === 0) missingCodes.push('2603');
  if (merchandiseRows.length === 0) missingCodes.push('2652');
  if (serviceRows.length === 0) missingCodes.push('2700');
  const hasMissingRows = missingCodes.length > 0;
  const hasZeroRevenue = numbersAreEqual(totalRevenue, 0);
  const isAttention = hasMissingRows || hasZeroRevenue || percentage > 1;
  const calculationRows = isAttention
    ? [...cmvRows, ...productRows, ...merchandiseRows, ...serviceRows]
    : [];

  let message =
    'Tudo OK: o CMV liquido do Cod. R. 3001 nao ultrapassa a soma das receitas dos Cod. R. 2603, 2652 e 2700.';

  if (hasMissingRows) {
    message =
      `Atencao: base incompleta para o calculo do CMV/Receita. Cod. R. ausente(s): ${missingCodes.join(', ')}.`;
  } else if (hasZeroRevenue) {
    message =
      'Atencao: a soma das receitas dos Cod. R. 2603, 2652 e 2700 ficou zerada, entao o percentual de CMV nao pode ser calculado.';
  } else if (percentage > 1) {
    message =
      'Atencao: o CMV liquido do Cod. R. 3001 esta maior que a soma das receitas dos Cod. R. 2603, 2652 e 2700.';
  }

  return {
    kind: 'analysis10',
    title: 'CMV x Receita Mercadorias',
    intro:
      'Calcula (Debitos do Cod. R. 3001 menos Creditos do Cod. R. 3001) dividido pela soma dos Creditos dos Cod. R. 2603, 2652 e 2700.',
    message,
    rows: calculationRows,
    isAttention,
    calculation: {
      formula:
        '(Debitos Cod. R. 3001 - Creditos Cod. R. 3001) / (Creditos Cod. R. 2603 + Creditos Cod. R. 2652 + Creditos Cod. R. 2700)',
      items: [
        { label: 'Debitos Cod. R. 3001', value: cmvDebits },
        { label: 'Creditos Cod. R. 3001', value: cmvCredits },
        { label: 'CMV liquido', value: netCmv },
        { label: 'Creditos Cod. R. 2603', value: productCredits },
        { label: 'Creditos Cod. R. 2652', value: merchandiseCredits },
        { label: 'Creditos Cod. R. 2700', value: serviceCredits },
        { label: 'Receita total considerada', value: totalRevenue },
        { label: 'Percentual CMV/Receita', value: percentage, format: 'percentage' }
      ]
    }
  };
}

function buildAnalysis11(rows: LedgerLine[]): AnalysisReport {
  const assetRoot = rows.find((row) => row.account === '1.2.05' && normalizeForCompare(row.name) === 'IMOBILIZADO');
  const depreciationRoot = rows.find(
    (row) =>
      row.account === '1.2.05.007' &&
      normalizeForCompare(row.name).includes('DEPRECIACAO/AMORTIZACAO/EXAUST')
  );

  const missingRoots = !assetRoot || !depreciationRoot;
  if (missingRoots) {
    return {
      kind: 'analysis11',
      title: 'Depreciacao x Bens',
      intro:
        'Compara os valores de S. Atual dos bens dentro de IMOBILIZADO com suas respectivas contas de depreciacao acumulada, excluindo IMOBILIZADO EM ANDAMENTO.',
      message: 'Atencao: nao foi possivel localizar as contas raiz de IMOBILIZADO e/ou (-)DEPRECIACAO/AMORTIZACAO/EXAUSTAO ACUMULADA.',
      rows: [],
      depreciationPairs: [],
      isAttention: true
    };
  }

  const excludedRoot = rows.find(
    (row) =>
      row.account.startsWith(`${assetRoot.account}.`) &&
      normalizeForCompare(row.name) === 'IMOBILIZADO EM ANDAMENTO'
  );
  const excludedPrefix = excludedRoot?.account;

  const assetRows = rows.filter((row) => {
    if (row.account === assetRoot.account) return false;
    if (!row.account.startsWith(`${assetRoot.account}.`)) return false;
    if (row.account.startsWith(`${depreciationRoot.account}.`)) return false;
    if (excludedPrefix && (row.account === excludedPrefix || row.account.startsWith(`${excludedPrefix}.`))) return false;
    return true;
  });

  const depreciationRows = rows.filter((row) => {
    if (row.account === depreciationRoot.account) return false;
    return row.account.startsWith(`${depreciationRoot.account}.`);
  });

  const assetMap = new Map<string, LedgerLine[]>();
  assetRows.forEach((row) => {
    const key = normalizeAssetDepreciationPairName(row.name);
    if (!key) return;
    const existing = assetMap.get(key) ?? [];
    existing.push(row);
    assetMap.set(key, existing);
  });

  const flaggedRows: LedgerLine[] = [];
  const depreciationPairs: DepreciationPairRow[] = [];
  const usedAssetAccounts = new Set<string>();
  const calculationItems: Array<{ label: string; value: number }> = [];

  depreciationRows.forEach((depreciationRow) => {
    const key = normalizeAssetDepreciationPairName(depreciationRow.name);
    if (!key) return;

    const assetCandidates = (assetMap.get(key) ?? []).sort((left, right) => right.account.length - left.account.length);
    const matchedAsset = assetCandidates.find((candidate) => !usedAssetAccounts.has(candidate.account));
    const depreciationValue = absoluteCurrentBalance(depreciationRow);

    if (!matchedAsset) {
      flaggedRows.push(depreciationRow);
      depreciationPairs.push({
        assetCode: '',
        assetName: 'Bem equivalente nao localizado',
        assetCurrentBalance: '',
        depreciationCode: depreciationRow.code ?? '',
        depreciationName: depreciationRow.name,
        depreciationCurrentBalance: depreciationRow.currentBalance,
        correctiveAction: 'Localizar ou cadastrar o bem correspondente a esta depreciacao/exaustao e revisar a classificacao contabil.'
      });
      calculationItems.push({
        label: `Depreciacao sem bem equivalente: ${depreciationRow.name}`,
        value: depreciationValue
      });
      return;
    }

    usedAssetAccounts.add(matchedAsset.account);
    const assetValue = absoluteCurrentBalance(matchedAsset);

    if (depreciationValue > assetValue) {
      flaggedRows.push(matchedAsset, depreciationRow);
      depreciationPairs.push({
        assetCode: matchedAsset.code ?? '',
        assetName: matchedAsset.name,
        assetCurrentBalance: matchedAsset.currentBalance,
        depreciationCode: depreciationRow.code ?? '',
        depreciationName: depreciationRow.name,
        depreciationCurrentBalance: depreciationRow.currentBalance,
        correctiveAction: 'Revisar o pareamento entre o bem e sua depreciacao, pois a depreciacao acumulada esta maior que o valor do bem.'
      });
      calculationItems.push(
        { label: `Bem: ${matchedAsset.name}`, value: assetValue },
        { label: `Depreciacao: ${depreciationRow.name}`, value: depreciationValue },
        { label: `Excesso de depreciacao: ${matchedAsset.name}`, value: depreciationValue - assetValue }
      );
    }
  });

  return {
    kind: 'analysis11',
    title: 'Depreciacao x Bens',
    intro:
      'Compara os valores de S. Atual de cada bem dentro de IMOBILIZADO com a sua depreciacao equivalente, ignorando C/D e parenteses, e excluindo IMOBILIZADO EM ANDAMENTO.',
    message:
      depreciationPairs.length > 0
        ? 'Atencao: foram encontradas depreciacoes maiores que os bens equivalentes e/ou depreciacoes sem bem correspondente.'
        : 'Tudo OK: nao foram encontradas depreciacoes maiores que os bens equivalentes nem depreciacoes sem bem correspondente.',
    rows: flaggedRows,
    depreciationPairs,
    isAttention: depreciationPairs.length > 0,
    calculation: calculationItems.length > 0
      ? {
          formula:
            'Comparacao entre o valor numerico de S. Atual dos bens do grupo IMOBILIZADO e o valor numerico de S. Atual das respectivas contas de depreciacao acumulada equivalentes.',
          items: calculationItems
        }
      : undefined
  };
}

function findAccountRow(rows: LedgerLine[], account: string): LedgerLine | undefined {
  return rows.find((row) => row.account === account);
}

function findAccountFamily(rows: LedgerLine[], account: string): LedgerLine[] {
  return rows.filter((row) => row.account === account || row.account.startsWith(`${account}.`));
}

function absoluteCurrentBalance(row?: LedgerLine): number {
  return row ? Math.abs(parseBrazilianMoney(row.currentBalance)) : 0;
}

function absoluteValue(value: string): number {
  return Math.abs(parseBrazilianMoney(value));
}

function numbersAreEqual(left?: number, right?: number): boolean {
  if (left === undefined || right === undefined) return false;
  return Math.abs(left - right) < 0.005;
}

function sumCredits(rows: LedgerLine[]): number {
  return rows.reduce((sum, row) => sum + row.creditNumber, 0);
}

function signedCurrentBalance(row?: LedgerLine): number {
  if (!row) return 0;
  const value = Math.abs(parseBrazilianMoney(row.currentBalance));
  return balanceNature(row.currentBalance) === 'D' ? -value : value;
}

function normalizeForCompare(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeAssetDepreciationPairName(value: string): string {
  return normalizeForCompare(value)
    .replace(/^\(-\)\s*/g, '')
    .replace(/P\//g, ' PARA ')
    .replace(/\bCONTR\.?/g, ' CONTRATUAIS ')
    .replace(/\bEXPL\.?/g, ' EXPLORACAO ')
    .replace(/\bDEPREC(?:IACAO)?\.?\s*/g, '')
    .replace(/\bAMORT(?:IZACAO)?\.?\s*/g, '')
    .replace(/\bEXAUST(?:AO)?\.?\s*/g, '')
    .replace(/\bACUMULADA\b/g, '')
    .replace(/[.\-_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
