import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { CompanyReport } from '../types';
import {
  buildChatFooterNote,
  buildChatSuggestions,
  buildLocalPromptForGemini,
  buildWelcomeMessage,
  generateChatbotResponse
} from '../utils/chatbot';
import {
  buildGeminiBootstrapReply,
  buildLocalFallbackNotice,
  generateGeminiChatReply,
  getStoredGeminiApiKey,
  storeGeminiApiKey
} from '../utils/gemini';

interface ChatbotFabProps {
  reports: CompanyReport[];
  isProcessing: boolean;
}

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
}

export function ChatbotFab({ reports, isProcessing }: ChatbotFabProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState(getStoredGeminiApiKey());
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isLoadingReply, setIsLoadingReply] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: buildWelcomeMessage(reports)
    }
  ]);
  const [hasInjectedReportUpdate, setHasInjectedReportUpdate] = useState(reports.length > 0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const suggestions = useMemo(() => buildChatSuggestions(reports), [reports]);
  const footerNote = useMemo(() => buildChatFooterNote(reports), [reports]);
  const activeApiKey = useMemo(() => getStoredGeminiApiKey(), [apiKeyInput]);
  const totalOccurrences = useMemo(
    () =>
      reports.reduce((sum, report) => {
        return (
          sum +
          report.invertedRows.length +
          report.zeroMovementRows.length +
          (report.comparisonReport.isAttention ? 1 : 0) +
          report.analysisReports.reduce(
            (innerSum, analysis) => innerSum + (analysis.rows.length > 0 ? analysis.rows.length : analysis.isAttention ? 1 : 0),
            0
          )
        );
      }, 0),
    [reports]
  );

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isOpen]);

  useEffect(() => {
    if (reports.length === 0) {
      setHasInjectedReportUpdate(false);
      return;
    }

    if (!hasInjectedReportUpdate) {
      setMessages((current) => [
        ...current,
        {
          id: `report-update-${reports.length}-${Date.now()}`,
          role: 'assistant',
          content: `Analise carregada. Agora consigo interpretar ${reports.length} empresa(s) processada(s), explicar alertas e sugerir prioridades de revisao.`
        }
      ]);
      setHasInjectedReportUpdate(true);
    }
  }, [hasInjectedReportUpdate, reports]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    void sendMessage(trimmed);
  }

  async function sendMessage(content: string) {
    const trimmed = content.trim();
    if (!trimmed || isLoadingReply) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed
    };

    setMessages((current) => [...current, userMessage]);
    setInput('');
    setIsLoadingReply(true);

    try {
      const apiKey = getStoredGeminiApiKey();
      // When a Gemini key exists, we enrich the question with report context and
      // let the model produce the explanation. Without a key, we stay fully local.
      const assistantContent = apiKey
        ? await generateGeminiChatReply({
            apiKey,
            reports,
            history: messages
              .filter((message) => message.role === 'assistant' || message.role === 'user')
              .map((message) => ({
                role: message.role === 'assistant' ? ('model' as const) : ('user' as const),
                text: message.content
              })),
            userMessage: buildLocalPromptForGemini(trimmed, reports)
          })
        : `${buildLocalFallbackNotice()} ${generateChatbotResponse(trimmed, reports)}`;

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now() + 1}`,
          role: 'assistant',
          content: assistantContent
        }
      ]);
    } catch (error) {
      const errorMessage = error instanceof Error ? sanitizeGeminiError(error.message) : 'Falha desconhecida ao consultar o Gemini.';
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now() + 1}`,
          role: 'assistant',
          content: `${buildLocalFallbackNotice(errorMessage)} ${generateChatbotResponse(trimmed, reports)}`
        }
      ]);
    } finally {
      setIsLoadingReply(false);
    }
  }

  function handleSuggestion(prompt: string) {
    setIsOpen(true);
    void sendMessage(prompt);
  }

  function handleSaveApiKey() {
    storeGeminiApiKey(apiKeyInput);
    setApiKeyInput(getStoredGeminiApiKey());
    setMessages((current) => [
      ...current,
      {
        id: `assistant-bootstrap-${Date.now()}`,
        role: 'assistant',
        content: buildGeminiBootstrapReply(reports)
      }
    ]);
    setIsConfigOpen(false);
  }

  return (
    <div className="fixed bottom-6 right-6 z-[70] flex flex-col items-end gap-4">
      {isOpen && (
        <section className="w-[min(420px,calc(100vw-1.5rem))] overflow-hidden rounded-[28px] border border-outline-variant bg-surface-container-lowest shadow-[0_24px_50px_rgba(0,24,54,0.18)]">
          <header className="bg-primary px-lg py-md text-on-primary">
            <div className="flex items-start justify-between gap-md">
              <div>
                <p className="text-label-caps font-label-caps uppercase opacity-80">Assistente IA</p>
                <h2 className="text-title-sm font-title-sm">Analisador Contabil Pro</h2>
                <p className="mt-1 text-body-sm text-on-primary/80">
                  {isProcessing ? 'Aguardando o processamento terminar para enriquecer o contexto.' : footerNote}
                </p>
              </div>
              <div className="flex items-center gap-sm">
                <button
                  type="button"
                  onClick={() => setIsConfigOpen((current) => !current)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
                  aria-label="Configurar Gemini"
                >
                  <span className="material-symbols-outlined">settings</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
                  aria-label="Fechar chatbot"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>
          </header>

          {isConfigOpen && (
            <div className="border-b border-outline-variant bg-secondary-container/30 px-md py-md">
              <div className="space-y-sm">
                <p className="text-body-sm text-on-surface">
                  Cole sua chave do Gemini ou use `VITE_GEMINI_API_KEY` em `.env.local`. A chave digitada aqui fica apenas na sessao atual do navegador.
                </p>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(event) => setApiKeyInput(event.target.value)}
                  placeholder="AIza..."
                  className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-md py-sm text-body-sm text-on-surface outline-none focus:border-primary"
                />
                <div className="flex items-center gap-sm">
                  <button
                    type="button"
                    onClick={handleSaveApiKey}
                    className="rounded-full bg-primary px-md py-sm text-body-sm text-on-primary transition-opacity hover:opacity-90"
                  >
                    Salvar chave
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      storeGeminiApiKey('');
                      setApiKeyInput('');
                    }}
                    className="rounded-full border border-outline-variant px-md py-sm text-body-sm text-primary transition-colors hover:bg-surface-container-high"
                  >
                    Limpar
                  </button>
                  <span className="text-body-sm text-secondary">{activeApiKey ? 'Gemini ativo' : 'Modo local'}</span>
                </div>
              </div>
            </div>
          )}

          <div className="border-b border-outline-variant bg-surface-container-low px-md py-md">
            <div className="flex gap-sm overflow-x-auto pb-1">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  onClick={() => handleSuggestion(suggestion.prompt)}
                  className="whitespace-nowrap rounded-full border border-outline-variant bg-surface-container-lowest px-md py-sm text-body-sm text-primary transition-colors hover:bg-surface-container-high"
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
          </div>

          <div ref={scrollRef} className="flex max-h-[28rem] min-h-[22rem] flex-col gap-md overflow-y-auto bg-surface px-md py-md">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <article
                  className={`max-w-[85%] rounded-2xl px-md py-md text-body-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'bg-primary text-on-primary rounded-br-sm'
                      : 'bg-surface-container-lowest text-on-surface border border-outline-variant rounded-bl-sm'
                  }`}
                >
                  {message.content}
                </article>
              </div>
            ))}
            {isLoadingReply && (
              <div className="flex justify-start">
                <article className="max-w-[85%] rounded-2xl rounded-bl-sm border border-outline-variant bg-surface-container-lowest px-md py-md text-body-sm text-on-surface">
                  {activeApiKey ? 'Consultando Gemini...' : 'Gerando resposta local...'}
                </article>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="border-t border-outline-variant bg-surface-container-low px-md py-md">
            <div className="flex items-end gap-sm">
              <label className="sr-only" htmlFor="chatbot-input">
                Pergunta para a assistente
              </label>
              <textarea
                id="chatbot-input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage(input);
                  }
                }}
                rows={2}
                placeholder="Pergunte sobre alertas, empresas, clientes, fornecedores..."
                className="min-h-[56px] flex-1 resize-none rounded-2xl border border-outline-variant bg-surface-container-lowest px-md py-sm text-body-sm text-on-surface outline-none transition-colors placeholder:text-secondary focus:border-primary"
              />
              <button
                type="submit"
                className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary transition-transform hover:scale-[1.02] disabled:opacity-50"
                disabled={!input.trim() || isLoadingReply}
                aria-label="Enviar mensagem"
              >
                <span className="material-symbols-outlined">arrow_upward</span>
              </button>
            </div>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-primary text-on-primary shadow-[0_16px_36px_rgba(0,24,54,0.28)] transition-transform hover:scale-105"
        aria-label={isOpen ? 'Fechar chatbot' : 'Abrir chatbot'}
      >
        <span className="material-symbols-outlined !text-[28px]">{isOpen ? 'close' : 'chat'}</span>
        {!isOpen && totalOccurrences > 0 && (
          <span className="absolute -right-1 -top-1 min-w-[28px] rounded-full bg-error px-2 py-1 text-center text-[11px] font-bold text-on-error">
            {totalOccurrences > 99 ? '99+' : totalOccurrences}
          </span>
        )}
      </button>
    </div>
  );
}

function sanitizeGeminiError(errorMessage: string) {
  // Prevent accidental key leakage if the provider echoes the credential back.
  return errorMessage
    .replace(/\s+/g, ' ')
    .replace(/AIza[0-9A-Za-z\-_]+/g, '[api-key-redacted]')
    .trim();
}
