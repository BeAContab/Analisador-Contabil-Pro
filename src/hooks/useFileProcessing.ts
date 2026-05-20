import { ChangeEvent, DragEvent, useMemo, useState } from 'react';
import { CompanyReport } from '../types';
import { parsePdfFile } from '../utils/parser';

export function useFileProcessing() {
  const [files, setFiles] = useState<File[]>([]);
  const [reports, setReports] = useState<CompanyReport[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [message, setMessage] = useState('');
  const [processingIndex, setProcessingIndex] = useState(0);
  const [processingFileName, setProcessingFileName] = useState('');

  const processingPercent = files.length > 0 ? Math.round((processingIndex / files.length) * 100) : 0;

  const totalUnclassified = useMemo(
    () => reports.reduce((sum, report) => sum + report.unclassified.length, 0),
    [reports]
  );

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
    setProcessingIndex(0);
    setProcessingFileName('');

    try {
      const parsed: CompanyReport[] = [];
      for (const [index, file] of files.entries()) {
        setProcessingIndex(index + 1);
        setProcessingFileName(file.name);
        parsed.push(await parsePdfFile(file));
        setReports([...parsed]);
      }
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setProcessingIndex(0);
        setProcessingFileName('');
      }, 500);
    }
  }

  function clearAll() {
    setFiles([]);
    setReports([]);
    setMessage('');
    setProcessingIndex(0);
    setProcessingFileName('');
  }

  return {
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
  };
}
