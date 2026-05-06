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

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const searchable = rows.filter((row) => {
      if (!normalizedQuery) return true;
      return JSON.stringify(row).toLowerCase().includes(normalizedQuery);
    });

    return [...searchable].sort((a, b) => {
      const left = valueForSort(a, sortKey);
      const right = valueForSort(b, sortKey);
      const result =
        typeof left === 'number' && typeof right === 'number'
          ? left - right
          : String(left).localeCompare(String(right), 'pt-BR', { numeric: true });
      return direction === 'asc' ? result : -result;
    });
  }, [rows, query, sortKey, direction]);

  function updateSort(key: SortKey) {
    if (sortKey === key) {
      setDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setDirection('asc');
  }

  return (
    <div className="tableBlock">
      <div className="tableTools">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Pesquisar na tabela"
          aria-label="Pesquisar na tabela"
        />
        <span>{filteredRows.length} linha(s)</span>
      </div>

      <div className="tableScroll">
        <table>
          <thead>
            <tr>
              <SortableHead label="Natureza" sortKey="nature" onSort={updateSort} />
              <SortableHead label="Conta Contábil" sortKey="account" onSort={updateSort} />
              <SortableHead label="Cod. R." sortKey="code" onSort={updateSort} />
              <SortableHead label="Nome da Conta" sortKey="name" onSort={updateSort} />
              <SortableHead label="S. Anterior" sortKey="previousBalance" onSort={updateSort} />
              <SortableHead label="Débito" sortKey="debit" onSort={updateSort} />
              <SortableHead label="Crédito" sortKey="credit" onSort={updateSort} />
              <SortableHead label="S. Atual" sortKey="currentBalance" onSort={updateSort} />
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="emptyCell">
                  Nenhuma linha encontrada para os filtros aplicados.
                </td>
              </tr>
            ) : (
              filteredRows.map((row, index) => (
                <tr key={`${row.account}-${row.name}-${index}`}>
                  <td>{classifyAccount(row.account) || '-'}</td>
                  <td className="mono">{row.account}</td>
                  <td className="mono">{row.code ?? '-'}</td>
                  <td>{row.name}</td>
                  <td className="number">{row.previousBalance}</td>
                  <td className="number">{row.debit}</td>
                  <td className="number">{row.credit}</td>
                  <td className="number">{row.currentBalance}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortableHead({
  label,
  sortKey,
  onSort
}: {
  label: string;
  sortKey: SortKey;
  onSort: (key: SortKey) => void;
}) {
  return (
    <th>
      <button type="button" onClick={() => onSort(sortKey)}>
        {label}
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
