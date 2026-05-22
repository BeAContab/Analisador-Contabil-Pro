# Changelog

## 1.0.10 - 2026-05-22
- Adicionada a analise `Despesas Credoras na Classe 3`, validando contas da classe 3 com `S. Atual` credor fora dos grupos de excecao definidos.
- Mantidas como excecao as familias `3`, `3.1`, `3.1.02`, `3.1.03`, `3.1.06` e `3.9`, com seus respectivos filhos.
- Incluida acao corretiva especifica para orientar a revisao de classificacao e lancamentos das despesas credoras.

## 1.0.9 - 2026-05-22
- Refinada a analise `Depreciacao x Bens` com pareamento semantico entre bens e depreciacoes, cobrindo variacoes como `p/`, `Contr.` e `Expl.`.
- O relatorio passou a usar colunas especificas para bem e depreciacao/amortizacao/exaustao, em vez da tabela contabil generica.
- Exportacoes `XLSX` e `PDF` da analise `Depreciacao x Bens` agora seguem o layout pareado com acao corretiva por linha.

## 1.0.8 - 2026-05-22
- Adicionada a analise `Depreciacao x Bens`, comparando os valores numericos de `S. Atual` entre bens do grupo `IMOBILIZADO` e suas depreciacoes equivalentes.
- Excluido da validacao o grupo `IMOBILIZADO EM ANDAMENTO` e suas contas filhas.
- A analise agora sinaliza dois cenarios: depreciacao maior que o bem equivalente e depreciacao sem bem correspondente.

## 1.0.7 - 2026-05-22
- Ajustada a analise `CMV x Receita Mercadorias` para diferenciar o motivo de atencao: percentual acima de 100%, base incompleta (Cod. R. ausentes) ou receita total zerada.
- Atualizado o quadro de percentual para exibir mensagem coerente com o motivo real do alerta.
- Refinada a acao corretiva do relatorio para cobrir os tres cenarios de validacao.

## 1.0.6 - 2026-05-22
- Adicionada a analise `CMV x Receita Mercadorias` com a formula baseada no Cod. R. 3001 dividido pela soma dos creditos dos Cod. R. 2603, 2652 e 2700.
- Incluido quadro visual com o percentual `CMV/Receita` na interface quando o relatorio estiver ativo.
- Exportacoes `XLSX` e `PDF` passaram a respeitar itens de calculo em formato percentual.

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
