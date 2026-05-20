import { lazy, Suspense, useMemo, useState } from 'react';
import { CompanyCard } from './components/CompanyCard';
import { CompanyReport } from './types';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Dropzone } from './components/Dropzone';
import { SummaryCards } from './components/SummaryCards';
import { ProcessingOverlay } from './components/ProcessingOverlay';
import { useFileProcessing } from './hooks/useFileProcessing';

const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy').then((module) => ({ default: module.PrivacyPolicy })));
const DataSecurity = lazy(() => import('./components/DataSecurity').then((module) => ({ default: module.DataSecurity })));
const LocalProcessingDoc = lazy(() =>
  import('./components/LocalProcessingDoc').then((module) => ({ default: module.LocalProcessingDoc }))
);
const ChatbotFab = lazy(() => import('./components/ChatbotFab').then((module) => ({ default: module.ChatbotFab })));

type View = 'main' | 'privacy' | 'security' | 'docs';

export function App() {
  const [view, setView] = useState<View>('main');
  const {
    files,
    reports,
    isProcessing,
    isDragging,
    message,
    processingIndex,
    processingFileName,
    processingPercent,
    totalUnclassified,
    handleFiles,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    removeFile,
    processFiles,
    clearAll
  } = useFileProcessing();

  const resultsSummary = useMemo(() => buildResultsSummary(reports), [reports]);

  const navigateToMain = () => {
    setView('main');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFooterNavigate = (newView: View) => {
    setView(newView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar onHomeClick={navigateToMain} />

      <main className="flex-grow w-full max-w-container-max mx-auto px-gutter py-xl flex flex-col gap-xl">
        {view === 'main' && (
          <div className="space-y-xl animate-in fade-in duration-500">
            <section className="flex flex-col gap-sm">
              <h1 className="font-display-lg text-display-lg text-primary">Analisador de Balancetes</h1>
              <p className="text-secondary font-body-md max-w-2xl">
                Inicie a análise carregando seus arquivos contábeis em PDF para identificação automática de alertas,
                saldos invertidos e inconsistências.
              </p>
            </section>

            <Dropzone
              isDragging={isDragging}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onFileChange={handleFiles}
              files={files}
              onRemoveFile={removeFile}
              isProcessing={isProcessing}
              onProcess={processFiles}
              onClear={clearAll}
            />

            {message && (
              <div className="p-md bg-error-container text-on-error-container rounded-lg border border-error/20 flex items-center gap-md">
                <span className="material-symbols-outlined">error</span>
                <span className="font-medium">{message}</span>
              </div>
            )}

            {reports.length > 0 && (
              <section id="results" className="space-y-xl">
                <div className="flex flex-col gap-sm border-b border-outline-variant pb-md">
                  <span className="text-label-caps font-label-caps text-secondary uppercase">Resultados da Análise</span>
                  <h2 className="font-headline-md text-primary">{reports.length} empresa(s) processada(s)</h2>
                </div>

                <SummaryCards
                  companiesWithAlerts={resultsSummary.companiesWithAlerts}
                  reportsWithOccurrences={resultsSummary.reportsWithOccurrences}
                  totalOccurrences={resultsSummary.totalOccurrences}
                  totalUnclassified={totalUnclassified}
                />

                <div className="space-y-lg">
                  {reports.map((report) => (
                    <CompanyCard company={report} key={report.id} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        <Suspense fallback={<div className="text-secondary">Carregando conteúdo...</div>}>
          {view === 'privacy' && <PrivacyPolicy />}
          {view === 'security' && <DataSecurity />}
          {view === 'docs' && <LocalProcessingDoc />}
        </Suspense>

        {isProcessing && processingIndex > 0 && (
          <ProcessingOverlay
            index={processingIndex}
            total={files.length}
            percent={processingPercent}
            fileName={processingFileName}
          />
        )}
      </main>

      <Footer onNavigate={handleFooterNavigate} />
      <Suspense fallback={null}>
        <ChatbotFab reports={reports} isProcessing={isProcessing} />
      </Suspense>
    </div>
  );
}

function buildResultsSummary(reports: CompanyReport[]) {
  let companiesWithAlerts = 0;
  let reportsWithOccurrences = 0;
  let totalOccurrences = 0;

  reports.forEach((report) => {
    const comparisonOccurrence = report.comparisonReport.isAttention ? 1 : 0;
    const analysisOccurrences = report.analysisReports.map((analysis) => ({
      reportCount: analysis.isAttention ? 1 : 0,
      rowCount: analysis.rows.length > 0 ? analysis.rows.length : analysis.isAttention ? 1 : 0
    }));

    const reportCount =
      (report.invertedRows.length > 0 ? 1 : 0) +
      (report.zeroMovementRows.length > 0 ? 1 : 0) +
      comparisonOccurrence +
      analysisOccurrences.reduce((sum, item) => sum + item.reportCount, 0);

    const occurrenceCount =
      report.invertedRows.length +
      report.zeroMovementRows.length +
      comparisonOccurrence +
      analysisOccurrences.reduce((sum, item) => sum + item.rowCount, 0);

    if (reportCount > 0) {
      companiesWithAlerts += 1;
    }

    reportsWithOccurrences += reportCount;
    totalOccurrences += occurrenceCount;
  });

  return {
    companiesWithAlerts,
    reportsWithOccurrences,
    totalOccurrences
  };
}
