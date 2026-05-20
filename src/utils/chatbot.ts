import { CompanyReport } from '../types';
import { formatNumberAsBrazilianMoney } from './format';
import { buildGeminiPrompt } from './gemini';

export interface ChatSuggestion {
  id: string;
  label: string;
  prompt: string;
}

export function buildChatSuggestions(reports: CompanyReport[]): ChatSuggestion[] {
  if (reports.length === 0) {
    return [
      {
        id: 'product-overview',
        label: 'O que o sistema analisa?',
        prompt: 'O que o sistema analisa?'
      },
      {
        id: 'privacy',
        label: 'Como funciona a privacidade?',
        prompt: 'Como funciona a privacidade do processamento local?'
      },
      {
        id: 'alerts',
        label: 'Quais alertas existem?',
        prompt: 'Quais alertas o sistema consegue identificar?'
      }
    ];
  }

  return [
    {
      id: 'summary',
      label: 'Resuma os principais riscos',
      prompt: 'Resuma os principais riscos encontrados'
    },
    {
      id: 'attention',
      label: 'Qual empresa exige prioridade?',
      prompt: 'Qual empresa exige prioridade de revisao?'
    },
    {
      id: 'inverted',
      label: 'Explique saldos invertidos',
      prompt: 'Explique os saldos invertidos encontrados'
    },
    {
      id: 'unclassified',
      label: 'Houve falhas de leitura?',
      prompt: 'Existem linhas nao classificadas ou limitacoes de leitura?'
    }
  ];
}

export function buildWelcomeMessage(reports: CompanyReport[]): string {
  if (reports.length === 0) {
    return 'Sou a assistente do Analisador Contabil Pro. Posso explicar como o sistema funciona, quais alertas ele detecta e como interpretar os balancetes depois do processamento.';
  }

  const companyLabel = reports.length === 1 ? '1 empresa analisada' : `${reports.length} empresas analisadas`;
  const totalOccurrences = sumOccurrences(reports);
  return `Sou a assistente do Analisador Contabil Pro. Ja tenho contexto de ${companyLabel} e ${totalOccurrences} ocorrencias identificadas. Posso resumir riscos, explicar regras e orientar a conferencia manual.`;
}

export function generateChatbotResponse(input: string, reports: CompanyReport[]): string {
  const question = normalize(input);
  const specificCompany = findCompanyMention(question, reports);

  if (reports.length === 0) {
    return answerWithoutReports(question);
  }

  if (specificCompany) {
    return answerForSpecificCompany(specificCompany);
  }

  if (hasAny(question, ['resuma', 'resumo', 'principais riscos', 'principais alertas', 'visao geral'])) {
    return buildExecutiveSummary(reports);
  }

  if (hasAny(question, ['prioridade', 'priorizar', 'mais alertas', 'empresa exige prioridade', 'mais ocorrencias'])) {
    return buildPriorityResponse(reports);
  }

  if (hasAny(question, ['saldo invertido', 'saldos invertidos', 'invertido'])) {
    return buildInvertedResponse(reports);
  }

  if (hasAny(question, ['sem movimentacao', 'zero movimentacao', 'contas paradas'])) {
    return buildZeroMovementResponse(reports);
  }

  if (hasAny(question, ['nao classificadas', 'nao classificada', 'limitacao de leitura', 'parser', 'pdf'])) {
    return buildUnclassifiedResponse(reports);
  }

  if (hasAny(question, ['clientes', '1.1.02'])) {
    return buildFamilyResponse(reports, 'clientes');
  }

  if (hasAny(question, ['fornecedores', '2.1.03'])) {
    return buildFamilyResponse(reports, 'fornecedores');
  }

  if (hasAny(question, ['estoques', '1.1.08'])) {
    return buildStocksResponse(reports);
  }

  if (hasAny(question, ['distribuicao', 'lucros', 'resultado do periodo', '2.4.13', '1.1.04.019'])) {
    return buildComparisonResponse(reports);
  }

  if (hasAny(question, ['o que o sistema analisa', 'o que o sistema faz', 'funciona'])) {
    return 'O sistema analisa balancetes em PDF, extrai contas, saldos e movimentacoes, e gera alertas como saldos invertidos, contas sem movimentacao, comparacoes entre distribuicao e resultado, alem de verificacoes de clientes, fornecedores e estoques.';
  }

  if (hasAny(question, ['privacidade', 'processamento local', 'seguranca'])) {
    return 'O fluxo atual do produto processa o PDF localmente no navegador. Isso reduz exposicao de dados sensiveis, mas a interpretacao do chatbot continua limitada ao que foi extraido e classificado com sucesso pelo parser.';
  }

  return `${buildExecutiveSummary(reports)} Se quiser, posso aprofundar por tema: saldos invertidos, clientes, fornecedores, estoques, distribuicao x resultado ou uma empresa especifica pelo nome.`;
}

export function buildLocalPromptForGemini(userMessage: string, reports: CompanyReport[]): string {
  return buildGeminiPrompt(reports, userMessage);
}

function answerWithoutReports(question: string): string {
  if (hasAny(question, ['privacidade', 'processamento local', 'seguranca'])) {
    return 'O produto foi desenhado para processar os PDFs localmente no navegador. Isso ajuda a preservar dados sensiveis e evita envio desnecessario do balancete para terceiros.';
  }

  if (hasAny(question, ['alertas', 'regras', 'quais alertas'])) {
    return 'O sistema detecta saldos invertidos, contas sem movimentacao, divergencias entre distribuicao e resultado e analises especificas de clientes, fornecedores e estoques. Depois que voce processar um PDF, eu consigo interpretar esses resultados com mais contexto.';
  }

  return 'Assim que voce processar um ou mais balancetes, eu consigo resumir riscos, explicar alertas e sugerir proximos passos de conferencia. Por enquanto, posso te orientar sobre o funcionamento do sistema e das regras contabeis que ele aplica.';
}

function answerForSpecificCompany(report: CompanyReport): string {
  const total = companyOccurrences(report);
  const highlights: string[] = [];

  if (report.invertedRows.length > 0) {
    highlights.push(`${report.invertedRows.length} saldo(s) invertido(s)`);
  }
  if (report.zeroMovementRows.length > 0) {
    highlights.push(`${report.zeroMovementRows.length} conta(s) sem movimentacao`);
  }
  if (report.comparisonReport.isAttention) {
    highlights.push('divergencia na comparacao entre distribuicao e resultado');
  }
  if (report.unclassified.length > 0) {
    highlights.push(`${report.unclassified.length} linha(s) nao classificadas`);
  }

  const summary = highlights.length > 0 ? highlights.join(', ') : 'nenhum alerta relevante nas regras atuais';
  return `${report.companyName} tem ${total} ocorrencia(s) nas regras atuais. Os principais pontos foram: ${summary}. O periodo analisado foi ${report.period}. Se quiser, posso detalhar os alertas dessa empresa por tema.`;
}

function buildExecutiveSummary(reports: CompanyReport[]): string {
  const companiesWithAlerts = reports.filter((report) => companyOccurrences(report) > 0 || report.unclassified.length > 0 || report.errors.length > 0);
  const totalOccurrences = sumOccurrences(reports);
  const totalUnclassified = reports.reduce((sum, report) => sum + report.unclassified.length, 0);
  const leader = reports
    .map((report) => ({ report, count: companyOccurrences(report) }))
    .sort((left, right) => right.count - left.count)[0];

  const leaderText =
    leader && leader.count > 0
      ? `A empresa com maior concentracao de alertas foi ${leader.report.companyName}, com ${leader.count} ocorrencia(s).`
      : 'Nenhuma empresa concentrou alertas relevantes nas regras atuais.';

  return `Foram analisadas ${reports.length} empresa(s), com ${totalOccurrences} ocorrencia(s) nas regras atuais e ${totalUnclassified} linha(s) nao classificadas. ${companiesWithAlerts.length} empresa(s) merecem revisao mais atenta. ${leaderText}`;
}

function buildPriorityResponse(reports: CompanyReport[]): string {
  const ranked = reports
    .map((report) => ({
      report,
      count: companyOccurrences(report),
      parserRisk: report.unclassified.length
    }))
    .sort((left, right) => right.count + right.parserRisk - (left.count + left.parserRisk));

  const top = ranked[0];
  if (!top || top.count + top.parserRisk === 0) {
    return 'No recorte atual, nao ha uma empresa com prioridade clara de revisao. Ainda assim, vale conferir manualmente se o PDF teve linhas nao classificadas ou contas nao localizadas.';
  }

  const reasons: string[] = [];
  if (top.report.invertedRows.length > 0) reasons.push(`${top.report.invertedRows.length} saldo(s) invertido(s)`);
  if (top.report.comparisonReport.isAttention) reasons.push('divergencia de distribuicao x resultado');
  if (top.report.unclassified.length > 0) reasons.push(`${top.report.unclassified.length} linha(s) nao classificadas`);

  return `A empresa que eu priorizaria agora e ${top.report.companyName}. Ela combina ${top.count} ocorrencia(s) nas regras com ${top.parserRisk} possivel(is) risco(s) de leitura. O motivo principal e: ${reasons.join(', ') || 'conjunto de alertas distribuidos em varias analises'}.`;
}

function buildInvertedResponse(reports: CompanyReport[]): string {
  const total = reports.reduce((sum, report) => sum + report.invertedRows.length, 0);
  if (total === 0) {
    return 'Nao encontrei saldos invertidos nos balancetes processados. Pelas regras atuais, isso indica que as contas do Ativo e do Passivo/PL nao terminaram com natureza inconsistente.';
  }

  const top = reports
    .filter((report) => report.invertedRows.length > 0)
    .sort((left, right) => right.invertedRows.length - left.invertedRows.length)[0];

  return `Foram encontrados ${total} saldo(s) invertido(s). Esse alerta aparece quando contas do Ativo terminam credoras ou contas do Passivo/PL terminam devedoras, fora das excecoes previstas. A concentracao mais alta esta em ${top.companyName}, com ${top.invertedRows.length} ocorrencia(s). O proximo passo ideal e revisar classificacao, encerramento e possiveis lancamentos invertidos.`;
}

function buildZeroMovementResponse(reports: CompanyReport[]): string {
  const total = reports.reduce((sum, report) => sum + report.zeroMovementRows.length, 0);
  if (total === 0) {
    return 'Nao foram encontradas contas sem movimentacao no recorte atual. Isso sugere que, pelas regras usadas, nao houve combinacao relevante de debito zero e credito zero nas contas sinalizadas.';
  }

  return `Foram encontradas ${total} conta(s) sem movimentacao. Esse relatorio ajuda a localizar contas que permaneceram paradas no periodo e podem merecer revisao de uso, encerramento ou classificacao, principalmente quando deveriam ter participado da movimentacao operacional.`;
}

function buildUnclassifiedResponse(reports: CompanyReport[]): string {
  const totalUnclassified = reports.reduce((sum, report) => sum + report.unclassified.length, 0);
  const companies = reports.filter((report) => report.unclassified.length > 0);

  if (totalUnclassified === 0) {
    return 'Nao encontrei linhas nao classificadas nos arquivos atuais. Isso e um bom sinal de aderencia do PDF ao formato esperado pelo parser.';
  }

  return `Existem ${totalUnclassified} linha(s) nao classificadas distribuidas em ${companies.length} empresa(s). Isso pode indicar quebra de linha, variacao de layout, valores colados no texto ou trechos do PDF fora do padrao esperado. Vale conferir o arquivo original antes de concluir que se trata de erro contabil.`;
}

function buildFamilyResponse(reports: CompanyReport[], family: 'clientes' | 'fornecedores'): string {
  const analysisKinds =
    family === 'clientes'
      ? ['analysis1', 'analysis2', 'analysis3', 'analysis4', 'analysis5']
      : ['analysis6', 'analysis7', 'analysis8', 'analysis9'];

  const totalFlags = reports.reduce((sum, report) => {
    return (
      sum +
      report.analysisReports
        .filter((analysis) => analysisKinds.includes(analysis.kind))
        .reduce((innerSum, analysis) => innerSum + (analysis.rows.length > 0 ? analysis.rows.length : analysis.isAttention ? 1 : 0), 0)
    );
  }, 0);

  if (totalFlags === 0) {
    return `Nao encontrei ocorrencias relevantes nas analises de ${family} no contexto atual.`;
  }

  return `As analises de ${family} somaram ${totalFlags} ocorrencia(s). Eu sugeriria revisar primeiro as regras com divergencia de saldo residual, ausencia de contrapartida no periodo e conciliacao entre familias de contas e movimentacoes relacionadas. Se quiser, posso detalhar ${family} empresa por empresa.`;
}

function buildStocksResponse(reports: CompanyReport[]): string {
  const affected = reports.filter((report) => report.analysisReports.some((analysis) => analysis.kind === 'analysis7' && analysis.isAttention));
  if (affected.length === 0) {
    return 'Nao houve alerta relevante na validacao entre estoques e fornecedores. Pelas regras atuais, o debito de Estoques nao ficou acima do credito de Fornecedores nos casos analisados.';
  }

  return `${affected.length} empresa(s) tiveram alerta na validacao entre Estoques e Fornecedores. Esse sinal merece revisao porque pode indicar descasamento entre entrada de mercadorias, reconhecimento de obrigacoes e classificacao contabil no periodo.`;
}

function buildComparisonResponse(reports: CompanyReport[]): string {
  const affected = reports.filter((report) => report.comparisonReport.isAttention);
  if (affected.length === 0) {
    return 'A comparacao entre Distribuicao Antecipada de Lucros, Resultado do Periodo e Lucros/Prejuizos Acumulados nao apresentou alerta no contexto atual.';
  }

  return `${affected.length} empresa(s) apresentaram alerta na comparacao entre distribuicao e resultado. Essa verificacao procura inconsistencias entre as contas 3, 6, 2.4.13 e 1.1.04.019, conforme a disponibilidade dos saldos. Vale conferir se houve distribuicao registrada acima da base contabil esperada ou se faltou alguma conta no PDF.`;
}

function findCompanyMention(question: string, reports: CompanyReport[]): CompanyReport | undefined {
  return reports.find((report) => {
    const normalizedName = normalize(report.companyName);
    return normalizedName.length > 3 && question.includes(normalizedName);
  });
}

function sumOccurrences(reports: CompanyReport[]): number {
  return reports.reduce((sum, report) => sum + companyOccurrences(report), 0);
}

function companyOccurrences(report: CompanyReport): number {
  return (
    report.invertedRows.length +
    report.zeroMovementRows.length +
    (report.comparisonReport.isAttention ? 1 : 0) +
    report.analysisReports.reduce((sum, analysis) => sum + (analysis.rows.length > 0 ? analysis.rows.length : analysis.isAttention ? 1 : 0), 0)
  );
}

function hasAny(value: string, terms: string[]): boolean {
  return terms.some((term) => value.includes(normalize(term)));
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s./-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildChatFooterNote(reports: CompanyReport[]): string {
  if (reports.length === 0) {
    return 'Sem balancete carregado ainda.';
  }

  const totalCompanies = reports.length;
  const totalOccurrences = sumOccurrences(reports);
  return `${totalCompanies} empresa(s) no contexto atual • ${formatNumberAsBrazilianMoney(totalOccurrences).replace(',00', '')} ocorrencia(s) analisadas`;
}
