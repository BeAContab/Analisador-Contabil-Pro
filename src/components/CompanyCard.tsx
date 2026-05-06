import { useEffect, useMemo, useState } from 'react';
import { AnalysisKind, CompanyReport, ReportKind } from '../types';
import { balanceNature, classifyAccount, formatNumberAsBrazilianMoney, parseBrazilianMoney } from '../utils/format';
import {
  analysisAttention,
  analysisCalculation,
  analysisMessage,
  downloadPdf,
  downloadXlsx,
  hasExportContent,
  reportHasOccurrence,
  reportIntro,
  reportOccurrenceCount,
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
  const [showHiddenReports, setShowHiddenReports] = useState(false);
  const visibleTabs = useMemo(() => reportTabs.filter((tab) => reportHasOccurrence(company, tab.kind)), [company]);
  const displayedTabs = showHiddenReports ? reportTabs : visibleTabs;
  const hiddenReportsCount = reportTabs.length - visibleTabs.length;
  const effectiveTab = displayedTabs.find((tab) => tab.kind === activeTab)?.kind ?? displayedTabs[0]?.kind;
  const activeRows = useMemo(() => (effectiveTab ? reportRows(company, effectiveTab) : []), [company, effectiveTab]);
  const activeTitle = effectiveTab ? reportTitle(effectiveTab, company) : 'Relatorios ocultos';
  const activeIntro = effectiveTab ? reportIntro(effectiveTab, company) : 'Nenhum relatorio com ocorrencia esta visivel no momento.';
  const exportEnabled = hasExportContent(company);
  const companySummary = useMemo(() => buildCompanySummary(company), [company]);
  const activeReportMeta = useMemo(
    () => (effectiveTab ? buildReportMeta(company, effectiveTab) : { count: 0, hasAttention: false }),
    [company, effectiveTab]
  );

  useEffect(() => {
    if (effectiveTab && effectiveTab !== activeTab) {
      setActiveTab(effectiveTab);
    }
  }, [activeTab, effectiveTab]);

  const activeWithCredit = company.invertedRows.filter((row) => row.alertType === 'Ativo com saldo C').length;
  const passiveWithDebit = company.invertedRows.filter((row) => row.alertType === 'Passivo/PL com saldo D').length;

  return (
    <article className={`companyCard ${companySummary.hasAttention ? 'hasAttention' : 'isClean'}`}>
      <header className="companyHeader">
        <div className="companyTitleBlock">
          <div className="companyHeading">
            <div>
              <p className="eyebrow">Empresa</p>
              <h2>{company.companyName}</h2>
            </div>
            <div className={`statusPill ${companySummary.hasAttention ? 'attention' : 'ok'}`}>
              {companySummary.hasAttention ? 'Com alertas' : 'Sem ocorrencias relevantes'}
            </div>
          </div>
          <div className="metadataGrid">
            <span>Codigo: {company.companyCode ?? '-'}</span>
            <span>CNPJ: {company.cnpj}</span>
            <span>Periodo: {company.period}</span>
            <span>Arquivo: {company.fileName}</span>
            <span>Total de linhas contabeis: {company.rows.length}</span>
          </div>
        </div>
      </header>

      <div className="summaryGrid companySummaryGrid">
        <Summary label="Relatorios com ocorrencia" value={companySummary.reportsWithOccurrences} />
        <Summary label="Ocorrencias encontradas" value={companySummary.occurrences} />
        <Summary label="Linhas nao classificadas" value={company.unclassified.length} tone={company.unclassified.length > 0 ? 'attention' : 'neutral'} />
      </div>

      {company.errors.length > 0 && (
        <div className="warningBox">
          {company.errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      )}

      {company.unclassified.length > 0 && (
        <div className="unclassifiedNotice">
          <strong>Atencao para parsing:</strong> {company.unclassified.length} linha(s) nao classificada(s) merecem revisao.
        </div>
      )}

      <div className="tabsHeader">
        {hiddenReportsCount > 0 && (
          <button type="button" className="toggleHiddenButton" onClick={() => setShowHiddenReports((current) => !current)}>
            {showHiddenReports
              ? `Ocultar relatorios sem ocorrencia (${hiddenReportsCount})`
              : `Mostrar relatorios ocultos (${hiddenReportsCount})`}
          </button>
        )}
      </div>

      <div className="tabs" role="tablist" aria-label="Relatorios">
        {displayedTabs.map((tab) => {
          const meta = buildReportMeta(company, tab.kind);
          return (
            <button
              key={tab.kind}
              type="button"
              className={`${activeTab === tab.kind ? 'active' : ''} ${meta.hasAttention ? 'tabAttention' : ''}`}
              onClick={() => setActiveTab(tab.kind)}
            >
              <span>{tab.label}</span>
              <span className={`tabBadge ${meta.hasAttention ? 'attention' : 'neutral'}`}>{meta.count}</span>
            </button>
          );
        })}
      </div>

      <section className="reportPanel">
        <div className="reportHeader">
          <div>
            <p className="eyebrow">{activeTitle}</p>
            <p className="reportIntro">{activeIntro}</p>
            <div className="reportStatusRow">
              <span className={`statusPill small ${activeReportMeta.hasAttention ? 'attention' : 'ok'}`}>
                {activeReportMeta.hasAttention ? 'Atencao' : 'Sem ocorrencias'}
              </span>
              <span className="reportStatusCount">
                {activeReportMeta.count} {activeReportMeta.count === 1 ? 'ocorrencia' : 'ocorrencias'}
              </span>
            </div>
            {effectiveTab === 'inverted' ? (
              <div className="summaryGrid">
                <Summary label="Ativo com saldo C" value={activeWithCredit} />
                <Summary label="Passivo/PL com saldo D" value={passiveWithDebit} />
                <Summary label="Total" value={company.invertedRows.length} />
              </div>
            ) : effectiveTab === 'zero' ? (
              <div className="summaryGrid single">
                <Summary label="Total de contas encontradas" value={company.zeroMovementRows.length} />
              </div>
            ) : effectiveTab === 'comparison' ? (
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

        {!effectiveTab ? (
          <div className="emptyState">Nenhum relatorio com ocorrencia esta visivel. Use o botao acima para mostrar os relatorios ocultos.</div>
        ) : effectiveTab === 'comparison' ? (
          <ComparisonPanel company={company} />
        ) : isAnalysisKind(effectiveTab) ? (
          <AnalysisPanel company={company} kind={effectiveTab} />
        ) : activeRows.length === 0 ? (
          <div className="emptyState">{emptyStateMessage(effectiveTab)}</div>
        ) : (
          <DataTable rows={activeRows} kind={effectiveTab} />
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
        <div className="emptyState">
          {analysisAttention(company, kind)
            ? 'Nenhuma linha foi listada, mas o status acima indica que esta analise exige revisao.'
            : 'Nenhuma ocorrencia encontrada nesta analise.'}
        </div>
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
      <SummaryMoney label="Diferenca" value={comparisonReport.difference} tone={comparisonReport.isAttention ? 'attention' : 'ok'} />
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

function Summary({
  label,
  value,
  tone = 'neutral'
}: {
  label: string;
  value: number;
  tone?: 'neutral' | 'attention' | 'ok';
}) {
  return (
    <div className={`summaryItem ${tone}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function SummaryMoney({
  label,
  value,
  tone = 'neutral'
}: {
  label: string;
  value: number;
  tone?: 'neutral' | 'attention' | 'ok';
}) {
  return (
    <div className={`summaryItem ${tone}`}>
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
    return 'Caso 2: Se 1.1.04.019 (DISTRIBUICAO ANTECIPADA DE LUCROS) estiver zerada ou nao existir, o calculo sera: A SOMA de 3 (RESULTADO DO PERIODO) e 6 (RESULTADO E REGULARIZACAO) MENOS a conta 2.4.13 (LUCROS E PREJUIZOS ACUMULADOS). Resumo: (3 + 6) - 2.4.13.';
  }

  return 'Caso 1: Se 1.1.04.019 (DISTRIBUICAO ANTECIPADA DE LUCROS) for maior que 0, o calculo sera: A SOMA de 3 (RESULTADO DO PERIODO), 6 (RESULTADO E REGULARIZACAO) e 2.4.13 (LUCROS E PREJUIZOS ACUMULADOS) MENOS 1.1.04.019 (DISTRIBUICAO ANTECIPADA DE LUCROS). Resumo: (3 + 6 + 2.4.13) - 1.1.04.019.';
}

function buildCalculationRows(company: CompanyReport) {
  const { comparisonReport } = company;
  const rows = [
    { label: comparisonLabel('Conta 3', comparisonReport.account3Row), value: signedCurrentBalance(comparisonReport.account3Row) },
    { label: comparisonLabel('Conta 6', comparisonReport.account6Row), value: signedCurrentBalance(comparisonReport.account6Row) }
  ];

  if (comparisonReport.mode === 'distribution') {
    rows.push({
      label: comparisonLabel('Conta 2.4.13', comparisonReport.account2413Row),
      value: signedCurrentBalance(comparisonReport.account2413Row)
    });
  }

  rows.push(
    { label: 'Soma calculada', value: comparisonReport.baseValue },
    {
      label:
        comparisonReport.mode === 'fallback'
          ? comparisonLabel('Valor comparado: 2.4.13', comparisonReport.account2413Row)
          : comparisonLabel('Valor comparado: 1.1.04.019', comparisonReport.distributionRow),
      value: comparisonReport.targetValue
    },
    { label: 'Diferenca', value: comparisonReport.difference }
  );

  return rows;
}

function comparisonLabel(prefix: string, row?: CompanyReport['rows'][number]) {
  return row ? `${prefix} (${row.name})` : prefix;
}

function buildCompanySummary(company: CompanyReport) {
  const reportCounts = reportTabs.map((tab) => buildReportMeta(company, tab.kind));
  const reportsWithOccurrences = reportCounts.filter((report) => report.hasAttention).length;
  const occurrences = reportCounts.reduce((sum, report) => sum + report.count, 0);

  return {
    hasAttention: reportsWithOccurrences > 0 || company.unclassified.length > 0 || company.errors.length > 0,
    reportsWithOccurrences,
    occurrences
  };
}

function buildReportMeta(company: CompanyReport, kind: ReportKind) {
  const count = reportOccurrenceCount(company, kind);
  return {
    count,
    hasAttention: count > 0
  };
}

function emptyStateMessage(kind: ReportKind): string {
  if (kind === 'inverted') {
    return 'Nenhuma ocorrencia de saldo invertido foi encontrada neste arquivo.';
  }
  if (kind === 'zero') {
    return 'Nenhuma conta sem movimentacao foi encontrada neste periodo.';
  }
  return 'Nenhuma ocorrencia encontrada neste relatorio.';
}

function isAnalysisKind(kind: ReportKind): kind is AnalysisKind {
  return kind.startsWith('analysis');
}
