import { useState } from 'react';
import { CompanyReport, ReportKind } from '../types';
import { downloadPdf, downloadXlsx } from '../utils/reports';
import { DataTable } from './DataTable';

interface CompanyCardProps {
  company: CompanyReport;
}

export function CompanyCard({ company }: CompanyCardProps) {
  const [activeTab, setActiveTab] = useState<ReportKind>('inverted');
  const activeRows = activeTab === 'inverted' ? company.invertedRows : company.zeroMovementRows;
  const activeTitle =
    activeTab === 'inverted' ? 'Saldos invertidos Ativo/Passivo' : 'Contas com Débito e Crédito zerados';
  const hasExportRows = company.invertedRows.length > 0 || company.zeroMovementRows.length > 0;

  const activeWithCredit = company.invertedRows.filter((row) => row.alertType === 'Ativo com saldo C').length;
  const passiveWithDebit = company.invertedRows.filter((row) => row.alertType === 'Passivo/PL com saldo D').length;

  return (
    <article className="companyCard">
      <header className="companyHeader">
        <div>
          <p className="eyebrow">Empresa</p>
          <h2>{company.companyName}</h2>
          <div className="metadataGrid">
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
          Débito e Crédito zerados
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
            ) : (
              <div className="summaryGrid single">
                <Summary label="Total de contas encontradas" value={company.zeroMovementRows.length} />
              </div>
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

        {activeRows.length === 0 ? (
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

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="summaryItem">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
