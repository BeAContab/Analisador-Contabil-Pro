# Analisador Contabil Pro

Aplicacao web em `React + TypeScript + Vite` para analisar balancetes contabeis em PDF diretamente no navegador. O sistema extrai linhas contabeis, aplica regras de validacao e gera relatorios por empresa, com foco em produtividade, rastreabilidade e privacidade.

## Visao Geral

O projeto foi construido para:

- receber um ou mais balancetes em PDF;
- identificar empresa, CNPJ e periodo de referencia;
- extrair contas, saldos e movimentacoes;
- gerar alertas contabeis e relatorios de conferencia;
- exportar resultados consolidados em `XLSX` e `PDF`;
- oferecer um chatbot com IA para interpretar os alertas.

## Principais Funcionalidades

- Upload de arquivos PDF por selecao ou drag and drop.
- Processamento local no navegador para leitura e analise dos arquivos.
- Identificacao automatica de:
  - empresa;
  - CNPJ;
  - periodo;
  - linhas contabeis.
- Relatorio de saldos invertidos.
- Relatorio de contas sem movimentacao.
- Comparacao entre distribuicao antecipada de lucros e resultado do periodo.
- Analises especificas de clientes, fornecedores e estoques.
- Exportacao consolidada em `XLSX` e `PDF`.
- Chatbot flutuante no estilo `FAB` para interpretacao dos resultados.
- Integracao opcional com Gemini para respostas mais inteligentes e contextuais.

## Arquitetura Resumida

### Frontend
- `React 18`
- `TypeScript`
- `Vite`
- `Tailwind CSS`

### Processamento e relatorios
- `pdfjs-dist` para leitura dos PDFs
- `xlsx` para exportacao em planilhas
- `jspdf` e `jspdf-autotable` para exportacao em PDF

### Camada de IA
- Modo local com respostas contextuais basicas
- Modo Gemini com respostas geradas por IA usando o contexto do relatorio processado

## Estrutura do Projeto

```text
src/
  components/
    ChatbotFab.tsx
    CompanyCard.tsx
    DataTable.tsx
    Dropzone.tsx
    Footer.tsx
    Navbar.tsx
    ProcessingOverlay.tsx
    SummaryCards.tsx
  utils/
    chatbot.ts
    format.ts
    gemini.ts
    parser.ts
    reports.ts
  App.tsx
  main.tsx
  styles.css
  types.ts

PRD-IA-chatbot.md
.env.example
tailwind.config.js
vite.config.ts
```

## Requisitos

- `Node.js 20` ou superior
- `npm 10` ou superior

## Instalacao

```bash
npm install
```

## Execucao em desenvolvimento

```bash
npm run dev
```

Depois acesse:

```text
http://127.0.0.1:5173
```

## Build de producao

```bash
npm run build
npm run preview
```

## Configuracao do Gemini

Voce pode usar o chatbot em dois modos:

### 1. Modo local
Nao precisa de chave. O chatbot responde com base em regras e contexto interno da aplicacao.

### 2. Modo Gemini
Permite respostas mais naturais e interpretativas com IA generativa.

Crie um arquivo `.env.local` na raiz:

```bash
VITE_GEMINI_API_KEY=sua_chave_do_gemini
```

Ou informe a chave diretamente no painel de configuracao do chatbot. Nesse caso, a chave fica armazenada apenas na sessao atual do navegador.

## Privacidade e Seguranca

- O processamento dos PDFs acontece localmente no navegador.
- O parser e os relatorios nao dependem de upload dos arquivos para um backend proprio.
- Se o Gemini for usado, a interacao textual enviada ao modelo passa a depender da chave configurada e do endpoint externo do Google.
- Evite expor dados sensiveis em ambientes compartilhados.
- O arquivo `.env.local` deve permanecer fora do versionamento.

## Regras e Relatorios Atuais

O sistema atualmente gera, entre outros:

- saldos invertidos:
  - Ativo iniciado por `1` com saldo final credor;
  - Passivo/PL iniciado por `2` com saldo final devedor.
- contas sem movimentacao no periodo.
- comparacao entre:
  - `1.1.04.019` Distribuicao Antecipada de Lucros;
  - contas `3`, `6` e `2.4.13`, conforme a regra do sistema.
- analises de clientes:
  - saldo residual;
  - ausencia de credito;
  - cliente pessoa fisica fora da regra;
  - conciliacao com receitas.
- analises de fornecedores:
  - saldo residual;
  - ausencia de debito;
  - credito sem debito.
- validacao entre estoques e fornecedores.

## Limitacoes Conhecidas

- O parser depende de um padrao de PDF relativamente proximo ao layout esperado.
- PDFs com linhas quebradas, colunas coladas ou exportacao ruim podem gerar linhas nao classificadas.
- O chatbot nao substitui revisao tecnica contabil.
- A integracao direta do frontend com Gemini expone a chave no ambiente do navegador.

## Recomendacao para Producao

Para ambiente real, o ideal e mover a chamada do Gemini para um backend ou proxy seguro. Assim a chave da API nao fica exposta no cliente.

## Documentacao Relacionada

- [PRD-IA-chatbot.md](./PRD-IA-chatbot.md)
- `.env.example`

## Licenca

Este projeto esta licenciado sob a licenca MIT. Veja o arquivo [LICENSE](./LICENSE).
