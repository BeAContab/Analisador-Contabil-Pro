# Changelog

## 1.0.5 - 2026-05-21
- Adicionada a coluna `Acao corretiva` nos relatorios exibidos em tela para orientar o contador sobre o proximo ajuste sugerido.
- Exportacoes `XLSX` e `PDF` atualizadas para incluir a mesma orientacao por tipo de relatorio.
- Padronizadas regras de orientacao corretiva para saldos invertidos, contas sem movimentacao, distribuicao x resultado e analises de clientes/fornecedores/estoques.

## 1.0.4 - 2026-05-21
- Migracao da configuracao de deploy para Vercel, com remocao da base fixa do GitHub Pages no Vite.
- Adicao de configuracao declarativa em `vercel.json` para build em `npm run build` com saida em `dist`.
- Remocao do workflow de deploy do GitHub Pages e ignorado do diretório `.vercel/`.

## 1.0.3 - 2026-05-20
- Evolucao do agente Gemini para um perfil senior de analise de balancete, com priorizacao de risco, cautela tecnica e referencias normativas de alto nivel.
- Padronizacao do prompt do Gemini com checklist interno e formato obrigatorio de resposta: resumo executivo, achados priorizados, fundamentacao tecnica, limitacoes e proximos passos.
- Ajuste das mensagens de bootstrap e fallback para diferenciar melhor o modo local do modo Gemini.
- Refinamento da mensagem de boas-vindas do chatbot local para reforcar foco em risco, limitacoes e conferencia manual.

## 1.0.2 - 2026-05-20
- Refatoracao da exportacao de relatorios para imports dinamicos de `xlsx`, `jspdf` e `jspdf-autotable`.
- Ajuste de chunking no `vite.config.ts`, removendo agrupamento artificial de `reports`.
- Build validado sem warning de chunk acima de 500 kB.

## 1.0.1 - 2026-05-20
- Refatoracao do fluxo de upload/processamento para hook dedicado `useFileProcessing`.
- Simplificacao do `App.tsx` com separacao de responsabilidades.
- Correcao de textos de interface com acentuacao no `App.tsx`.
- Lazy loading para `PrivacyPolicy`, `DataSecurity`, `LocalProcessingDoc` e `ChatbotFab`.
- Otimizacao de build no Vite com `manualChunks` para `react`, `pdf` e `reports`.
