# PRD - IA do Chatbot do Analisador Contabil Pro

## 1. Visao Geral

### 1.1 Nome do Produto
IA do Chatbot do Analisador Contabil Pro

### 1.2 Objetivo
Criar um chatbot com inteligencia artificial especializado em interpretar os resultados gerados pelo Analisador Contabil Pro, explicar alertas contabeis em linguagem clara, orientar a conferencia manual do usuario e apoiar a leitura de balancetes contabeis processados pelo sistema.

### 1.3 Problema
Hoje o sistema identifica inconsistencias e gera relatorios, mas o usuario ainda precisa interpretar sozinho o significado pratico de cada alerta. Isso gera duvidas como:

- o que exatamente esse alerta quer dizer;
- se a ocorrencia e grave ou apenas um ponto de conferencia;
- qual conta originou o problema;
- qual verificacao deve ser feita em seguida;
- se o resultado pode ter sido afetado por limitacao de leitura do PDF.

### 1.4 Proposta de Valor
O chatbot deve transformar resultados tecnicos do analisador em orientacao util, confiavel e contextualizada, funcionando como um assistente contabilidade-operacional dentro do produto.

## 2. Objetivos do Produto

### 2.1 Objetivos Principais
- Explicar os alertas gerados pelo sistema em linguagem simples e tecnica.
- Responder perguntas do usuario sobre contas, regras e resultados do balancete analisado.
- Priorizar inconsistencias por gravidade e impacto provavel.
- Sugerir proximos passos de conferencia manual.
- Reduzir o tempo de interpretacao dos relatorios.

### 2.2 Objetivos Secundarios
- Aumentar a confianca do usuario no sistema.
- Reduzir a necessidade de suporte humano para duvidas recorrentes.
- Servir como camada educacional sobre contabilidade aplicada ao balancete.

### 2.3 Nao Objetivos
- Nao substituir o julgamento tecnico de um contador.
- Nao emitir parecer fiscal, juridico ou regulatorio definitivo.
- Nao classificar automaticamente lancamentos contabeis sem base suficiente.
- Nao inventar dados ausentes no PDF ou no relatorio processado.

## 3. Contexto Atual do Projeto

O sistema atual:

- recebe balancetes em PDF;
- processa os arquivos localmente no navegador;
- identifica empresa, CNPJ e periodo;
- extrai linhas contabeis com conta, nome, saldos e movimentacoes;
- gera relatorios de inconsistencias e analises especificas;
- exporta resultados em XLSX e PDF.

O chatbot deve ser desenhado para trabalhar sobre esse contexto ja existente, sem assumir um ERP, banco de dados contabil externo ou motor de contabilizacao proprio.

## 4. Usuarios-Alvo

### 4.1 Usuarios Primarios
- Contadores
- Analistas contabeis
- Auxiliares contabeis
- Auditores internos

### 4.2 Usuarios Secundarios
- Gestores financeiros
- Empresarios que acompanham indicadores contabeis

### 4.3 Nivel de Especializacao Esperado
O chatbot deve responder bem tanto para usuarios tecnicos quanto para usuarios menos experientes. Ele precisa adaptar a profundidade da explicacao ao tipo de pergunta.

## 5. Principais Casos de Uso

- Explicar por que determinada conta apareceu em um alerta.
- Explicar o significado de "saldo invertido".
- Resumir os principais riscos encontrados em um balancete.
- Dizer quais alertas devem ser priorizados.
- Explicar uma regra de analise do sistema.
- Informar quando uma conta nao foi localizada ou quando houve limitacao de parsing.
- Sugerir a proxima verificacao manual para uma ocorrencia.
- Responder perguntas conceituais relacionadas ao resultado exibido.

## 6. Conhecimentos Obrigatorios da IA

### 6.1 Conhecimento do Produto
O chatbot deve conhecer:

- o funcionamento do Analisador Contabil Pro;
- o fato de que o processamento atual ocorre localmente;
- os tipos de relatorios existentes;
- as limitacoes do parser de PDF;
- o significado de linhas nao classificadas;
- a logica de exportacao e consolidacao dos resultados.

### 6.2 Conhecimento de Balancete Contabil
O chatbot deve conhecer:

- Conta Contabil;
- Nome da Conta;
- Saldo Anterior;
- Debito;
- Credito;
- Saldo Atual;
- Cod. R.;
- estrutura hierarquica do plano de contas;
- diferenca entre conta sintetica e analitica.

### 6.3 Conhecimento Contabil Brasileiro
O chatbot deve conhecer:

- Ativo, Passivo e Patrimonio Liquido;
- Receitas, Custos e Despesas;
- natureza devedora e credora;
- convencoes de saldo D e C;
- distribuicao antecipada de lucros;
- resultado do periodo;
- lucros e prejuizos acumulados;
- conciliacao contabil;
- materialidade e conferencia operacional.

### 6.4 Conhecimento das Regras do Sistema
O chatbot deve conhecer profundamente:

- saldos invertidos;
- contas sem movimentacao;
- comparacao entre Distribuicao Antecipada de Lucros e Resultado do Periodo;
- analises de clientes;
- analises de fornecedores;
- validacao entre estoques e fornecedores;
- regras baseadas em familias de contas;
- regras baseadas em Cod. R.

### 6.5 Conhecimento das Contas e Codigos Relevantes
O chatbot deve conhecer e saber explicar:

- conta 1 e grupo do Ativo;
- conta 2 e grupo do Passivo/PL;
- familia 1.1.02 de Clientes;
- familia 2.1.03 de Fornecedores;
- conta 1.1.08 de Estoques;
- conta 2.4.13 de Lucros e Prejuizos Acumulados;
- conta 1.1.04.019 de Distribuicao Antecipada de Lucros;
- contas 3 e 6 relacionadas ao resultado;
- Cod. R. 142, 2652, 2700 e 2603.

### 6.6 Conhecimento de Limitacoes de Parsing
O chatbot deve saber que:

- o PDF pode quebrar linhas;
- valores podem vir colados ao texto;
- algumas contas podem nao ser localizadas;
- a qualidade do PDF interfere na leitura;
- o sistema nao deve assumir que ausencia de leitura e erro contabil.

## 7. Requisitos Funcionais

### 7.1 Explicacao de Alertas
O chatbot deve:

- explicar qual regra foi acionada;
- informar quais contas participaram da regra;
- explicar o que a ocorrencia pode significar;
- informar se a ocorrencia parece critica, moderada ou de conferencia;
- sugerir verificacoes manuais plausiveis.

### 7.2 Resumo Executivo
O chatbot deve ser capaz de:

- resumir os principais achados do balancete;
- destacar alertas prioritarios;
- apontar possiveis riscos no fechamento ou na revisao;
- adaptar a linguagem para gestor ou contador.

### 7.3 Perguntas e Respostas Contextuais
O chatbot deve responder perguntas como:

- por que esta conta apareceu no relatorio;
- o que significa este saldo;
- essa divergencia e grave;
- qual conta devo revisar primeiro;
- esse alerta pode ser falso positivo;
- qual e a regra por tras dessa analise.

### 7.4 Explicacao de Limites
O chatbot deve:

- informar quando a conta nao foi localizada;
- informar quando a conclusao depende de inferencia;
- informar quando o PDF pode estar fora do padrao esperado;
- deixar claro quando a analise nao substitui revisao tecnica humana.

### 7.5 Sugerir Proximas Acoes
O chatbot deve ser capaz de sugerir:

- conferencia do razao da conta;
- revisao do lancamento de fechamento;
- comparacao com periodo anterior;
- validacao de reclassificacoes;
- revisao do plano de contas;
- conferencia do PDF original.

## 8. Requisitos Nao Funcionais

### 8.1 Clareza
- Respostas devem ser objetivas e compreensiveis.
- O chatbot deve evitar jargao desnecessario.
- Quando usar termo tecnico, deve conseguir explica-lo.

### 8.2 Confiabilidade
- O chatbot nao deve inventar informacao.
- O chatbot deve deixar claro quando nao souber ou quando faltar dado.
- O chatbot deve diferenciar fato, inferencia e hipotese.

### 8.3 Seguranca e Privacidade
- O chatbot nao deve expor dados sensiveis sem necessidade.
- O chatbot deve respeitar a proposta de privacidade do produto.
- Se houver uso de API externa no futuro, o fluxo deve ser transparente ao usuario.

### 8.4 Performance
- A resposta do chatbot deve ser suficientemente rapida para manter fluidez.
- O tempo de resposta deve ser compativel com uso interativo.

### 8.5 Adaptabilidade
- O chatbot deve ajustar o nivel de detalhe conforme a pergunta.
- O chatbot deve responder bem para usuarios iniciantes e tecnicos.

## 9. Comportamentos Obrigatorios da IA

- Ser especializada no contexto do produto.
- Explicar alertas com base no que o sistema realmente encontrou.
- Assumir postura de apoio e conferencia, nao de certeza absoluta.
- Priorizar utilidade pratica da resposta.
- Manter coerencia com as regras implementadas.
- Informar incertezas de forma clara.
- Nunca simular leitura de conta, saldo ou documento nao processado.

## 10. Comportamentos Proibidos

- Inventar valores, contas ou linhas.
- Garantir regularidade fiscal ou contabil.
- Afirmar erro tecnico sem base suficiente.
- Expor dados privados de forma desnecessaria.
- Ocultar limitacoes de leitura.
- Responder de forma generica sem considerar o contexto do relatorio.

## 11. Exemplos de Respostas Esperadas

### 11.1 Explicacao de Alerta
"Esta conta apareceu em saldos invertidos porque pertence ao grupo do Ativo e terminou com natureza credora no saldo atual. Isso pode indicar classificacao inadequada, lancamento invertido ou necessidade de revisao do encerramento."

### 11.2 Explicacao com Cautela
"Nao foi possivel localizar todas as contas necessarias para essa comparacao. Isso pode indicar ausencia real no balancete ou limitacao de leitura do PDF. Vale conferir o arquivo original."

### 11.3 Direcionamento Operacional
"Como proximo passo, o ideal e revisar o razao da conta, verificar se houve reclassificacao no periodo e comparar com o balancete do mes anterior."

## 12. Fluxos Principais do Chatbot

### 12.1 Fluxo de Interpretacao
1. Receber o contexto do relatorio ou da pergunta do usuario.
2. Identificar a regra ou conta envolvida.
3. Explicar o que foi detectado.
4. Indicar gravidade provavel.
5. Sugerir proxima acao manual.

### 12.2 Fluxo de Incerteza
1. Detectar falta de dado ou limitacao de leitura.
2. Sinalizar explicitamente a incerteza.
3. Evitar conclusao definitiva.
4. Recomendar validacao manual.

### 12.3 Fluxo de Resumo Executivo
1. Agrupar alertas relevantes.
2. Priorizar por impacto provavel.
3. Responder em linguagem de negocio.
4. Manter possibilidade de aprofundamento tecnico sob demanda.

## 13. Integracoes e Dependencias

### 13.1 Dependencias de Dados
O chatbot depende de:

- dados extraidos do parser;
- relatorios gerados pela aplicacao;
- metadados da empresa e periodo;
- contexto da sessao do usuario.

### 13.2 Dependencias Tecnicas Futuras
Dependendo da arquitetura escolhida depois, o chatbot pode depender de:

- modelo de linguagem;
- camada de orquestracao de prompts;
- controle de contexto das analises carregadas;
- mecanismo de protecao de dados sensiveis.

## 14. Riscos

- Respostas excessivamente genericas.
- Alucinacao do modelo ao interpretar dados contabeis.
- Excesso de confianca em resultados com parsing incompleto.
- Vazamento de informacoes sensiveis caso exista integracao externa.
- Experiencia ruim se o chatbot nao souber diferenciar perfil tecnico e nao tecnico.

## 15. Criterios de Sucesso

O chatbot sera considerado bem-sucedido quando:

- explicar corretamente os relatorios do sistema;
- reduzir duvidas recorrentes dos usuarios;
- orientar revisoes contabeis com utilidade pratica;
- manter linguagem clara e confiavel;
- respeitar os limites de seguranca e incerteza;
- demonstrar aderencia real ao dominio contabil do produto.

## 16. Criterios de Aceite

- O chatbot explica todos os relatorios atuais do sistema.
- O chatbot conhece e explica as regras implementadas.
- O chatbot informa quando faltar dado suficiente.
- O chatbot nao inventa informacoes nao presentes no contexto.
- O chatbot sugere proximas acoes operacionais para os principais alertas.
- O chatbot responde com profundidade variavel conforme a pergunta.
- O chatbot respeita privacidade e tratamento de dados sensiveis.

## 17. Roadmap Recomendado

### Fase 1 - MVP
- Explicacao dos relatorios atuais
- Resumo executivo dos achados
- Explicacao das regras
- Sugestao de proximos passos

### Fase 2 - IA Contextual
- Respostas personalizadas por empresa e periodo
- Priorizacao automatica de alertas
- Melhor adaptacao por perfil de usuario

### Fase 3 - Inteligencia Assistida
- Comparacoes entre periodos
- Identificacao de padroes recorrentes
- Suporte a analises mais complexas com contexto historico

## 18. Observacoes Finais

Este chatbot deve ser concebido como uma camada de interpretacao e apoio a decisao sobre os relatorios do Analisador Contabil Pro. Seu valor esta menos em "conversar" e mais em traduzir a logica contabil do sistema em orientacao pratica, segura e confiavel.
