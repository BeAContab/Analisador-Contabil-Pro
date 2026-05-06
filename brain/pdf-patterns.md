# PDF Patterns

## Amostra Já Analisada

Foram analisados os 5 menores PDFs da pasta `arquivos_de_exemplo`:

1. `RIBEIRO VILLAR IMOBILIARIA LTDA.pdf`
2. `LAHAINA VILLAS LTDA.pdf`
3. `W HOUSE POUSADA LTDA - ME.pdf`
4. `CARNEIRO DE MELO HOTEIS LTDA.pdf`
5. `RC BARES E RESTAURANTES LTDA.pdf`

Posteriormente tambem foi inspecionado:

- `PLANOS HOTEIS E TURISMO LTDA.pdf`

## Padrão Estrutural Repetido

Os arquivos seguem majoritariamente o mesmo layout:

- cabeçalho com empresa, CNPJ e endereço
- linha `Referência`
- título `BALANCETE ANALÍTICO`
- tabela com:
  - `Conta Contábil`
  - `Cod. R.`
  - `Nome da Conta`
  - `S. Anterior`
  - `Débito`
  - `Crédito`
  - `S. Atual`

## Comportamentos Relevantes do Layout

- Há linhas em que os valores monetários aparecem colados, sem separadores claros entre colunas.
- Há nomes de conta colados ao primeiro valor monetário.
- Algumas contas analíticas são muito longas e embutem código, conta e nome na mesma linha.
- Em alguns casos, `Conta Contábil` e `Cod. R.` ficam em blocos distintos no PDF, mas visualmente muito próximos, o que pode fazer a reconstrução da linha colar os dois campos se a largura real do texto não for respeitada.
- Os PDFs usam valores com natureza `D` e `C`.
- Também aparecem valores negativos com parênteses.
- O parser atual lida bem com quebra de linha e continuação de texto.

## Caso adicional: PLANOS HOTEIS E TURISMO LTDA

- O PDF possui a linha `Cliente Pessoa Física` com `Cod. R. 142`.
- O problema observado não era ausência do dado no PDF, e sim reconstrução incorreta da linha pelo parser.
- A leitura correta da linha ficou:
  - `1.1.02.001.00000001 142 Cliente Pessoa Física 1.179,34D 5.704.360,97 5.705.540,31 0,00D`
- Na comparação `Distribuição x Resultado`, este arquivo entra em `fallback` porque a conta `1.1.04.019` existe, mas o valor lido é `0,00D`.

## Modo da comparação nos exemplos

PDFs que não entram no fallback (`mode = distribution`):

- `W HOUSE POUSADA LTDA - ME.pdf`
- `E B MAIA FAB PROD E LTDA.pdf`
- `TRANSFORTECH ENGENHARIA LTDA.pdf`

PDFs observados com `fallback` por distribuição zerada ou ausente:

- `PLANOS HOTEIS E TURISMO LTDA.pdf`
- `CARNEIRO DE MELO HOTEIS LTDA.pdf`
- `RC BARES E RESTAURANTES LTDA.pdf`
- `RIBEIRO VILLAR IMOBILIARIA LTDA.pdf`
- `ARTE PRODUCOES DE EVENTOS ARTISTICOS E LOCACOES LTDA.pdf`
- `FESTIVAL GASTRONOMICO DE FORTALEZA SPE LTDA.pdf`
- `MULTI ENTRETENIMENTO PRODUCOES, SHOWS E EVENTOS LTDA.pdf`
- `PDV COMERCIO.pdf`
- `LAHAINA VILLAS LTDA.pdf`
- `J M J INDUSTRIA DE ALIMENTOS LTDA.pdf`
- `JSM RE TORRES INDUSTRIA E COMERCIO DE ALIMENTOS LTDA.pdf`

## Leitura da Amostra

### RIBEIRO VILLAR IMOBILIARIA LTDA

- `109` linhas contábeis identificadas
- `0` linhas não classificadas na verificação
- `7` saldos invertidos
- `11` contas sem movimentação
- contas da comparação presentes

### LAHAINA VILLAS LTDA

- `407` linhas contábeis identificadas
- `0` linhas não classificadas na verificação
- `7` saldos invertidos
- `1` conta sem movimentação
- conta `6` não encontrada na verificação
- bom arquivo para testar cenários de atenção ou fallback

### W HOUSE POUSADA LTDA - ME

- `494` linhas contábeis identificadas
- `0` linhas não classificadas na verificação
- `12` saldos invertidos
- `76` contas sem movimentação
- contas da comparação presentes

### CARNEIRO DE MELO HOTEIS LTDA

- `521` linhas contábeis identificadas
- `0` linhas não classificadas na verificação
- `5` saldos invertidos
- `15` contas sem movimentação
- contas da comparação presentes

### RC BARES E RESTAURANTES LTDA

- `1101` linhas contábeis identificadas
- `0` linhas não classificadas na verificação
- `5` saldos invertidos
- `20` contas sem movimentação
- contas da comparação presentes

## Conclusões

- O parser atual está bem aderente ao layout predominante da pasta de exemplos.
- A maior fonte de risco não parece ser ausência de estrutura, e sim pequenas variações de espaçamento e concatenação de colunas.
- `LAHAINA VILLAS LTDA.pdf` merece atenção especial em testes por não apresentar o mesmo conjunto de contas da comparação observado nos demais arquivos.
- `W HOUSE POUSADA LTDA - ME.pdf` é bom arquivo de referência para explicar a regra sem fallback.
- `PLANOS HOTEIS E TURISMO LTDA.pdf` é bom arquivo de referência para explicar o fallback por distribuição zerada.
