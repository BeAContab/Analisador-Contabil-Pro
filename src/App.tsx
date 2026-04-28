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

  const totalRows = useMemo(() => reports.reduce((sum, report) => sum + report.rows.length, 0), [reports]);

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(event.target.files ?? []));
    event.target.value = '';
  }

  function addFiles(selected: File[]) {
    const pdfs = selected.filter((file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
    const invalidCount = selected.length - pdfs.length;

    if (invalidCount > 0) {
      setMessage('Arquivo inválido. Envie apenas arquivos PDF.');
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
      setMessage('Envie um ou mais arquivos PDF para iniciar a análise.');
      return;
    }

    setIsProcessing(true);
    setMessage('');
    setReports([]);

    const parsed: CompanyReport[] = [];
    for (const file of files) {
      parsed.push(await parsePdfFile(file));
    }

    setReports(parsed);
    setIsProcessing(false);
  }

  function clearAll() {
    setFiles([]);
    setReports([]);
    setMessage('');
  }

  return (
    <main>
      <section className="hero">
        <div>
          <p className="eyebrow">Processamento local no navegador</p>
          <h1>Analisador de Balancetes em PDF</h1>
          <p>
            Envie balancetes analíticos em PDF para identificar saldos invertidos e contas sem movimento, com relatórios
            separados por empresa.
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
              <strong>{files.length} arquivo(s) selecionado(s)</strong>
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

      {isProcessing && <div className="loading">Extraindo texto dos PDFs e analisando as linhas contábeis...</div>}

      {reports.length > 0 && (
        <section className="results">
          <div className="resultsHeader">
            <div>
              <p className="eyebrow">Resultados</p>
              <h2>{reports.length} arquivo(s) processado(s)</h2>
            </div>
            <span>{totalRows} linha(s) contábeis extraída(s)</span>
          </div>

          {reports.map((report) => (
            <CompanyCard company={report} key={report.id} />
          ))}
        </section>
      )}
    </main>
  );
}
