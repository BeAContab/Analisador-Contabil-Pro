# Changelog

## 1.0.2 - 2026-05-20
- Refatoração da exportação de relatórios para imports dinâmicos de `xlsx`, `jspdf` e `jspdf-autotable`.
- Ajuste de chunking no `vite.config.ts`, removendo agrupamento artificial de `reports`.
- Build validado sem warning de chunk acima de 500 kB.

## 1.0.1 - 2026-05-20
- Refatoração do fluxo de upload/processamento para hook dedicado `useFileProcessing`.
- Simplificação do `App.tsx` com separação de responsabilidades.
- Correção de textos de interface com acentuação no `App.tsx`.
- Lazy loading para `PrivacyPolicy`, `DataSecurity`, `LocalProcessingDoc` e `ChatbotFab`.
- Otimização de build no Vite com `manualChunks` para `react`, `pdf` e `reports`.
