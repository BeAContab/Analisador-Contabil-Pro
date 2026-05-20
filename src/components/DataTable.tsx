import { useMemo, useState } from 'react';
import { InvertedBalanceRow, LedgerLine, ReportKind } from '../types';
import { classifyAccount, parseBrazilianMoney } from '../utils/format';

interface DataTableProps {
  rows: Array<LedgerLine | InvertedBalanceRow>;
  kind: ReportKind;
}

type SortKey =
  | 'nature'
  | 'account'
  | 'code'
  | 'name'
  | 'previousBalance'
  | 'debit'
  | 'credit'
  | 'currentBalance';

export function DataTable({ rows }: DataTableProps) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('account');
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const searchable = rows.filter((row) => {
      if (!normalizedQuery) return true;
      return (
        row.account.toLowerCase().includes(normalizedQuery) ||
        row.name.toLowerCase().includes(normalizedQuery) ||
        (row.code && row.code.toLowerCase().includes(normalizedQuery))
      );
    });

    const sorted = [...searchable].sort((a, b) => {
      const left = valueForSort(a, sortKey);
      const right = valueForSort(b, sortKey);
      const result =
        typeof left === 'number' && typeof right === 'number'
          ? left - right
          : String(left).localeCompare(String(right), 'pt-BR', { numeric: true });
      return direction === 'asc' ? result : -result;
    });

    return sorted;
  }, [rows, query, sortKey, direction]);

  const totalPages = Math.ceil(filteredRows.length / itemsPerPage);
  const paginatedRows = filteredRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  function updateSort(key: SortKey) {
    if (sortKey === key) {
      setDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setDirection('asc');
  }

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm flex flex-col overflow-hidden">
      <div className="p-md flex flex-wrap items-center justify-between gap-md border-b border-outline-variant bg-surface-container-low">
        <div className="relative flex-grow max-w-md">
          <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-secondary">search</span>
          <input 
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-xl pr-md py-xs bg-surface-container-lowest border border-outline rounded text-body-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary" 
            placeholder="Pesquisar por conta ou nome..." 
            type="text"
          />
        </div>
        <div className="flex items-center gap-sm">
           <span className="text-body-sm text-secondary font-medium">{filteredRows.length} registro(s)</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="bg-surface-container-low border-b border-outline-variant sticky top-0">
            <tr>
              <Th label="Natureza" sortKey="nature" activeSort={sortKey} direction={direction} onSort={updateSort} />
              <Th label="Conta Contábil" sortKey="account" activeSort={sortKey} direction={direction} onSort={updateSort} />
              <Th label="Nome da Conta" sortKey="name" activeSort={sortKey} direction={direction} onSort={updateSort} />
              <Th label="S. Anterior" sortKey="previousBalance" activeSort={sortKey} direction={direction} onSort={updateSort} align="right" />
              <Th label="Débito" sortKey="debit" activeSort={sortKey} direction={direction} onSort={updateSort} align="right" />
              <Th label="Crédito" sortKey="credit" activeSort={sortKey} direction={direction} onSort={updateSort} align="right" />
              <Th label="S. Atual" sortKey="currentBalance" activeSort={sortKey} direction={direction} onSort={updateSort} align="right" />
            </tr>
          </thead>
          <tbody className="text-data-table font-data-table divide-y divide-outline-variant">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-md py-xl text-center text-secondary italic bg-surface-bright">
                  Nenhum registro encontrado para os filtros aplicados.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, index) => (
                <tr key={`${row.account}-${row.name}-${index}`} className="hover:bg-surface-container transition-colors">
                  <td className="px-md py-xs border-r border-outline-variant">{classifyAccount(row.account) || '-'}</td>
                  <td className="px-md py-xs tabular-nums border-r border-outline-variant font-medium text-primary">{row.account}</td>
                  <td className="px-md py-xs border-r border-outline-variant">{row.name}</td>
                  <td className="px-md py-xs text-right tabular-nums border-r border-outline-variant">{row.previousBalance}</td>
                  <td className="px-md py-xs text-right tabular-nums border-r border-outline-variant">{row.debit}</td>
                  <td className="px-md py-xs text-right tabular-nums border-r border-outline-variant">{row.credit}</td>
                  <td className="px-md py-xs text-right tabular-nums font-bold text-primary">{row.currentBalance}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="p-md flex items-center justify-between bg-surface-container-low border-t border-outline-variant">
          <span className="text-body-sm text-secondary">
            Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredRows.length)} de {filteredRows.length} registros
          </span>
          <div className="flex items-center gap-xs">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="p-xs hover:bg-surface-container-highest rounded border border-outline-variant transition-colors disabled:opacity-30"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <span className="px-sm py-xs text-body-sm font-bold bg-primary text-on-primary rounded">{currentPage}</span>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="p-xs hover:bg-surface-container-highest rounded border border-outline-variant transition-colors disabled:opacity-30"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ label, sortKey, activeSort, direction, onSort, align = 'left' }: {
  label: string;
  sortKey: SortKey;
  activeSort: SortKey;
  direction: 'asc' | 'desc';
  onSort: (key: SortKey) => void;
  align?: 'left' | 'right';
}) {
  const isActive = activeSort === sortKey;
  return (
    <th className={`px-md py-sm font-label-caps text-label-caps text-secondary uppercase tracking-wider border-r border-outline-variant ${align === 'right' ? 'text-right' : ''}`}>
      <button 
        type="button" 
        onClick={() => onSort(sortKey)}
        className="flex items-center gap-xs hover:text-primary transition-colors w-full"
        style={{ justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}
      >
        {label}
        <span className={`material-symbols-outlined !text-[16px] transition-transform ${isActive ? 'opacity-100' : 'opacity-0'} ${direction === 'desc' ? 'rotate-180' : ''}`}>
          arrow_upward
        </span>
      </button>
    </th>
  );
}

function valueForSort(row: LedgerLine | InvertedBalanceRow, key: SortKey): string | number {
  if (key === 'nature') return classifyAccount(row.account);
  if (key === 'debit') return row.debitNumber;
  if (key === 'credit') return row.creditNumber;
  if (key === 'previousBalance') return parseBrazilianMoney(row.previousBalance);
  if (key === 'currentBalance') return parseBrazilianMoney(row.currentBalance);
  return row[key] ?? '';
}
