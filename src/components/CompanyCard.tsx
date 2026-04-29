import { useState } from 'react';
import { CompanyReport, ReportKind } from '../types';
import { balanceNature, classifyAccount, formatNumberAsBrazilianMoney, parseBrazilianMoney } from '../utils/format';
import { downloadPdf, downloadXlsx } from '../utils/reports';
import { DataTable } from './DataTable';

interface CompanyCardProps {
  company: CompanyReport;
}

export function CompanyCard({ company }: CompanyCardProps) {
  const [activeTab, setActiveTab] = useState<ReportKind>('inverted');
  const activeRows =
    activeTab === 'inverted' ? company.invertedRows : activeTab === 'zero' ? company.zeroMovementRows : [];
  const activeTitle =
    activeTab === 'inverted'
      ? 'Saldos invertidos Ativo/Passivo'
      : activeTab === 'zero'
        ? 'Contas sem movimentação no período'
        : 'Comparação Distribuição x Resultado';
  const hasExportRows =
    company.invertedRows.length > 0 ||
    company.zeroMovementRows.length > 0 ||
    Boolean(
      company.comparisonReport.distributionRow ||
        company.comparisonReport.account3Row ||
        company.comparisonReport.account6Row ||
        company.comparisonReport.account2413Row
    );

  const activeWithCredit = company.invertedRows.filter((row) => row.alertType === 'Ativo com saldo C').length;
  const passiveWithDebit = company.invertedRows.filter((row) => row.alertType === 'Passivo/PL com saldo D').length;

  return (
    <article className="companyCard">
      <header className="companyHeader">
        <div>
          <p className="eyebrow">Empresa</p>
          <h2>{company.companyName}</h2>
          <div className="metadataGrid">
            <span>Código: {company.companyCode ?? '-'}</span>
            <span>CNPJ: {company.cnpj}</span>
            <span>Período: {company.period}</span>
            <span>Arquivo: {company.fileName}</span>
            <span>Total de linhas contábeis: {company.rows.length}</span>
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

      <div className="tabs" role="tablist" aria-label="Relatórios">
        <button
          type="button"
          className={activeTab === 'inverted' ? 'active' : ''}
          onClick={() => setActiveTab('inverted')}
        >
          Saldos invertidos
        </button>
        <button
          type="button"
          className={activeTab === 'zero' ? 'active' : ''}
          onClick={() => setActiveTab('zero')}
        >
          Contas sem movimentação
        </button>
        <button
          type="button"
          className={activeTab === 'comparison' ? 'active' : ''}
          onClick={() => setActiveTab('comparison')}
        >
          Distribuição x Resultado
        </button>
      </div>

      <section className="reportPanel">
        <div className="reportHeader">
          <div>
            <p className="eyebrow">{activeTitle}</p>
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
            ) : (
              <ComparisonSummary company={company} />
            )}
          </div>
          <div className="actions">
            <button type="button" onClick={() => downloadXlsx(company)} disabled={!hasExportRows}>
              Baixar XLSX consolidado
            </button>
            <button type="button" onClick={() => downloadPdf(company)} disabled={!hasExportRows}>
              Baixar PDF consolidado
            </button>
          </div>
        </div>

        {activeTab === 'comparison' ? (
          <ComparisonPanel company={company} />
        ) : activeRows.length === 0 ? (
          <div className="emptyState">Nenhum resultado encontrado para este relatório.</div>
        ) : (
          <DataTable rows={activeRows} kind={activeTab} />
        )}

        {company.unclassified.length > 0 && (
          <details className="debugDetails">
            <summary>{company.unclassified.length} linha(s) não classificada(s) para depuração</summary>
            <ul>
              {company.unclassified.slice(0, 20).map((line, index) => (
                <li key={`${line.page}-${index}`}>
                  Página {line.page}: {line.text}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>
    </article>
  );
}

function ComparisonSummary({ company }: { company: CompanyReport }) {
  const { comparisonReport } = company;
  return (
    <div className="summaryGrid">
      <SummaryMoney label="Soma calculada" value={comparisonReport.baseValue} />
      <SummaryMoney label="Valor comparado" value={comparisonReport.targetValue} />
      <SummaryMoney label="Diferença" value={comparisonReport.difference} />
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
        <h3>Cálculo</h3>
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
            <dt>Conta Contábil</dt>
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
        <p>Conta não localizada no PDF.</p>
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
    return 'Soma calculada = Conta 3 + Conta 6. Comparação = Soma calculada - Conta 2.4.13.';
  }

  return 'Soma calculada = Conta 3 + Conta 6 + Conta 2.4.13. Comparação = Soma calculada - Conta 1.1.04.019.';
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
    { label: 'Diferença', value: comparisonReport.difference }
  );

  return rows;
}
