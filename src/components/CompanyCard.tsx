import { useMemo, useState } from 'react';
import { AnalysisKind, CompanyReport, ReportKind } from '../types';
import { balanceNature, classifyAccount, formatNumberAsBrazilianMoney, parseBrazilianMoney } from '../utils/format';
import {
  analysisAttention,
  analysisCalculation,
  analysisMessage,
  downloadPdf,
  downloadXlsx,
  hasExportContent,
  reportIntro,
  reportRows,
  reportTabs,
  reportTitle
} from '../utils/reports';
import { DataTable } from './DataTable';

interface CompanyCardProps {
  company: CompanyReport;
}

export function CompanyCard({ company }: CompanyCardProps) {
  const [activeTab, setActiveTab] = useState<ReportKind>('inverted');
  const activeRows = useMemo(() => reportRows(company, activeTab), [company, activeTab]);
  const activeTitle = reportTitle(activeTab, company);
  const activeIntro = reportIntro(activeTab, company);
  const exportEnabled = hasExportContent(company);

  const activeWithCredit = company.invertedRows.filter((row) => row.alertType === 'Ativo com saldo C').length;
  const passiveWithDebit = company.invertedRows.filter((row) => row.alertType === 'Passivo/PL com saldo D').length;

  return (
    <article className="companyCard">
      <header className="companyHeader">
        <div>
          <p className="eyebrow">Empresa</p>
          <h2>{company.companyName}</h2>
          <div className="metadataGrid">
            <span>Codigo: {company.companyCode ?? '-'}</span>
            <span>CNPJ: {company.cnpj}</span>
            <span>Periodo: {company.period}</span>
            <span>Arquivo: {company.fileName}</span>
            <span>Total de linhas contabeis: {company.rows.length}</span>
          </div>
        </div>
      </header>

      {company.errors.length > 0 && (
        <div className="warningBox">
          {company.errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      )}

      <div className="tabs" role="tablist" aria-label="Relatorios">
        {reportTabs.map((tab) => (
          <button
            key={tab.kind}
            type="button"
            className={activeTab === tab.kind ? 'active' : ''}
            onClick={() => setActiveTab(tab.kind)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section className="reportPanel">
        <div className="reportHeader">
          <div>
            <p className="eyebrow">{activeTitle}</p>
            <p className="reportIntro">{activeIntro}</p>
            {activeTab === 'inverted' ? (
              <div className="summaryGrid">
                <Summary label="Ativo com saldo C" value={activeWithCredit} />
                <Summary label="Passivo/PL com saldo D" value={passiveWithDebit} />
                <Summary label="Total" value={company.invertedRows.length} />
              </div>
            ) : activeTab === 'zero' ? (
              <div className="summaryGrid single">
                <Summary label="Total de contas encontradas" value={company.zeroMovementRows.length} />
              </div>
            ) : activeTab === 'comparison' ? (
              <ComparisonSummary company={company} />
            ) : (
              <div className="summaryGrid single">
                <Summary label="Total de linhas no relatorio" value={activeRows.length} />
              </div>
            )}
          </div>
          <div className="actions">
            <button type="button" onClick={() => downloadXlsx(company)} disabled={!exportEnabled}>
              Baixar XLSX consolidado
            </button>
            <button type="button" onClick={() => downloadPdf(company)} disabled={!exportEnabled}>
              Baixar PDF consolidado
            </button>
          </div>
        </div>

        {activeTab === 'comparison' ? (
          <ComparisonPanel company={company} />
        ) : isAnalysisKind(activeTab) ? (
          <AnalysisPanel company={company} kind={activeTab} />
        ) : activeRows.length === 0 ? (
          <div className="emptyState">Nenhum resultado encontrado para este relatorio.</div>
        ) : (
          <DataTable rows={activeRows} kind={activeTab} />
        )}

        {company.unclassified.length > 0 && (
          <details className="debugDetails">
            <summary>{company.unclassified.length} linha(s) nao classificada(s) para depuracao</summary>
            <ul>
              {company.unclassified.slice(0, 20).map((line, index) => (
                <li key={`${line.page}-${index}`}>
                  Pagina {line.page}: {line.text}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>
    </article>
  );
}

function AnalysisPanel({ company, kind }: { company: CompanyReport; kind: AnalysisKind }) {
  const rows = reportRows(company, kind);
  const statusClass = analysisAttention(company, kind) ? 'attention' : 'ok';
  const calculation = analysisCalculation(company, kind);

  return (
    <div className="comparisonPanel">
      <div className={`statusBox ${statusClass}`}>{analysisMessage(company, kind)}</div>
      {calculation && (
        <div className="calculationBox">
          <h3>Calculo</h3>
          <p>{calculation.formula}</p>
          <div className="calculationTable">
            {calculation.items.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <strong>{formatNumberAsBrazilianMoney(item.value)}</strong>
              </div>
            ))}
          </div>
        </div>
      )}
      {rows.length === 0 ? (
        <div className="emptyState">Nenhum resultado encontrado para este relatorio.</div>
      ) : (
        <DataTable rows={rows} kind={kind} />
      )}
    </div>
  );
}

function ComparisonSummary({ company }: { company: CompanyReport }) {
  const { comparisonReport } = company;
  return (
    <div className="summaryGrid">
      <SummaryMoney label="Soma calculada" value={comparisonReport.baseValue} />
      <SummaryMoney label="Valor comparado" value={comparisonReport.targetValue} />
      <SummaryMoney label="Diferenca" value={comparisonReport.difference} />
    </div>
  );
}

function ComparisonPanel({ company }: { company: CompanyReport }) {
  const { comparisonReport } = company;
  const statusClass = comparisonReport.isAttention ? 'attention' : 'ok';
  const calculationRows = buildCalculationRows(company);
  const targetTitle =
    comparisonReport.mode === 'fallback'
      ? 'Conta comparada: 2.4.13'
      : 'Conta comparada: 1.1.04.019';

  return (
    <div className="comparisonPanel">
      <div className={`statusBox ${statusClass}`}>{comparisonReport.message}</div>
      <div className="calculationBox">
        <h3>Calculo</h3>
        <p>{comparisonFormula(company)}</p>
        <div className="calculationTable">
          {calculationRows.map((row) => (
            <div key={row.label}>
              <span>{row.label}</span>
              <strong>{formatNumberAsBrazilianMoney(row.value)}</strong>
            </div>
          ))}
        </div>
      </div>
      <div className="comparisonGrid">
        <ComparisonAccount title="Conta 3" row={comparisonReport.account3Row} value={signedCurrentBalance(comparisonReport.account3Row)} />
        <ComparisonAccount title="Conta 6" row={comparisonReport.account6Row} value={signedCurrentBalance(comparisonReport.account6Row)} />
        {comparisonReport.mode === 'distribution' && (
          <ComparisonAccount
            title="Conta 2.4.13"
            row={comparisonReport.account2413Row}
            value={signedCurrentBalance(comparisonReport.account2413Row)}
          />
        )}
        <ComparisonAccount
          title={targetTitle}
          row={comparisonReport.mode === 'fallback' ? comparisonReport.account2413Row : comparisonReport.distributionRow}
          value={comparisonReport.targetValue}
        />
      </div>
    </div>
  );
}

function ComparisonAccount({
  title,
  row,
  value
}: {
  title: string;
  row?: CompanyReport['rows'][number];
  value: number;
}) {
  return (
    <div className="comparisonAccount">
      <h3>{title}</h3>
      {row ? (
        <dl>
          <div>
            <dt>Natureza</dt>
            <dd>{classifyAccount(row.account) || '-'}</dd>
          </div>
          <div>
            <dt>Conta Contabil</dt>
            <dd>{row.account}</dd>
          </div>
          <div>
            <dt>Nome da Conta</dt>
            <dd>{row.name}</dd>
          </div>
          <div>
            <dt>S. Atual</dt>
            <dd>{row.currentBalance}</dd>
          </div>
          <div>
            <dt>Valor analisado</dt>
            <dd>{formatNumberAsBrazilianMoney(value)}</dd>
          </div>
        </dl>
      ) : (
        <p>Conta nao localizada no PDF.</p>
      )}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="summaryItem">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function SummaryMoney({ label, value }: { label: string; value: number }) {
  return (
    <div className="summaryItem">
      <strong>{formatNumberAsBrazilianMoney(value)}</strong>
      <span>{label}</span>
    </div>
  );
}

function signedCurrentBalance(row?: CompanyReport['rows'][number]): number {
  if (!row) return 0;
  const value = Math.abs(parseBrazilianMoney(row.currentBalance));
  return balanceNature(row.currentBalance) === 'D' ? -value : value;
}

function comparisonFormula(company: CompanyReport): string {
  const { comparisonReport } = company;
  if (comparisonReport.mode === 'fallback') {
    return 'Soma calculada = Conta 3 + Conta 6. Comparacao = Soma calculada - Conta 2.4.13.';
  }

  return 'Soma calculada = Conta 3 + Conta 6 + Conta 2.4.13. Comparacao = Soma calculada - Conta 1.1.04.019.';
}

function buildCalculationRows(company: CompanyReport) {
  const { comparisonReport } = company;
  const rows = [
    { label: 'Conta 3', value: signedCurrentBalance(comparisonReport.account3Row) },
    { label: 'Conta 6', value: signedCurrentBalance(comparisonReport.account6Row) }
  ];

  if (comparisonReport.mode === 'distribution') {
    rows.push({ label: 'Conta 2.4.13', value: signedCurrentBalance(comparisonReport.account2413Row) });
  }

  rows.push(
    { label: 'Soma calculada', value: comparisonReport.baseValue },
    {
      label: comparisonReport.mode === 'fallback' ? 'Valor comparado: 2.4.13' : 'Valor comparado: 1.1.04.019',
      value: comparisonReport.targetValue
    },
    { label: 'Diferenca', value: comparisonReport.difference }
  );

  return rows;
}

function isAnalysisKind(kind: ReportKind): kind is AnalysisKind {
  return kind.startsWith('analysis');
}
