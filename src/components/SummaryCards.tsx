interface SummaryCardsProps {
  companiesWithAlerts: number;
  reportsWithOccurrences: number;
  totalOccurrences: number;
  totalUnclassified: number;
}

export function SummaryCards({ 
  companiesWithAlerts, 
  reportsWithOccurrences, 
  totalOccurrences, 
  totalUnclassified 
}: SummaryCardsProps) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md">
      <Card 
        label="Empresas com Alertas" 
        value={companiesWithAlerts} 
        icon="warning" 
        tone={companiesWithAlerts > 0 ? 'attention' : 'neutral'} 
      />
      <Card 
        label="Relatórios com Ocorrência" 
        value={reportsWithOccurrences} 
        icon="description" 
        tone="neutral" 
      />
      <Card 
        label="Ocorrências Identificadas" 
        value={totalOccurrences} 
        icon="analytics" 
        tone="neutral" 
      />
      <Card 
        label="Linhas não Classificadas" 
        value={totalUnclassified} 
        icon="help_outline" 
        tone={totalUnclassified > 0 ? 'attention' : 'ok'} 
      />
    </section>
  );
}

function Card({ label, value, icon, tone }: { 
  label: string; 
  value: number; 
  icon: string; 
  tone: 'neutral' | 'attention' | 'ok' 
}) {
  const tones = {
    neutral: 'bg-surface-container-lowest text-primary border-outline-variant',
    attention: 'bg-error-container/20 text-error border-error/30',
    ok: 'bg-secondary-container/20 text-on-secondary-container border-secondary-container/30'
  };

  return (
    <div className={`${tones[tone]} p-lg border rounded-xl shadow-sm flex flex-col gap-md`}>
      <div className="flex justify-between items-start">
        <span className="text-label-caps font-label-caps uppercase tracking-wider opacity-70">{label}</span>
        <span className="material-symbols-outlined !text-[20px]">{icon}</span>
      </div>
      <div className="text-display-lg font-display-lg tabular-nums">{value}</div>
    </div>
  );
}
