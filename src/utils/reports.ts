import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { CompanyReport, InvertedBalanceRow, LedgerLine, ReportKind } from '../types';
import { nowLabel, slugify } from './format';

export function reportRows(company: CompanyReport, kind: ReportKind) {
  return kind === 'inverted' ? company.invertedRows : company.zeroMovementRows;
}

export function reportTitle(kind: ReportKind): string {
  return kind === 'inverted'
    ? 'Saldos invertidos Ativo/Passivo'
    : 'Contas com Debito e Credito zerados';
}

export function reportFileName(company: CompanyReport, kind: ReportKind, extension: 'xlsx' | 'pdf') {
  const suffix = kind === 'inverted' ? 'saldos-invertidos' : 'debito-credito-zerados';
  return `${slugify(company.companyName)}_${suffix}.${extension}`;
}

export function downloadXlsx(company: CompanyReport, kind: ReportKind) {
  const rows = reportRows(company, kind);
  const header = [
    ['Relatorio', reportTitle(kind)],
    ['Empresa', company.companyName],
    ['CNPJ', company.cnpj],
    ['Periodo', company.period],
    ['Arquivo', company.fileName],
    ['Gerado em', nowLabel()],
    []
  ];

  const data =
    kind === 'inverted'
      ? (rows as InvertedBalanceRow[]).map((row) => ({
          'Tipo de Alerta': row.alertType,
          'Conta Contabil': row.account,
          'Nome da Conta': row.name,
          'S. Anterior': row.previousBalance,
          Debito: row.debit,
          Credito: row.credit,
          'S. Atual': row.currentBalance,
          'Cod. R.': row.code ?? '',
          Pagina: row.page ?? ''
        }))
      : (rows as LedgerLine[]).map((row) => ({
          'Conta Contabil': row.account,
          'Nome da Conta': row.name,
          'S. Anterior': row.previousBalance,
          Debito: row.debit,
          Credito: row.credit,
          'S. Atual': row.currentBalance,
          'Cod. R.': row.code ?? '',
          Pagina: row.page ?? ''
        }));

  const worksheet = XLSX.utils.aoa_to_sheet(header);
  XLSX.utils.sheet_add_json(worksheet, data, { origin: 'A8' });
  worksheet['!cols'] = [
    { wch: 24 },
    { wch: 22 },
    { wch: 42 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 10 },
    { wch: 8 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatorio');
  XLSX.writeFile(workbook, reportFileName(company, kind, 'xlsx'));
}

export function downloadPdf(company: CompanyReport, kind: ReportKind) {
  const rows = reportRows(company, kind);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const title = reportTitle(kind);

  doc.setFontSize(14);
  doc.text(title, 40, 36);
  doc.setFontSize(9);
  doc.text(`Empresa: ${company.companyName}`, 40, 58);
  doc.text(`CNPJ: ${company.cnpj}`, 40, 74);
  doc.text(`Periodo: ${company.period}`, 40, 90);
  doc.text(`Arquivo: ${company.fileName}`, 40, 106);
  doc.text(`Gerado em: ${nowLabel()}`, 40, 122);

  const columns =
    kind === 'inverted'
      ? ['Tipo de Alerta', 'Conta Contabil', 'Nome da Conta', 'S. Anterior', 'Debito', 'Credito', 'S. Atual', 'Cod. R.', 'Pag.']
      : ['Conta Contabil', 'Nome da Conta', 'S. Anterior', 'Debito', 'Credito', 'S. Atual', 'Cod. R.', 'Pag.'];

  const body =
    kind === 'inverted'
      ? (rows as InvertedBalanceRow[]).map((row) => [
          row.alertType,
          row.account,
          row.name,
          row.previousBalance,
          row.debit,
          row.credit,
          row.currentBalance,
          row.code ?? '',
          row.page ?? ''
        ])
      : (rows as LedgerLine[]).map((row) => [
          row.account,
          row.name,
          row.previousBalance,
          row.debit,
          row.credit,
          row.currentBalance,
          row.code ?? '',
          row.page ?? ''
        ]);

  autoTable(doc, {
    startY: 142,
    head: [columns],
    body: body.length ? body : [[kind === 'inverted' ? 'Nenhuma inconsistencia encontrada.' : 'Nenhuma conta encontrada.']],
    styles: { fontSize: 7, cellPadding: 3, overflow: 'linebreak' },
    headStyles: { fillColor: [21, 78, 94] },
    margin: { left: 36, right: 36 }
  });

  doc.save(reportFileName(company, kind, 'pdf'));
}
