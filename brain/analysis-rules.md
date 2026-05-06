# Analysis Rules

## Novas análises adicionadas na branch `testes`

Cada análise possui relatório próprio.

## Titulos adotados

- Análise 1: `Clientes com Saldo Atual Baixo`
- Análise 2: `Cliente Pessoa Física Fora da Regra`
- Análise 3: `Conciliação Clientes x Receitas Operacionais`
- Análise 4: `Clientes com Saldo Residual`
- Análise 5: `Clientes sem Crédito no Período`
- Análise 6: `Fornecedores sem Débito no Período`
- Análise 7: `Validação Estoques x Fornecedores`
- Análise 8: `Fornecedores com Saldo Residual`
- Análise 9: `Fornecedores com Crédito sem Débito`

## Análise 1

- alvo: conta `1.1.02`
- alerta quando `S. Atual` termina em `D` e tem valor menor que `10`

## Análise 2

- alvo: `Nome da conta = Cliente Pessoa Física`
- filtro adicional: `Cod. R. = 142`
- `S. Anterior` deve ser `0`
- `S. Atual` deve ser `0`
- `Débito` e `Crédito` podem ter valor, mas devem ser iguais

## Análise 3

- compara `Débito` da conta `1.1.02`
- com a soma dos `Créditos`:
  - `Cod. R. 2652` - vendas de mercadorias
  - `Cod. R. 2700` - prestação de serviços
- alerta quando os valores diferem
- o relatório deve exibir o cálculo
- no cálculo, os rótulos devem trazer conta e nome quando existir
  - exemplo: `Débito de 1.1.02 (CLIENTES)`

## Análise 4

- alvo: conta `1.1.02` e subitens
- alerta somente quando `S. Atual`:
  - termina em `D`
  - é maior que `0`
  - é menor ou igual a `10`

## Análise 5

- alvo: conta `1.1.02` e subitens
- entra no relatório quando:
  - `S. Anterior > 0`
  - `Débito > 0`
  - `Crédito = 0`

## Análise 6

- alvo: conta `2.1.03` e subitens
- notifica quando:
  - `S. Anterior > 0`
  - `Crédito > 0`
  - `S. Atual > 0`
  - `Débito = 0`

## Análise 7

- compara `Débito` da conta `1.1.08`
- com `Crédito` da conta `2.1.03`
- alerta quando o débito de estoques for maior

## Análise 8

- alvo: conta `2.1.03` e subitens
- alerta somente quando `S. Atual`:
  - termina em `C`
  - é maior que `0`
  - é menor ou igual a `10`

## Análise 9

- alvo: conta `2.1.03` e subitens
- entra no relatório quando:
  - `S. Anterior > 0`
  - `Crédito > 0`
  - `Débito = 0`

## Padrão de colunas

Todos os relatórios tabulares dessas análises devem usar:

`Natureza | Conta Contábil | Cod. R. | Nome da conta | S. Anterior | Débito | Crédito | S. Atual`

## Observação de parsing

- No arquivo `PLANOS HOTEIS E TURISMO LTDA.pdf`, o `Cod. R.` pode vir visualmente separado no PDF, mas muito próximo da conta contábil.
- O parser precisou passar a considerar a largura real dos blocos de texto para evitar colar `Conta Contábil` e `Cod. R.` na mesma string.
- Essa correção foi importante para reconhecer corretamente a linha `Cliente Pessoa Física` com `Cod. R. 142`.

## Regra atual - fallback de Distribuição x Resultado

- usada quando a conta `1.1.04.019` não existir ou estiver zerada
- soma atual:
  - `Conta 3 + Conta 6`
- valor comparado:
  - `2.4.13`
- diferença atual:
  - `abs(baseValue) - abs(targetValue)`
- status de atenção:
  - quando `abs(baseValue) < abs(targetValue)`
- nos rótulos e na fórmula exibida ao usuário, mostrar conta e nome entre parênteses
  - exemplo: `Conta 3 (RESULTADO DO PERÍODO)`

## Textos explicativos nas abas

- Cada aba deve explicar de forma simples quais regras estão sendo aplicadas.
- A descrição deve priorizar linguagem direta, mencionando:
  - conta ou família de contas analisada
  - condição que faz a linha aparecer no relatório
  - comparação usada, quando houver cálculo entre contas
- Na aba `Distribuição x Resultado`, a descrição deve ficar separada em blocos:
  - `Caso 1`
  - `Resumo` do caso 1
  - `Caso 2`
  - `Resumo` do caso 2
- O texto dessa aba deve usar quebras de linha reais entre esses blocos, para melhorar a leitura na interface.

### Comportamento esperado

- resultado positivo:
  - a soma dos resultados está acima do valor comparado
- resultado negativo:
  - a soma dos resultados está abaixo do valor comparado
- resultado zero:
  - os valores são equivalentes

### Motivação

Essa mudança foi motivada principalmente pelo caso de `PDV COMERCIO`, em que a subtração algébrica atual produz um número que não representa a diferença prática esperada pelo usuário.
