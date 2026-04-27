# Analisador de Balancetes em PDF

Aplicativo web em React + TypeScript para analisar balancetes contábeis em PDF diretamente no navegador. O app não envia os PDFs para servidor externo: a leitura, o parsing e a geração de relatórios acontecem no cliente.

## Funcionalidades

- Upload de um ou mais PDFs.
- Identificação automática de empresa, CNPJ e período de referência.
- Extração de linhas contábeis com `Conta Contábil`, `Nome da Conta`, `S. Anterior`, `Débito`, `Crédito`, `S. Atual` e `Cod. R.` quando disponível.
- Relatório de saldos invertidos:
  - Ativo iniciado por `1` com `S. Atual` terminado em `C`.
  - Passivo/PL iniciado por `2` com `S. Atual` terminado em `D`.
- Relatório de contas com `Débito` e `Crédito` iguais a zero.
- Resultados separados por empresa/arquivo.
- Pesquisa, ordenação e rolagem horizontal nas tabelas.
- Download de cada relatório em XLSX e PDF.

## Requisitos

- Node.js 20 ou superior.
- npm 10 ou superior.

## Instalação

```bash
npm install
```

## Execução em desenvolvimento

```bash
npm run dev
```

Depois acesse:

```text
http://127.0.0.1:5173
```

## Build de produção

```bash
npm run build
npm run preview
```

## Estrutura

```text
src/
  components/
    CompanyCard.tsx
    DataTable.tsx
  utils/
    format.ts
    parser.ts
    reports.ts
  App.tsx
  main.tsx
  styles.css
  types.ts
```

## Observações de parsing

O parser foi desenhado para PDFs de balancete analítico com estrutura semelhante ao modelo enviado. Ele tenta lidar com:

- `Cod. R.` no final da linha ou logo após a conta contábil.
- Valores brasileiros como `1.234,56D`, `1.234,56C`, `(1.234,56)D` e `0,00`.
- Nomes de contas colados ao primeiro valor monetário.
- Linhas longas quebradas pelo PDF.

Linhas que começam com conta contábil, mas não podem ser interpretadas com segurança, são exibidas em uma seção de depuração dentro do card da empresa.
