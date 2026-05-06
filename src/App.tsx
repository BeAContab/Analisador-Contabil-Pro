import { ChangeEvent, DragEvent, useMemo, useState } from 'react';
import { CompanyCard } from './components/CompanyCard';
import { CompanyReport } from './types';
import { parsePdfFile } from './utils/parser';

export function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [reports, setReports] = useState<CompanyReport[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [message, setMessage] = useState('');
  const [processingIndex, setProcessingIndex] = useState(0);
  const [processingFileName, setProcessingFileName] = useState('');

  const totalRows = useMemo(() => reports.reduce((sum, report) => sum + report.rows.length, 0), [reports]);
  const totalUnclassified = useMemo(
    () => reports.reduce((sum, report) => sum + report.unclassified.length, 0),
    [reports]
  );
  const resultsSummary = useMemo(() => buildResultsSummary(reports), [reports]);
  const processingPercent = files.length > 0 ? Math.round((processingIndex / files.length) * 100) : 0;

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(event.target.files ?? []));
    event.target.value = '';
  }

  function addFiles(selected: File[]) {
    const pdfs = selected.filter((file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
    const invalidCount = selected.length - pdfs.length;

    if (invalidCount > 0) {
      setMessage('Arquivo invalido. Envie apenas arquivos PDF.');
    } else {
      setMessage('');
    }

    setFiles((current) => {
      const known = new Set(current.map((file) => `${file.name}-${file.size}-${file.lastModified}`));
      const next = pdfs.filter((file) => !known.has(`${file.name}-${file.size}-${file.lastModified}`));
      return [...current, ...next];
    });
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDragging(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  }

  function removeFile(fileToRemove: File) {
    setFiles((current) => current.filter((file) => file !== fileToRemove));
  }

  async function processFiles() {
    if (files.length === 0) {
      setMessage('Envie um ou mais arquivos PDF para iniciar a analise.');
      return;
    }

    setIsProcessing(true);
    setMessage('');
    setReports([]);
    setProcessingIndex(0);
    setProcessingFileName('');

    const parsed: CompanyReport[] = [];
    for (const [index, file] of files.entries()) {
      setProcessingIndex(index + 1);
      setProcessingFileName(file.name);
      parsed.push(await parsePdfFile(file));
      setReports([...parsed]);
    }

    setIsProcessing(false);
    setProcessingIndex(0);
    setProcessingFileName('');
  }

  function clearAll() {
    setFiles([]);
    setReports([]);
    setMessage('');
    setProcessingIndex(0);
    setProcessingFileName('');
  }

  return (
    <main>
      <section className="hero">
        <div>
          <p className="eyebrow">Processamento local no navegador</p>
          <h1>Analisador de Balancetes em PDF</h1>
          <p>
            Envie balancetes analiticos em PDF para identificar alertas, inconsistencias e contas sem
            movimentacao, com relatorios separados por empresa.
          </p>
        </div>
      </section>

      <section className="uploadPanel" aria-label="Envio de arquivos">
        <div
          className={`uploadBox ${isDragging ? 'dragActive' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input id="pdf-upload" type="file" accept="application/pdf,.pdf" multiple onChange={handleFiles} />
          <label htmlFor="pdf-upload">
            <strong>Envie um ou mais arquivos PDF de balancete</strong>
            <span>Arraste e solte os PDFs aqui ou clique para selecionar os arquivos.</span>
          </label>
        </div>

        {message && <div className="message">{message}</div>}

        {files.length > 0 && (
          <div className="fileList">
            <div className="fileListHeader">
              <div>
                <strong>{files.length} arquivo(s) selecionado(s)</strong>
                <p className="fileListHint">Voce pode adicionar mais arquivos antes de processar ou remover apenas os que nao quiser analisar.</p>
              </div>
              <label htmlFor="pdf-upload" className="inlineAction">
                Adicionar mais arquivos
              </label>
            </div>
            {files.map((file) => (
              <div className="fileItem" key={`${file.name}-${file.size}-${file.lastModified}`}>
                <span>{file.name}</span>
                <button type="button" onClick={() => removeFile(file)}>
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="primaryActions">
          <button type="button" className="primaryButton" onClick={processFiles} disabled={isProcessing}>
            {isProcessing ? 'Processando...' : 'Processar arquivos'}
          </button>
          <button type="button" className="secondaryButton" onClick={clearAll} disabled={isProcessing}>
            Limpar arquivos
          </button>
        </div>
      </section>

      {isProcessing && (
        <div className="loading">
          <strong>Processando arquivos...</strong>
          <span>
            {processingIndex} de {files.length} arquivo(s) concluido(s) ({processingPercent}%)
          </span>
          {processingFileName && <span>Arquivo atual: {processingFileName}</span>}
          <div className="loadingBar" aria-hidden="true">
            <div style={{ width: `${processingPercent}%` }} />
          </div>
        </div>
      )}

      {reports.length > 0 && (
        <section className="results">
          <div className="resultsHeader">
            <div>
              <p className="eyebrow">Resultados</p>
              <h2>{reports.length} arquivo(s) processado(s)</h2>
            </div>
            <span>{totalRows} linha(s) contabeis extraida(s)</span>
          </div>

          <div className="resultsSummary">
            <SummaryCard label="Empresas com alertas" value={resultsSummary.companiesWithAlerts} tone="attention" />
            <SummaryCard label="Relatorios com ocorrencia" value={resultsSummary.reportsWithOccurrences} tone="neutral" />
            <SummaryCard label="Ocorrencias identificadas" value={resultsSummary.totalOccurrences} tone="neutral" />
            <SummaryCard label="Linhas nao classificadas" value={totalUnclassified} tone={totalUnclassified > 0 ? 'attention' : 'ok'} />
          </div>

          {reports.map((report) => (
            <CompanyCard company={report} key={report.id} />
          ))}
        </section>
      )}
    </main>
  );
}

function SummaryCard({
  label,
  value,
  tone
}: {
  label: string;
  value: number;
  tone: 'neutral' | 'attention' | 'ok';
}) {
  return (
    <div className={`summaryCard ${tone}`}>
      <strong>{value}</strong>
      <span>{label}</span>
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
