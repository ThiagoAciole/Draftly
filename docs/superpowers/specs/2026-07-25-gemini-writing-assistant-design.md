# Assistente de escrita Gemini para o Draftly

## Objetivo

Adicionar assistência de escrita online e opcional ao Draftly usando a Gemini API. O recurso deve ajudar Thiago a corrigir texto, aceitar sugestões enquanto escreve e estruturar documentos Markdown sem transformar o produto em um chat nem modificar conteúdo sem confirmação.

## Escopo do MVP

O MVP cobre apenas arquivos Markdown e texto simples abertos pelo Draftly.

- Correções gramaticais, ortográficas, semânticas e de clareza enquanto o usuário escreve.
- Sugestão da próxima palavra ou continuação curta enquanto o usuário escreve.
- Menu flutuante de IA para texto selecionado.
- Ações de documento: formatar com IA, corrigir com IA e sugerir melhorias.
- Abertura de `.txt` no fluxo/editor Markdown, mantendo as quebras de linha originais.
- Chave Gemini configurada localmente pelo usuário.

Ficam fora do MVP: chat lateral, histórico de conversas, execução automática de alterações, busca web, anexos, uso de IA para arquivos de código e suporte a outros provedores.

## Experiência

### Assistência durante a escrita

Depois de uma breve pausa na digitação, o Draftly envia somente a frase ou o parágrafo em edição para a Gemini. O documento inteiro não é enviado para esse recurso.

- Uma correção é mostrada como sugestão discreta; o usuário a aceita com `Tab` ou clique.
- Uma sugestão de próxima palavra ou continuação curta é mostrada depois do cursor; `Tab` ou clique aceita e continuar digitando a ignora.
- Nenhuma sugestão muda o conteúdo automaticamente.
- Não há chamada enquanto o usuário está digitando continuamente, há uma seleção ativa ou já existe uma solicitação igual em andamento.

### Menu de seleção

Ao selecionar texto no editor visual Markdown, um menu flutuante deve disponibilizar:

- **Reescrever**: produz uma versão mais clara e natural da seleção.
- **Corrigir com IA**: corrige erros linguísticos preservando o sentido e a estrutura da seleção.
- **Sugerir melhorias**: mostra sugestões de conteúdo, sem alterar texto.
- **Organizar seleção**: aplica estrutura Markdown somente ao trecho selecionado.

Resultados que geram texto abrem uma prévia antes de qualquer edição. As ações disponíveis são `Substituir seleção`, `Inserir abaixo`, `Copiar` e `Descartar`. A ação de sugestões apresenta uma lista legível sem alterar o documento.

### Menu de organização do Markdown

O botão atual de organizar Markdown deixa de aplicar a transformação local diretamente e passa a abrir um dropdown com:

- **Formatar com IA**: organiza o documento em Markdown legível, com títulos, seções, listas e ênfases apenas quando o conteúdo justificar.
- **Corrigir com IA**: corrige ortografia, gramática, semântica e clareza, sem reorganizar a estrutura do documento.
- **Sugerir melhorias**: oferece recomendações de conteúdo a incluir, remover, esclarecer ou reordenar, sem editar o arquivo.

As duas primeiras ações usam uma prévia de documento completo com `Substituir documento`, `Copiar` e `Descartar`.

### Contrato de conteúdo

Todos os prompts devem instruir o modelo a:

1. Preservar informações relevantes, nomes, datas e intenção do autor.
2. Não inventar fatos, fontes, compromissos ou conclusões.
3. Retornar Markdown puro quando a operação produz conteúdo.
4. Retornar somente sugestões acionáveis quando a operação é `Sugerir melhorias`.
5. Manter blocos de código, links, imagens e frontmatter intactos, salvo se fizerem parte da seleção explicitamente reescrita.

## TXT

`.txt` continua sendo um formato suportado para abrir e salvar, mas deixa de ter editor próprio e deixa de ser oferecido como novo documento.

- Abrir `.txt` mostra o conteúdo no editor Markdown, preservando todas as quebras de linha.
- Nenhuma conversão estrutural acontece automaticamente.
- `Salvar` em `.txt` grava o conteúdo atual como texto; `Salvar como` permite `.md` quando o usuário quiser converter o arquivo.
- A opção Texto sai de `NewDocumentDropdown` e `PlainTextEditor` deixa de ser necessário.

## Arquitetura

```text
Editor visual / seleção / documento
        ↓
Camada de orquestração de IA no frontend
        ↓
Comando Tauri (validação, timeout e segredo)
        ↓
Gemini API
        ↓
Resultado tipado
        ↓
Sugestão inline, menu flutuante ou prévia
```

### Responsabilidades

- Um serviço de IA centraliza tipos de ação, construção de prompts, deduplicação, timeout, parse e validação da resposta.
- O backend Tauri faz a chamada HTTP para a Gemini. A chave nunca é enviada ao React nem persistida no `settings.json`.
- A chave fica no cofre de credenciais do Windows. Configurações comuns mantêm apenas o estado de ativação e a escolha do modelo.
- Um contexto de IA expõe estado de disponibilidade, solicitação em andamento, erro e ações de alto nível aos componentes.
- Componentes de editor cuidam de seleção, ancoragem do menu, aceitação com `Tab` e aplicação explícita do resultado.

O modelo padrão será configurável. O primeiro alvo é um modelo Flash-Lite disponível no plano Gemini Free, pois estas tarefas são curtas e orientadas a texto. A disponibilidade e limites do plano são verificados pela conta no Google AI Studio.

## Erros e privacidade

- Sem chave: mostrar orientação para configurar a Gemini, sem bloquear o editor.
- Sem rede, limite atingido, chave inválida ou timeout: mostrar erro curto e manter o texto intacto.
- Resposta fora do formato esperado: descartar a resposta e informar que a sugestão não pôde ser gerada.
- O usuário só envia conteúdo à Gemini ao usar uma ação de IA ou ao habilitar as sugestões durante a escrita.

## Mudanças de produto existentes

- Substituir a ação direta atual `formatMarkdownDocument` do botão de título pelo dropdown de IA.
- Manter o formatador local de código (`Ctrl+Shift+I`) inalterado para JSON, JavaScript, TypeScript e HTML.
- Remover o editor próprio de texto simples e a opção de criar documento TXT.
- Continuar aceitando `.txt` no seletor de abertura e salvamento.

## Validação

- Testar prompts, normalização e validação dos resultados por tipo de ação.
- Testar que `Tab` e clique aplicam sugestões e que digitar/pressionar Esc as descarta.
- Testar debounce, deduplicação e cancelamento de solicitação obsoleta.
- Testar prévia, substituir, inserir, copiar e descartar sem alterações implícitas.
- Testar abertura de `.txt` preservando quebras de linha e a ausência de `Novo texto`.
- Testar estados de chave ausente, falha de rede, limite e resposta inválida.
- Rodar `cmd /c npm test` e `cmd /c npm exec tsc -- --noEmit` antes da entrega da implementação.
