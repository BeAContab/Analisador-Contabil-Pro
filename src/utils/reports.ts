import { AnalysisCalculation, AnalysisKind, CompanyReport, DepreciationPairRow, InvertedBalanceRow, LedgerLine, ReportKind } from '../types';
import { balanceNature, classifyAccount, formatNumberAsBrazilianMoney, formatNumberAsPercentage, nowLabel, parseBrazilianMoney, slugify } from './format';

const balanceColumns = [
  'Natureza',
  'Conta Contabil',
  'Cod. R.',
  'Nome da Conta',
  'S. Anterior',
  'Debito',
  'Credito',
  'S. Atual',
  'Acao corretiva'
];

const comparisonColumns = [
  'Item',
  'Natureza',
  'Conta Contabil',
  'Nome da Conta',
  'S. Atual',
  'Valor no calculo',
  'Status',
  'Acao corretiva'
];

const depreciationColumns = [
  'Cod. R. do bem',
  'Nome da Conta do bem',
  'S. Atual do bem',
  'Cod. R. da depreciacao/amortizacao/exaustao',
  'Nome da Conta da depreciacao/amortizacao/exaustao',
  'S. Atual da depreciacao/amortizacao/exaustao',
  'Acao corretiva'
];

export const analysisOrder: AnalysisKind[] = [
  'analysis1',
  'analysis2',
  'analysis3',
  'analysis4',
  'analysis5',
  'analysis6',
  'analysis7',
  'analysis8',
  'analysis9',
  'analysis10',
  'analysis11',
  'analysis12'
];

export const reportTabs: Array<{ kind: ReportKind; label: string }> = [
  { kind: 'inverted', label: 'Saldos invertidos' },
  { kind: 'zero', label: 'Contas sem movimentacao' },
  { kind: 'comparison', label: 'Distribuicao x Resultado' },
  { kind: 'analysis1', label: 'Clientes com Saldo Atual Baixo' },
  { kind: 'analysis2', label: 'Cliente Pessoa Fisica Fora da Regra' },
  { kind: 'analysis3', label: 'Conciliacao Clientes x Receitas Operacionais' },
  { kind: 'analysis4', label: 'Clientes com Saldo Residual' },
  { kind: 'analysis5', label: 'Clientes sem Credito no Periodo' },
  { kind: 'analysis6', label: 'Fornecedores sem Debito no Periodo' },
  { kind: 'analysis7', label: 'Validacao Estoques x Fornecedores' },
  { kind: 'analysis8', label: 'Fornecedores com Saldo Residual' },
  { kind: 'analysis9', label: 'Fornecedores com Credito sem Debito' },
  { kind: 'analysis10', label: 'CMV x Receita Mercadorias' },
  { kind: 'analysis11', label: 'Depreciacao x Bens' },
  { kind: 'analysis12', label: 'Despesas Credoras na Classe 3' }
];

export function reportRows(company: CompanyReport, kind: ReportKind) {
  if (kind === 'inverted') return company.invertedRows;
  if (kind === 'zero') return company.zeroMovementRows;
  if (kind === 'comparison') return [];
  return company.analysisReports.find((report) => report.kind === kind)?.rows ?? [];
}

export function reportOccurrenceCount(company: CompanyReport, kind: ReportKind) {
  if (kind === 'inverted') return company.invertedRows.length;
  if (kind === 'zero') return company.zeroMovementRows.length;
  if (kind === 'comparison') return company.comparisonReport.isAttention ? 1 : 0;

  const report = company.analysisReports.find((item) => item.kind === kind);
  if (!report) return 0;
  if (kind === 'analysis11') return report.depreciationPairs?.length ?? 0;
  return report.rows.length > 0 ? report.rows.length : report.isAttention ? 1 : 0;
}

export function reportHasOccurrence(company: CompanyReport, kind: ReportKind) {
  return reportOccurrenceCount(company, kind) > 0;
}

export function reportTitle(kind: ReportKind, company?: CompanyReport): string {
  if (kind === 'inverted') return 'Saldos invertidos Ativo/Passivo';
  if (kind === 'zero') return 'Contas sem movimentacao no periodo';
  if (kind === 'comparison') return 'Comparacao Distribuicao x Resultado';
  return company?.analysisReports.find((report) => report.kind === kind)?.title ?? kind;
}

export function analysisMessage(company: CompanyReport, kind: AnalysisKind): string {
  return company.analysisReports.find((report) => report.kind === kind)?.message ?? 'Relatorio nao encontrado.';
}

export function analysisIntro(company: CompanyReport, kind: AnalysisKind): string {
  return company.analysisReports.find((report) => report.kind === kind)?.intro ?? '';
}

export function analysisAttention(company: CompanyReport, kind: AnalysisKind): boolean {
  return company.analysisReports.find((report) => report.kind === kind)?.isAttention ?? true;
}

export function analysisCalculation(company: CompanyReport, kind: AnalysisKind): AnalysisCalculation | undefined {
  return company.analysisReports.find((report) => report.kind === kind)?.calculation;
}

export function analysisDepreciationPairs(company: CompanyReport, kind: AnalysisKind): DepreciationPairRow[] {
  return company.analysisReports.find((report) => report.kind === kind)?.depreciationPairs ?? [];
}

export function reportIntro(kind: ReportKind, company?: CompanyReport): string {
  if (kind === 'inverted') {
    return 'Mostra contas do ativo com S. Atual credor e contas do passivo ou patrimonio liquido com S. Atual devedor.';
  }
  if (kind === 'zero') {
    return 'Mostra contas com Debito igual a zero e Credito igual a zero no periodo.';
  }
  if (kind === 'comparison') {
    return 'Caso 1: Se 1.1.04.019 (DISTRIBUICAO ANTECIPADA DE LUCROS) for maior que 0, o calculo sera: A SOMA de 3 (RESULTADO DO PERIODO), 6 (RESULTADO E REGULARIZACAO) e 2.4.13 (LUCROS E PREJUIZOS ACUMULADOS) MENOS 1.1.04.019 (DISTRIBUICAO ANTECIPADA DE LUCROS).\n\nResumo: (3 + 6 + 2.4.13) - 1.1.04.019\n\nCaso 2: Se 1.1.04.019 (DISTRIBUICAO ANTECIPADA DE LUCROS) estiver zerada ou nao existir, o calculo sera: A SOMA de 3 (RESULTADO DO PERIODO) e 6 (RESULTADO E REGULARIZACAO) MENOS a conta 2.4.13 (LUCROS E PREJUIZOS ACUMULADOS).\n\nResumo: (3 + 6) - 2.4.13';
  }
  return company ? analysisIntro(company, kind) : '';
}

export function reportFileName(company: CompanyReport, extension: 'xlsx' | 'pdf') {
  return `${slugify(company.companyName)}_relatorios-consolidados.${extension}`;
}

export function correctiveAction(kind: ReportKind, row?: LedgerLine | InvertedBalanceRow) {
  if (kind === 'inverted') {
    if ((row as InvertedBalanceRow | undefined)?.alertType === 'Ativo com saldo C') {
      return 'Revisar classificacao, natureza e lancamentos da conta do ativo para eliminar saldo credor indevido no encerramento.';
    }
    if ((row as InvertedBalanceRow | undefined)?.alertType === 'Passivo/PL com saldo D') {
      return 'Revisar classificacao, natureza e lancamentos da conta do passivo ou PL para eliminar saldo devedor indevido no encerramento.';
    }
    return 'Revisar a natureza contabil e os lancamentos que formaram o saldo final para corrigir a inversao identificada.';
  }
  if (kind === 'zero') {
    return 'Confirmar se a conta deveria ter movimentacao no periodo; se sim, revisar integracao, parametrizacao e lancamentos. Se nao, avaliar ocultar, encerrar ou reclassificar a conta.';
  }
  if (kind === 'comparison') {
    return 'Conferir a composicao das contas 3, 6, 2.4.13 e 1.1.04.019, validar a formula aplicada no periodo e ajustar lancamentos ou classificacoes que expliquem a diferenca.';
  }
  if (kind === 'analysis1') {
    return 'Conferir se o saldo do cliente foi baixado corretamente; ajustar recebimentos, compensacoes ou reclassificacoes para eliminar saldo residual abaixo do minimo esperado.';
  }
  if (kind === 'analysis2') {
    return 'Validar cadastro e historico do cliente; se for pessoa fisica fora da politica definida, corrigir cadastro, documentacao de suporte ou classificacao comercial/contabil.';
  }
  if (kind === 'analysis3') {
    return 'Conciliar o saldo de clientes com as receitas operacionais vinculadas, revisando reconhecimento de receita, baixas e possiveis lancamentos faltantes ou em conta incorreta.';
  }
  if (kind === 'analysis4') {
    return 'Investigar o motivo do saldo residual do cliente e ajustar baixas, estornos, abatimentos ou reclassificacoes para zerar diferencas indevidas.';
  }
  if (kind === 'analysis5') {
    return 'Revisar se houve faturamento, recebimento ou baixa sem credito contabil correspondente e regularizar os lancamentos do periodo.';
  }
  if (kind === 'analysis6') {
    return 'Conferir se houve compras, pagamentos ou baixas sem debito contabil correspondente e regularizar os lancamentos do fornecedor no periodo.';
  }
  if (kind === 'analysis7') {
    return 'Comparar saldo de estoques com fornecedores relacionados, validar entradas e saidas e ajustar classificacao ou lancamentos que estejam distorcendo a conciliacao.';
  }
  if (kind === 'analysis8') {
    return 'Analisar o saldo residual do fornecedor e ajustar pagamentos, estornos, compensacoes ou reclassificacoes para eliminar diferencas indevidas.';
  }
  if (kind === 'analysis9') {
    return 'Verificar se houve reconhecimento de obrigacao sem a contrapartida esperada em debito e corrigir os lancamentos do fornecedor.';
  }
  if (kind === 'analysis10') {
    return 'Conferir os Cod. R. 3001, 2603, 2652 e 2700, completar base ausente quando houver, validar receita total diferente de zero e revisar classificacoes/lancamentos se o percentual de CMV ultrapassar 100%.';
  }
  if (kind === 'analysis11') {
    return 'Conferir se cada conta de depreciacao possui bem equivalente, validar o pareamento entre bem e depreciacao e revisar classificacoes/lancamentos quando a depreciacao superar o valor do bem.';
  }
  if (kind === 'analysis12') {
    return 'Revisar classificacao e lancamentos da conta de despesa, pois ela encerrou com saldo credor fora dos grupos de excecao permitidos.';
  }

  return 'Revisar a origem do alerta e ajustar os lancamentos ou classificacoes contabeis relacionados.';
}

export function hasExportContent(company: CompanyReport): boolean {
  return reportTabs.some((tab) => reportHasOccurrence(company, tab.kind));
}

export async function downloadXlsx(company: CompanyReport) {
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();
  const createdAt = nowLabel();

  if (reportHasOccurrence(company, 'inverted')) {
    XLSX.utils.book_append_sheet(
      workbook,
      buildWorksheet(
        XLSX.utils.aoa_to_sheet,
        company,
        reportTitle('inverted'),
        balanceColumns,
        balanceBody(company.invertedRows, 'inverted'),
        createdAt,
        undefined,
        reportIntro('inverted')
      ),
      'Saldos invertidos'
    );
  }
  if (reportHasOccurrence(company, 'zero')) {
    XLSX.utils.book_append_sheet(
      workbook,
      buildWorksheet(
        XLSX.utils.aoa_to_sheet,
        company,
        reportTitle('zero'),
        balanceColumns,
        balanceBody(company.zeroMovementRows, 'zero'),
        createdAt,
        undefined,
        reportIntro('zero')
      ),
      'Sem movimentacao'
    );
  }
  if (reportHasOccurrence(company, 'comparison')) {
    XLSX.utils.book_append_sheet(
      workbook,
      buildWorksheet(
        XLSX.utils.aoa_to_sheet,
        company,
        reportTitle('comparison'),
        comparisonColumns,
        comparisonBody(company),
        createdAt,
        company.comparisonReport.message,
        reportIntro('comparison')
      ),
      'Comparacao'
    );
  }

  analysisOrder.forEach((kind, index) => {
    if (!reportHasOccurrence(company, kind)) return;
    const usesDepreciationPairs = kind === 'analysis11';
    XLSX.utils.book_append_sheet(
      workbook,
      buildWorksheet(
        XLSX.utils.aoa_to_sheet,
        company,
        reportTitle(kind, company),
        usesDepreciationPairs ? depreciationColumns : balanceColumns,
        usesDepreciationPairs ? depreciationBody(analysisDepreciationPairs(company, kind)) : balanceBody(reportRows(company, kind), kind),
        createdAt,
        analysisMessage(company, kind),
        reportIntro(kind, company),
        analysisCalculation(company, kind)
      ),
      `Analise ${index + 1}`
    );
  });

  XLSX.writeFile(workbook, reportFileName(company, 'xlsx'));
}

export async function downloadPdf(company: CompanyReport) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ]);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const createdAt = nowLabel();

  doc.setFontSize(14);
  doc.text('Relatorios consolidados', 40, 36);
  doc.setFontSize(9);
  doc.text(`Empresa: ${company.companyName}`, 40, 58);
  doc.text(`Codigo da empresa: ${company.companyCode ?? '-'}`, 40, 74);
  doc.text(`CNPJ: ${company.cnpj}`, 40, 90);
  doc.text(`Periodo: ${company.period}`, 40, 106);
  doc.text(`Arquivo: ${company.fileName}`, 40, 122);
  doc.text(`Gerado em: ${createdAt}`, 40, 138);

  let nextY = 166;
  if (reportHasOccurrence(company, 'inverted')) {
    nextY = addPdfSection(
      doc,
      autoTable,
      reportTitle('inverted'),
      balanceColumns,
      balanceBody(company.invertedRows, 'inverted'),
      nextY,
      undefined,
      reportIntro('inverted')
    );
  }
  if (reportHasOccurrence(company, 'zero')) {
    nextY = addPdfSection(
      doc,
      autoTable,
      reportTitle('zero'),
      balanceColumns,
      balanceBody(company.zeroMovementRows, 'zero'),
      nextY + 34,
      undefined,
      reportIntro('zero')
    );
  }
  if (reportHasOccurrence(company, 'comparison')) {
    nextY = addPdfSection(
      doc,
      autoTable,
      reportTitle('comparison'),
      comparisonColumns,
      comparisonBody(company),
      nextY + 34,
      company.comparisonReport.message,
      reportIntro('comparison')
    );
  }

  analysisOrder.forEach((kind) => {
    if (!reportHasOccurrence(company, kind)) return;
    const usesDepreciationPairs = kind === 'analysis11';
    nextY = addPdfSection(
      doc,
      autoTable,
      reportTitle(kind, company),
      usesDepreciationPairs ? depreciationColumns : balanceColumns,
      usesDepreciationPairs ? depreciationBody(analysisDepreciationPairs(company, kind)) : balanceBody(reportRows(company, kind), kind),
      nextY + 34,
      analysisMessage(company, kind),
      reportIntro(kind, company),
      analysisCalculation(company, kind)
    );
  });

  doc.save(reportFileName(company, 'pdf'));
}

function buildWorksheet(
  aoaToSheet: (rows: unknown[][]) => ReturnType<(typeof import('xlsx'))['utils']['aoa_to_sheet']>,
  company: CompanyReport,
  title: string,
  columns: string[],
  body: Array<Array<string | number>>,
  createdAt: string,
  message?: string,
  intro?: string,
  calculation?: AnalysisCalculation
): ReturnType<(typeof import('xlsx'))['utils']['aoa_to_sheet']> {
  const rows = [
    ['Relatorio', title],
    ['Empresa', company.companyName],
    ['Codigo da empresa', company.companyCode ?? '-'],
    ['CNPJ', company.cnpj],
    ['Periodo', company.period],
    ['Arquivo', company.fileName],
    ['Gerado em', createdAt],
    ...(intro ? [['Introducao', intro]] : []),
    ...(message ? [['Status', message]] : []),
    ...(calculation
      ? [['Formula', calculation.formula], ...calculation.items.map((item) => [item.label, formatCalculationValue(item.value, item.format)])]
      : []),
    [],
    columns,
    ...(body.length ? body : [['Nenhum resultado encontrado.']])
  ];
  const worksheet = aoaToSheet(rows as unknown[][]);
  worksheet['!cols'] = [
    { wch: 26 },
    { wch: 18 },
    { wch: 10 },
    { wch: 42 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 60 }
  ];
  return worksheet;
}

type JsPdfInstance = InstanceType<typeof import('jspdf').default>;

function addPdfSection(
  doc: JsPdfInstance,
  autoTable: (doc: JsPdfInstance, options: object) => void,
  title: string,
  columns: string[],
  body: Array<Array<string | number>>,
  startY: number,
  message?: string,
  intro?: string,
  calculation?: AnalysisCalculation
) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const normalizedStartY = startY > pageHeight - 120 ? 40 : startY;
  if (normalizedStartY !== startY) {
    doc.addPage();
  }

  doc.setFontSize(11);
  doc.text(title, 40, normalizedStartY);

  let tableStartY = normalizedStartY + 12;
  if (intro) {
    doc.setFontSize(8);
    doc.text(intro, 40, tableStartY, { maxWidth: doc.internal.pageSize.getWidth() - 80 });
    tableStartY += 14;
  }
  if (message) {
    doc.setFontSize(8);
    doc.text(message, 40, tableStartY, { maxWidth: doc.internal.pageSize.getWidth() - 80 });
    tableStartY += 14;
  }
  if (calculation) {
    doc.setFontSize(8);
    doc.text(calculation.formula, 40, tableStartY, { maxWidth: doc.internal.pageSize.getWidth() - 80 });
    tableStartY += 12;
    calculation.items.forEach((item) => {
      doc.text(`${item.label}: ${formatCalculationValue(item.value, item.format)}`, 40, tableStartY, {
        maxWidth: doc.internal.pageSize.getWidth() - 80
      });
      tableStartY += 10;
    });
  }

  autoTable(doc, {
    startY: tableStartY,
    head: [columns],
    body: body.length ? body : [['Nenhum resultado encontrado.']],
    styles: { fontSize: 7, cellPadding: 3, overflow: 'linebreak' },
    headStyles: { fillColor: [21, 78, 94] },
    margin: { left: 36, right: 36 }
  });

  return getFinalY(doc);
}

function balanceBody(rows: Array<LedgerLine | InvertedBalanceRow>, kind: Exclude<ReportKind, 'comparison'>) {
  return rows.map((row) => [
    classifyAccount(row.account),
    row.account,
    row.code ?? '',
    row.name,
    row.previousBalance,
    row.debit,
    row.credit,
    row.currentBalance,
    correctiveAction(kind, row)
  ]);
}

function depreciationBody(rows: DepreciationPairRow[]) {
  return rows.map((row) => [
    row.assetCode,
    row.assetName,
    row.assetCurrentBalance,
    row.depreciationCode,
    row.depreciationName,
    row.depreciationCurrentBalance,
    row.correctiveAction
  ]);
}

function comparisonBody(company: CompanyReport) {
  const { comparisonReport } = company;
  const status = comparisonReport.message;
  const rows: Array<Array<string | number>> = [
    ['Formula', '', '', comparisonFormula(company), '', '', status, correctiveAction('comparison')]
  ];

  rows.push(
    comparisonRow(
      comparisonLabel('Conta 3', comparisonReport.account3Row),
      comparisonReport.account3Row,
      signedCurrentBalance(comparisonReport.account3Row),
      status,
      correctiveAction('comparison')
    )
  );
  rows.push(
    comparisonRow(
      comparisonLabel('Conta 6', comparisonReport.account6Row),
      comparisonReport.account6Row,
      signedCurrentBalance(comparisonReport.account6Row),
      status,
      correctiveAction('comparison')
    )
  );
  if (comparisonReport.mode === 'distribution') {
    rows.push(
      comparisonRow(
        comparisonLabel('Conta 2.4.13', comparisonReport.account2413Row),
        comparisonReport.account2413Row,
        signedCurrentBalance(comparisonReport.account2413Row),
        status,
        correctiveAction('comparison')
      )
    );
  }
  rows.push(
    comparisonRow(
      comparisonReport.mode === 'fallback'
        ? comparisonLabel('Conta comparada: 2.4.13', comparisonReport.account2413Row)
        : comparisonLabel('Conta comparada: 1.1.04.019', comparisonReport.distributionRow),
      comparisonReport.mode === 'fallback' ? comparisonReport.account2413Row : comparisonReport.distributionRow,
      comparisonReport.targetValue,
      status,
      correctiveAction('comparison')
    )
  );

  rows.push([
    'Soma calculada',
    '',
    '',
    '',
    '',
    formatNumberAsBrazilianMoney(comparisonReport.baseValue),
    status,
    correctiveAction('comparison')
  ]);

  rows.push([
    'Valor comparado',
    '',
    '',
    comparisonReport.mode === 'fallback' ? 'S. Atual da conta 2.4.13' : 'S. Atual da conta 1.1.04.019',
    '',
    formatNumberAsBrazilianMoney(comparisonReport.targetValue),
    status,
    correctiveAction('comparison')
  ]);

  rows.push([
    'Diferenca',
    '',
    '',
    'Soma calculada menos valor comparado',
    '',
    formatNumberAsBrazilianMoney(comparisonReport.difference),
    status,
    correctiveAction('comparison')
  ]);

  return rows;
}

function comparisonRow(label: string, row: LedgerLine | undefined, value: number, status: string, action: string) {
  return [
    label,
    row ? classifyAccount(row.account) : '',
    row?.account ?? '',
    row?.name ?? 'Conta nao localizada',
    row?.currentBalance ?? '',
    formatNumberAsBrazilianMoney(value),
    status,
    action
  ];
}

function comparisonLabel(prefix: string, row?: LedgerLine) {
  return row ? `${prefix} (${row.name})` : prefix;
}

function signedCurrentBalance(row?: LedgerLine): number {
  if (!row) return 0;
  const value = Math.abs(parseBrazilianMoney(row.currentBalance));
  return balanceNature(row.currentBalance) === 'D' ? -value : value;
}

function comparisonFormula(company: CompanyReport): string {
  const { comparisonReport } = company;
  if (comparisonReport.mode === 'fallback') {
    return 'Caso 2: Se 1.1.04.019 (DISTRIBUICAO ANTECIPADA DE LUCROS) estiver zerada ou nao existir, o calculo sera: A SOMA de 3 (RESULTADO DO PERIODO) e 6 (RESULTADO E REGULARIZACAO) MENOS a conta 2.4.13 (LUCROS E PREJUIZOS ACUMULADOS). Resumo: (3 + 6) - 2.4.13.';
  }

  return 'Caso 1: Se 1.1.04.019 (DISTRIBUICAO ANTECIPADA DE LUCROS) for maior que 0, o calculo sera: A SOMA de 3 (RESULTADO DO PERIODO), 6 (RESULTADO E REGULARIZACAO) e 2.4.13 (LUCROS E PREJUIZOS ACUMULADOS) MENOS 1.1.04.019 (DISTRIBUICAO ANTECIPADA DE LUCROS). Resumo: (3 + 6 + 2.4.13) - 1.1.04.019.';
}

function getFinalY(doc: JsPdfInstance) {
  return (doc as JsPdfInstance & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 150;
}

function formatCalculationValue(value: number, format: 'money' | 'percentage' = 'money') {
  return format === 'percentage' ? formatNumberAsPercentage(value) : formatNumberAsBrazilianMoney(value);
}
