# Project Context

## Produto

O projeto é um aplicativo web em React + TypeScript para analisar balancetes contábeis em PDF diretamente no navegador, sem backend.

## Stack Atual

- Vite
- React 18
- TypeScript
- `pdfjs-dist` para leitura de PDFs
- `xlsx` para exportação em Excel
- `jspdf` + `jspdf-autotable` para exportação em PDF

## Capacidades Já Implementadas

- Upload de um ou mais PDFs por seletor de arquivo.
- Suporte a arrastar e soltar arquivos PDF.
- Processamento local no cliente.
- Parsing de metadados da empresa:
  - nome
  - código
  - CNPJ
  - período
- Extração de linhas contábeis com:
  - conta contábil
  - `Cod. R.`
  - nome da conta
  - saldo anterior
  - débito
  - crédito
  - saldo atual
- Relatório de saldos invertidos:
  - conta iniciada por `1` com saldo final `C`
  - conta iniciada por `2` com saldo final `D`
- Relatório de contas sem movimentação:
  - débito zero
  - crédito zero
- Relatório de comparação entre distribuição antecipada de lucros e resultado.
- Resultados separados por empresa/arquivo.
- Tabelas com busca, ordenação e rolagem horizontal.
- Exportação consolidada por empresa em `XLSX`.
- Exportação consolidada por empresa em `PDF`.
- Exibição de linhas não classificadas para depuração.

## Arquivos Importantes

- `src/App.tsx`: fluxo principal de upload, processamento e renderização dos resultados.
- `src/utils/parser.ts`: leitura do PDF, agrupamento por linha e parsing contábil.
- `src/utils/reports.ts`: geração dos relatórios exportáveis.
- `src/components/CompanyCard.tsx`: UI por empresa e painéis de relatório.
- `src/components/DataTable.tsx`: tabela com busca e ordenação.
- `src/utils/format.ts`: parsing e formatação de valores monetários.

## Regras de Negócio Observadas

- Certas contas são tratadas como exceções de natureza padrão:
  - `1.2.05.007`
  - `2.4.13.004`
- A comparação usa preferencialmente:
  - conta `1.1.04.019` ou nome contendo `DISTRIBUICAO ANTECIPADA DE LUCROS`
  - conta `3`
  - conta `6`
  - conta `2.4.13`
- Quando a distribuição não é encontrada ou seu valor é zero, existe modo de fallback comparando a soma das contas `3` e `6` contra `2.4.13`.

## Decisões recentes

- No fallback de `Distribuição x Resultado`, a diferença e o status de atenção devem comparar grandezas:
  - `diferenca = abs(baseValue) - abs(targetValue)`
  - há atenção quando `abs(baseValue) < abs(targetValue)`
- Nos relatórios `Clientes com Saldo Residual` e `Fornecedores com Saldo Residual`, a regra correta é:
  - `S. Atual > 0`
  - `S. Atual <= 10`
- Cada aba do card da empresa deve exibir uma explicação simples da regra aplicada.
- Nos cálculos de `Distribuição x Resultado` e `Conciliação Clientes x Receitas Operacionais`, os rótulos devem mostrar o número da conta e, entre parênteses, o nome da conta.
  - exemplo: `Conta 3 (RESULTADO DO PERÍODO)`
- A descrição da aba `Distribuição x Resultado` usa dois casos explicados em texto e deve preservar quebras de linha entre:
  - `Caso 1`
  - `Resumo`
  - `Caso 2`
  - `Resumo`

## Estado Técnico Atual

- O projeto compila com sucesso usando `npm.cmd run build`.
- O PowerShell do ambiente bloqueia `npm.ps1`, então `npm.cmd` é a forma mais segura de executar scripts do npm neste workspace.
- O build gera alerta de chunk grande no Vite, mas não falha.

## Limitações Atuais

- Sem backend, autenticação ou persistência.
- Sem testes automatizados.
- Sem visão consolidada cruzando múltiplas empresas.
- Sem edição manual dos dados extraídos.
