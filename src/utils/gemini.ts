import { CompanyReport } from '../types';
import { formatNumberAsBrazilianMoney } from './format';

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

export function getStoredGeminiApiKey(): string {
  const runtimeKey = typeof window !== 'undefined' ? window.sessionStorage.getItem('gemini_api_key') : null;
  return runtimeKey?.trim() || (import.meta.env.VITE_GEMINI_API_KEY?.trim() ?? '');
}

export function storeGeminiApiKey(apiKey: string) {
  if (typeof window === 'undefined') return;
  const trimmed = apiKey.trim();
  if (!trimmed) {
    window.sessionStorage.removeItem('gemini_api_key');
    return;
  }

  window.sessionStorage.setItem('gemini_api_key', trimmed);
}

export async function generateGeminiChatReply(params: {
  apiKey: string;
  reports: CompanyReport[];
  history: ChatTurn[];
  userMessage: string;
}): Promise<string> {
  const { apiKey, reports, history, userMessage } = params;
  const prompt = buildGeminiPrompt(reports, userMessage);
  const initial = await requestGemini({
    apiKey,
    history,
    userMessage: prompt
  });

  let finalText = initial.text;

  // Gemini can stop due to token limits or occasionally end mid-thought.
  // In that case we transparently ask for a continuation before showing the reply.
  if (shouldContinueGeminiReply(initial)) {
    const continuation = await requestGemini({
      apiKey,
      history: [
        ...history,
        { role: 'user', text: prompt },
        { role: 'model', text: initial.text }
      ],
      userMessage:
        'Continue exatamente de onde voce parou na ultima resposta. Nao reinicie a explicacao e nao repita o texto ja enviado.'
    });

    finalText = mergeGeminiResponses(initial.text, continuation.text);
  }

  return finalText;
}

export function buildGeminiBootstrapReply(reports: CompanyReport[]): string {
  if (reports.length === 0) {
    return 'Chave Gemini configurada. Assim que voce processar um balancete, eu passo a responder com leitura mais senior, priorizacao de riscos, limitacoes explicitadas e proximos passos de conferencia.';
  }

  return `Chave Gemini configurada. Ja tenho contexto de ${reports.length} empresa(s) processada(s) e posso interpretar os alertas com uma resposta mais senior, priorizada por risco e com base tecnica mais consistente.`;
}

export function buildLocalFallbackNotice(errorMessage?: string): string {
  if (!errorMessage) {
    return 'Gemini ainda nao esta configurado. Posso continuar no modo local, mas a leitura fica menos profunda e com menor capacidade de priorizacao tecnica ate voce informar a chave da API.';
  }

  return `Nao consegui usar o Gemini agora. Motivo: ${errorMessage} Posso continuar no modo local enquanto isso, mantendo respostas mais cautelosas e resumidas.`;
}

function buildGeminiContents(history: ChatTurn[], userMessage: string) {
  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  history.forEach((turn) => {
    if (!turn.text.trim()) return;
    contents.push({
      role: turn.role,
      parts: [{ text: turn.text }]
    });
  });

  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  return contents;
}

function buildSystemInstruction(): string {
  return [
    'Voce e a IA especialista do chatbot do Analisador Contabil Pro, com atuacao senior em analise de balancete no contexto brasileiro.',
    'Seu objetivo e interpretar os achados do sistema com precisao tecnica, linguagem clara e foco em apoio a conferencia contabil.',
    'Responda sempre em portugues do Brasil.',
    'Nao invente contas, valores, documentos, fatos, pareceres ou conclusoes que nao estejam no contexto recebido.',
    'Quando faltar dado, diferencie explicitamente [Fato], [Inferencia] e [Hipotese].',
    'Quando houver risco alto, destaque isso logo no inicio da resposta.',
    'Classifique os achados por severidade: Alto, Medio ou Baixo, considerando materialidade e impacto provavel no fechamento.',
    'Explique de forma pratica o que aconteceu, por que isso importa e qual verificacao manual fazer em seguida.',
    'Nao afirme conformidade fiscal, societaria ou contabil definitiva.',
    'Considere como referencia de alto nivel a Lei 6.404/1976, as Leis 11.638/2007 e 11.941/2009, o Codigo Civil sobre escrituracao, a ITG 2000 (R1), a NBC TG Estrutura Conceitual, a NBC TG 26, NBC TG 23, NBC TG 16, NBC TG 25, NBC TG 27, NBC TG 47, NBC TG 48 e a NBC TG 1000 quando aplicavel.',
    'Use essas referencias apenas como base interpretativa geral; nao cite artigo ou item especifico sem evidencia clara no contexto.',
    'Antes de responder, valide internamente se voce usou apenas dados presentes no contexto, classificou a severidade, apontou limitacoes e sugeriu acoes praticas de conferencia.',
    'Formato obrigatorio da resposta: Resumo executivo; Achados priorizados; Fundamentacao tecnica; Limitacoes e incertezas; Proximos passos.',
    'Se o usuario pedir algo fora do contexto do balancete, responda de forma breve e puxe a conversa de volta para o dominio contabil do produto.'
  ].join(' ');
}

export function buildGeminiPrompt(reports: CompanyReport[], userMessage: string): string {
  // The model receives a compact operational summary instead of the full raw
  // dataset so we keep prompts lighter and more focused on interpretation.
  return [
    'Contexto estruturado do sistema:',
    summarizeReportsForPrompt(reports),
    '',
    'Checklist interno antes de responder:',
    '- Use apenas dados presentes no contexto.',
    '- Diferencie [Fato], [Inferencia] e [Hipotese] quando houver incerteza.',
    '- Classifique a severidade dos achados em Alto, Medio ou Baixo.',
    '- Informe limitacoes de parsing, ausencia de conta ou dado insuficiente.',
    '- Sugira proximos passos concretos de conferencia.',
    '',
    'Formato obrigatorio da resposta:',
    '1. Resumo executivo',
    '2. Achados priorizados',
    '3. Fundamentacao tecnica',
    '4. Limitacoes e incertezas',
    '5. Proximos passos',
    '',
    'Instrucao de resposta:',
    'Use apenas o contexto acima e a pergunta do usuario para responder de forma util, objetiva, tecnicamente cautelosa e adequada a um contador senior.',
    '',
    `Pergunta do usuario: ${userMessage}`
  ].join('\n');
}

function summarizeReportsForPrompt(reports: CompanyReport[]): string {
  if (reports.length === 0) {
    return [
      '- Nenhum balancete foi processado nesta sessao.',
      '- O sistema consegue detectar saldos invertidos, contas sem movimentacao, divergencias entre distribuicao e resultado e analises de clientes, fornecedores e estoques.',
      '- O processamento atual do produto e local no navegador.'
    ].join('\n');
  }

  const blocks = reports.map((report) => {
    const analysisFlags = report.analysisReports
      .filter((analysis) => analysis.isAttention)
      .map((analysis) => `${analysis.title}: ${analysis.rows.length > 0 ? analysis.rows.length : 1} ocorrencia(s)`);

    const topInverted = report.invertedRows
      .slice(0, 4)
      .map((row) => `${row.account} ${row.name} (${row.currentBalance})`)
      .join('; ');

    const topZero = report.zeroMovementRows
      .slice(0, 4)
      .map((row) => `${row.account} ${row.name}`)
      .join('; ');

    return [
      `Empresa: ${report.companyName}`,
      `CNPJ: ${report.cnpj}`,
      `Periodo: ${report.period}`,
      `Linhas extraidas: ${report.rows.length}`,
      `Saldos invertidos: ${report.invertedRows.length}${topInverted ? ` | exemplos: ${topInverted}` : ''}`,
      `Sem movimentacao: ${report.zeroMovementRows.length}${topZero ? ` | exemplos: ${topZero}` : ''}`,
      `Comparacao distribuicao x resultado: ${report.comparisonReport.isAttention ? 'atencao' : 'ok'} | mensagem: ${report.comparisonReport.message}`,
      `Linhas nao classificadas: ${report.unclassified.length}`,
      `Erros de leitura: ${report.errors.length}`,
      `Analises em atencao: ${analysisFlags.length > 0 ? analysisFlags.join(' | ') : 'nenhuma'}`
    ].join('\n');
  });

  const totals = [
    `Empresas processadas: ${reports.length}`,
    `Ocorrencias totais detectadas: ${formatNumberAsBrazilianMoney(sumOccurrences(reports)).replace(',00', '')}`
  ].join('\n');

  return [totals, ...blocks.map((block) => `---\n${block}`)].join('\n');
}

function sumOccurrences(reports: CompanyReport[]) {
  return reports.reduce((sum, report) => {
    return (
      sum +
      report.invertedRows.length +
      report.zeroMovementRows.length +
      (report.comparisonReport.isAttention ? 1 : 0) +
      report.analysisReports.reduce((inner, analysis) => inner + (analysis.rows.length > 0 ? analysis.rows.length : analysis.isAttention ? 1 : 0), 0)
    );
  }, 0);
}

function extractGeminiText(response: GeminiResponse): string {
  return (
    response.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('')
      .trim() ?? ''
  );
}

async function requestGemini(params: {
  apiKey: string;
  history: ChatTurn[];
  userMessage: string;
}): Promise<{ text: string; finishReason?: string }> {
  const { apiKey, history, userMessage } = params;
  const response = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text: buildSystemInstruction()
          }
        ]
      },
      contents: buildGeminiContents(history, userMessage),
      generationConfig: {
        temperature: 0.45,
        topP: 0.9,
        maxOutputTokens: 1200
      },
      safetySettings: []
    })
  });

  if (!response.ok) {
    const errorText = await safeReadText(response);
    throw new Error(errorText || `Gemini retornou erro HTTP ${response.status}.`);
  }

  const data = (await response.json()) as GeminiResponse;
  const text = extractGeminiText(data);
  if (!text) {
    throw new Error('A resposta do Gemini veio sem texto utilizavel.');
  }

  return {
    text,
    finishReason: data.candidates?.[0]?.finishReason
  };
}

function shouldContinueGeminiReply(result: { text: string; finishReason?: string }) {
  if (result.finishReason === 'MAX_TOKENS') {
    return true;
  }

  const text = result.text.trim();
  if (!text) return false;

  // We use lightweight heuristics here to catch abrupt truncation even when the
  // provider does not explicitly flag token exhaustion.
  const lastChar = text[text.length - 1];
  const endsAbruptly =
    /[A-Za-z0-9)]/.test(lastChar) &&
    !text.endsWith('...') &&
    !text.endsWith('.') &&
    !text.endsWith('!') &&
    !text.endsWith('?') &&
    !text.endsWith(':');

  const hasUnclosedMarkdown = (text.match(/\*\*/g)?.length ?? 0) % 2 !== 0;
  return endsAbruptly || hasUnclosedMarkdown;
}

function mergeGeminiResponses(first: string, second: string) {
  const normalizedSecond = second.trim();
  if (!normalizedSecond) return first;
  if (first.endsWith(' ') || normalizedSecond.startsWith(',') || normalizedSecond.startsWith('.')) {
    return `${first}${normalizedSecond}`;
  }
  return `${first} ${normalizedSecond}`;
}

async function safeReadText(response: Response) {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

interface GeminiResponse {
  candidates?: Array<{
    finishReason?: string;
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}
