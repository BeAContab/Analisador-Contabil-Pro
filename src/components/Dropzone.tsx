import { ChangeEvent, DragEvent } from 'react';

interface DropzoneProps {
  isDragging: boolean;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  files: File[];
  onRemoveFile: (file: File) => void;
  isProcessing: boolean;
  onProcess: () => void;
  onClear: () => void;
}

export function Dropzone({
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileChange,
  files,
  onRemoveFile,
  isProcessing,
  onProcess,
  onClear
}: DropzoneProps) {
  return (
    <section className="w-full space-y-lg">
      <div
        className={`relative group border-2 border-dashed rounded-xl p-xl flex flex-col items-center justify-center gap-lg transition-all duration-300 soft-lift min-h-[400px] cursor-pointer ${
          isDragging 
            ? 'border-primary bg-surface-bright scale-[1.01]' 
            : 'border-outline-variant bg-surface-container-lowest hover:border-primary hover:bg-surface-bright'
        }`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className="w-20 h-20 bg-secondary-container rounded-full flex items-center justify-center text-primary-container group-hover:scale-110 transition-transform duration-300">
          <span className="material-symbols-outlined !text-[48px]" style={{ fontVariationSettings: "'wght' 300" }}>cloud_upload</span>
        </div>
        <div className="text-center max-w-md flex flex-col gap-sm">
          <h3 className="font-title-sm text-title-sm text-on-surface">Arraste e solte seus balancetes aqui ou clique para selecionar</h3>
          <p className="text-body-sm text-secondary">Suporte para arquivos PDF. Processamento local e seguro.</p>
        </div>
        <label htmlFor="pdf-upload" className="bg-primary text-on-primary px-xl py-sm rounded-lg font-title-sm hover:opacity-90 transition-opacity flex items-center gap-sm cursor-pointer">
          <span className="material-symbols-outlined">attachment</span>
          Selecionar Arquivo
        </label>
        <input 
          id="pdf-upload"
          type="file" 
          accept="application/pdf,.pdf" 
          multiple 
          className="absolute inset-0 opacity-0 cursor-pointer" 
          onChange={onFileChange}
        />
      </div>

      {files.length > 0 && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg soft-lift">
          <div className="flex justify-between items-center mb-md border-b border-outline-variant pb-md">
            <div>
              <h4 className="font-title-sm text-primary">{files.length} arquivo(s) selecionado(s)</h4>
              <p className="text-body-sm text-secondary">Verifique os arquivos antes de iniciar o processamento.</p>
            </div>
            <button 
              onClick={onClear}
              className="text-error font-label-caps hover:bg-error-container/20 px-md py-sm rounded transition-colors"
            >
              LIMPAR TUDO
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            {files.map((file) => (
              <div key={`${file.name}-${file.size}`} className="flex items-center justify-between p-md bg-surface-container-low rounded-lg border border-outline-variant">
                <div className="flex items-center gap-md">
                  <span className="material-symbols-outlined text-secondary">description</span>
                  <span className="text-body-sm font-medium text-on-surface truncate max-w-[200px]">{file.name}</span>
                </div>
                <button 
                  onClick={() => onRemoveFile(file)}
                  className="material-symbols-outlined text-secondary hover:text-error transition-colors"
                >
                  close
                </button>
              </div>
            ))}
          </div>
          <div className="mt-lg flex justify-end">
            <button 
              onClick={onProcess}
              disabled={isProcessing}
              className="bg-primary text-on-primary px-xl py-md rounded-lg font-title-sm hover:opacity-90 transition-all shadow-md disabled:opacity-50 flex items-center gap-sm"
            >
              {isProcessing ? (
                <>
                  <span className="material-symbols-outlined animate-spin">sync</span>
                  PROCESSANDO...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">analytics</span>
                  INICIAR ANÁLISE
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
