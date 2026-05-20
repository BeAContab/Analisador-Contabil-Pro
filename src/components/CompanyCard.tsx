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
  const activeTitle = effectiveTab ? reportTitle(effectiveTab, company) : 'Relatórios Ocultos';
  const activeIntro = effectiveTab ? reportIntro(effectiveTab, company) : 'Nenhum relatório com ocorrência está visível no momento.';
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

  return (
    <article className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden flex flex-col gap-lg p-lg">
      {/* Header da Empresa */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md border-b border-outline-variant pb-lg">
        <MetaItem label="Empresa" value={company.companyName} bold />
        <MetaItem label="CNPJ" value={company.cnpj} tabular />
        <MetaItem label="Período" value={company.period} />
        <MetaItem label="Linhas Extraídas" value={`${company.rows.length} registros`} tabular />
      </section>

      {/* Alertas e Erros */}
      {(company.errors.length > 0 || company.unclassified.length > 0) && (
        <section className="space-y-sm">
          {company.errors.map((error, i) => (
            <div key={i} className="bg-error-container text-on-error-container p-md rounded-lg flex items-center gap-md">
              <span className="material-symbols-outlined">error</span>
              <span className="text-body-sm font-medium">{error}</span>
            </div>
          ))}
          {company.unclassified.length > 0 && (
            <div className="bg-surface-container-high text-on-surface-variant p-md rounded-lg flex items-center gap-md border border-outline-variant">
              <span className="material-symbols-outlined">help_outline</span>
              <span className="text-body-sm">Atenção: {company.unclassified.length} linha(s) não foram classificadas automaticamente.</span>
            </div>
          )}
        </section>
      )}

      {/* Navegação de Abas e Ações */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-md border-b border-outline-variant">
        <nav className="flex gap-md overflow-x-auto">
          {displayedTabs.map((tab) => {
            const meta = buildReportMeta(company, tab.kind);
            const isActive = activeTab === tab.kind;
            return (
              <button
                key={tab.kind}
                onClick={() => setActiveTab(tab.kind)}
                className={`px-md py-sm font-title-sm flex items-center gap-sm transition-all border-b-2 whitespace-nowrap ${
                  isActive 
                    ? 'text-primary border-primary' 
                    : 'text-secondary border-transparent hover:text-primary hover:border-outline-variant'
                }`}
              >
                {tab.label}
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                  meta.hasAttention ? 'bg-error text-on-error' : 'bg-surface-container-highest text-secondary'
                }`}>
                  {meta.count}
                </span>
              </button>
            );
          })}
        </nav>
        
        <div className="flex gap-sm pb-sm">
          <button 
            disabled={!exportEnabled}
            onClick={() => downloadXlsx(company)}
            className="flex items-center gap-xs px-md py-sm bg-surface-container-highest text-primary border border-outline-variant rounded text-label-caps font-label-caps hover:bg-outline-variant transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">description</span>
            XLSX
          </button>
          <button 
            disabled={!exportEnabled}
            onClick={() => downloadPdf(company)}
            className="flex items-center gap-xs px-md py-sm bg-primary text-on-primary rounded text-label-caps font-label-caps hover:opacity-90 transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
            PDF
          </button>
        </div>
      </div>

      {/* Conteúdo do Relatório Ativo */}
      <section className="space-y-lg">
        <div className="flex flex-col gap-sm">
          <h3 className="text-headline-md text-primary">{activeTitle}</h3>
          <p className="text-body-md text-secondary leading-relaxed">{activeIntro}</p>
        </div>

        {effectiveTab === 'comparison' ? (
          <ComparisonPanel company={company} />
        ) : isAnalysisKind(effectiveTab) ? (
          <AnalysisPanel company={company} kind={effectiveTab} />
        ) : (
          <DataTable rows={activeRows} kind={effectiveTab!} />
        )}

        {hiddenReportsCount > 0 && (
          <button 
            onClick={() => setShowHiddenReports(!showHiddenReports)}
            className="w-full py-md border border-dashed border-outline-variant rounded-lg text-secondary font-body-sm hover:bg-surface-container-low transition-colors"
          >
            {showHiddenReports 
              ? `Ocultar relatórios sem ocorrência` 
              : `Mostrar mais ${hiddenReportsCount} relatório(s) oculto(s)`}
          </button>
        )}
      </section>
    </article>
  );
}

function MetaItem({ label, value, bold = false, tabular = false }: { label: string; value: string; bold?: boolean; tabular?: boolean }) {
  return (
    <div className="bg-surface-container-low p-md rounded-lg border border-outline-variant/30">
      <span className="text-label-caps font-label-caps text-secondary mb-xs block uppercase">{label}</span>
      <p className={`text-body-md ${bold ? 'font-bold text-primary' : 'text-on-surface'} ${tabular ? 'tabular-nums font-medium' : ''}`}>
        {value}
      </p>
    </div>
  );
}

function AnalysisPanel({ company, kind }: { company: CompanyReport; kind: AnalysisKind }) {
  const rows = reportRows(company, kind);
  const isAttention = analysisAttention(company, kind);
  const calculation = analysisCalculation(company, kind);

  return (
    <div className="space-y-lg">
      <div className={`p-lg rounded-xl border flex gap-md items-start ${
        isAttention ? 'bg-error-container/20 border-error/20 text-on-error-container' : 'bg-secondary-container/10 border-secondary-container/20 text-on-secondary-container'
      }`}>
        <span className="material-symbols-outlined mt-0.5">{isAttention ? 'warning' : 'info'}</span>
        <div>
          <h4 className="font-bold mb-1">{isAttention ? 'Atenção Necessária' : 'Análise Concluída'}</h4>
          <p className="text-body-sm opacity-90">{analysisMessage(company, kind)}</p>
        </div>
      </div>

      {calculation && (
        <div className="bg-surface-container-low p-lg rounded-xl border border-outline-variant space-y-md">
          <div className="flex items-center gap-sm text-primary">
            <span className="material-symbols-outlined text-[20px]">calculate</span>
            <h4 className="font-title-sm">Cálculo de Verificação</h4>
          </div>
          <p className="text-body-sm font-medium text-secondary italic">"{calculation.formula}"</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
            {calculation.items.map((item) => (
              <div key={item.label} className="bg-surface-container-lowest p-md rounded-lg border border-outline-variant/50">
                <span className="text-label-caps text-secondary block mb-1">{item.label}</span>
                <span className="text-body-md font-bold text-primary tabular-nums">{formatNumberAsBrazilianMoney(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {rows.length > 0 ? (
        <DataTable rows={rows} kind={kind} />
      ) : (
        <div className="p-xl text-center border-2 border-dashed border-outline-variant rounded-xl text-secondary italic bg-surface-bright">
          Nenhuma ocorrência detalhada para listar nesta seção.
        </div>
      )}
    </div>
  );
}

function ComparisonPanel({ company }: { company: CompanyReport }) {
  const { comparisonReport } = company;
  const isAttention = comparisonReport.isAttention;
  const calculationRows = buildCalculationRows(company);

  return (
    <div className="space-y-lg">
       <div className={`p-lg rounded-xl border flex gap-md items-start ${
        isAttention ? 'bg-error-container/20 border-error/20 text-on-error-container' : 'bg-secondary-container/10 border-secondary-container/20 text-on-secondary-container'
      }`}>
        <span className="material-symbols-outlined mt-0.5">{isAttention ? 'warning' : 'check_circle'}</span>
        <div>
          <h4 className="font-bold mb-1">{isAttention ? 'Divergência Detectada' : 'Saldos Reconciliados'}</h4>
          <p className="text-body-sm opacity-90">{comparisonReport.message}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        {/* Bloco de Cálculo */}
        <div className="lg:col-span-2 bg-surface-container-low p-lg rounded-xl border border-outline-variant space-y-md">
          <div className="flex items-center gap-sm text-primary">
            <span className="material-symbols-outlined text-[20px]">calculate</span>
            <h4 className="font-title-sm">Fórmula de Conciliação</h4>
          </div>
          <p className="text-body-sm text-secondary italic">"{comparisonFormula(company)}"</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
            {calculationRows.map((row) => (
              <div key={row.label} className="flex justify-between items-center p-md bg-surface-container-lowest rounded-lg border border-outline-variant/30">
                <span className="text-body-sm text-on-surface-variant truncate mr-4">{row.label}</span>
                <span className="text-body-sm font-bold tabular-nums whitespace-nowrap">{formatNumberAsBrazilianMoney(row.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Score de Conformidade Visual */}
        <div className="bg-primary-container text-on-primary-container p-lg rounded-xl flex flex-col items-center justify-center text-center shadow-sm border border-primary/20">
          <div className="w-16 h-16 rounded-full bg-surface-container-lowest/20 flex items-center justify-center mb-md">
            <span className="material-symbols-outlined !text-[32px]">{isAttention ? 'analytics' : 'verified'}</span>
          </div>
          <h4 className="text-title-sm font-title-sm">Score de Precisão</h4>
          <p className="text-display-lg font-display-lg mt-xs">{isAttention ? 'Divergente' : '100%'}</p>
          <p className="text-body-sm opacity-80 mt-xs">
            {isAttention ? 'Verifique os lançamentos manuais.' : 'Dados consistentes com o balancete.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-md">
        <ComparisonAccount title="Conta 3" row={comparisonReport.account3Row} value={signedCurrentBalance(comparisonReport.account3Row)} />
        <ComparisonAccount title="Conta 6" row={comparisonReport.account6Row} value={signedCurrentBalance(comparisonReport.account6Row)} />
        {comparisonReport.mode === 'distribution' && (
          <ComparisonAccount title="Conta 2.4.13" row={comparisonReport.account2413Row} value={signedCurrentBalance(comparisonReport.account2413Row)} />
        )}
        <ComparisonAccount 
          title={comparisonReport.mode === 'fallback' ? 'Conta 2.4.13' : 'Conta 1.1.04.019'} 
          row={comparisonReport.mode === 'fallback' ? comparisonReport.account2413Row : comparisonReport.distributionRow} 
          value={comparisonReport.targetValue} 
        />
      </div>
    </div>
  );
}

function ComparisonAccount({ title, row, value }: { title: string; row?: CompanyReport['rows'][number]; value: number }) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-sm">
      <h5 className="text-label-caps font-label-caps text-secondary mb-md border-b border-outline-variant pb-2">{title}</h5>
      {row ? (
        <div className="space-y-xs">
          <p className="text-body-sm font-bold text-primary truncate" title={row.name}>{row.name}</p>
          <p className="text-[12px] font-mono text-secondary mb-3">{row.account}</p>
          <div className="flex justify-between items-end mt-4">
             <span className="text-[11px] text-on-surface-variant font-medium">Analisado</span>
             <span className="text-body-sm font-bold tabular-nums">{formatNumberAsBrazilianMoney(value)}</span>
          </div>
        </div>
      ) : (
        <div className="py-md text-center">
          <span className="text-body-sm text-secondary italic">Não localizada</span>
        </div>
      )}
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
    return '(3 + 6) - 2.4.13';
  }
  return '(3 + 6 + 2.4.13) - 1.1.04.019';
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
    { label: 'Soma Calculada', value: comparisonReport.baseValue },
    {
      label: comparisonReport.mode === 'fallback'
          ? comparisonLabel('Conta 2.4.13', comparisonReport.account2413Row)
          : comparisonLabel('Conta 1.1.04.019', comparisonReport.distributionRow),
      value: comparisonReport.targetValue
    },
    { label: 'Diferença', value: comparisonReport.difference }
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

function isAnalysisKind(kind: ReportKind): kind is AnalysisKind {
  return kind.startsWith('analysis');
}
