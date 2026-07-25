# Roteiro de smoke test do Draftly

Use este roteiro antes de distribuir uma versão desktop. Os testes automatizados
cobrem regras e componentes; estes casos validam a integração real entre Tauri,
sistema operacional, diálogos nativos e BlockNote.

## Preparação

1. Execute `npm run tauri:dev`.
2. Crie uma pasta temporária vazia para os arquivos do teste.
3. Teste ao menos no Windows e no Linux/GTK quando houver release para ambos.

## Arquivos e abas

| Cenário | Ação | Resultado esperado |
| --- | --- | --- |
| Novo documento | Crie um arquivo, escreva e salve | Uma única janela de salvar; aba recebe o nome escolhido; status informa sucesso |
| Cancelar abertura/salvamento | Cancele o diálogo nativo | Nada é perdido, nenhum erro aparece |
| Formatos suportados | Abra `.md`, `.txt`, `.json`, `.js`, `.ts`, `.py` e `.html` | Cada arquivo abre no editor correto, com tipo exibido no status |
| Formato não suportado | Tente abrir `.pdf`, binário ou arquivo sem extensão | O Draftly recusa com mensagem clara na barra de status |
| Abas | Abra três arquivos e alterne entre eles | Conteúdo, estado de alteração e foco permanecem corretos |
| Fechamento | Edite uma aba, feche-a e teste cancelar/descartar/salvar | Não há perda silenciosa; a última aba retorna à Home |
| Arquivo externo | Altere no disco um arquivo aberto e volte ao app | O diálogo de conflito oferece manter, recarregar ou comparar conforme aplicável |
| Recentes | Abra o mesmo arquivo duas vezes e depois nove arquivos diferentes | Sem duplicatas; a lista mantém no máximo nove itens recentes |

## Editor e Markdown

| Cenário | Ação | Resultado esperado |
| --- | --- | --- |
| Seleção total | Com vários blocos, use `Ctrl+A` duas vezes e digite | Primeiro seleciona o bloco/conteúdo conforme BlockNote; segundo seleciona tudo sem blocos quebrados |
| Atalhos | Teste `Ctrl+S`, desfazer/refazer, negrito, itálico e links | Um único salvamento por atalho; conteúdo permanece válido |
| Conversão de Markdown | Cole Markdown com títulos, listas, citação, tabela, código, link e imagem | Visual e fonte representam o mesmo conteúdo sem texto perdido |
| Toolbar | Selecione texto e aplique cada botão e menu | A ação afeta seleção/bloco atual e o estado visual acompanha |
| Títulos | Abra/feche os títulos adicionais e aplique H1 a H6 | Ordem e ícones corretos; parágrafo permanece acessível |
| Componentes | Crie citação, frase de destaque, listas, divisor e bloco de código | Espaçamento, padding e side menu não sobrepõem conteúdo |
| Tabelas | Insira, redimensione, arraste linhas/colunas e adicione no canto | Grade aparece no tema; controles só surgem no hover previsto; célula continua editável |
| Links e emoji | Crie, abra e edite links; abra o seletor de emoji no bloco | URL abre no navegador e emoji é inserido no bloco correto |

## Imagens, exportação e atualização

| Cenário | Ação | Resultado esperado |
| --- | --- | --- |
| Arrastar imagem | Solte PNG, JPG, WebP, GIF, AVIF e SVG em um `.md` salvo | Arquivo é copiado para `images/` e Markdown usa caminho relativo |
| Colar imagem | Cole uma imagem da área de transferência | Mesmo resultado do arrastar, sem duplicar a inserção |
| Imagem sem salvar | Tente inserir imagem em documento sem caminho | Mensagem na barra de status pede para salvar primeiro |
| Colisão de nome | Importe duas imagens com o mesmo nome | A segunda recebe sufixo e não sobrescreve a primeira |
| Exportação | Exporte para HTML e PDF com títulos, tabela, imagem e código | Arquivo abre e preserva estrutura legível |
| Atualização | Teste sem release, versão atual e release nova | Estados claros; download abre o instalador adequado ao sistema |

## Janela, acessibilidade e regressão visual

| Cenário | Ação | Resultado esperado |
| --- | --- | --- |
| Windows | Minimizar, maximizar/restaurar, redimensionar e fechar | Controles seguem a janela nativa e confirmação de alterações funciona |
| GNOME/Linux | Execute em sessão GNOME, redimensione e maximize | Sem pontas/bordas pretas; cantos e sombra seguem o compositor |
| Layout mínimo | Reduza até o tamanho mínimo e use zoom 125%, 150% e 200% | Titlebar, toolbar e status não se sobrepõem nem cortam controles essenciais |
| Teclado | Navegue toolbar, menus, diálogos e tabela com Tab/Shift+Tab/Esc | Foco sempre visível, Esc fecha popovers e Enter ativa o controle focado |
| Erros | Force caminho sem permissão, arquivo removido e disco indisponível | Erro aparece na barra inferior, sem banner sobre a toolbar ou crash |

## Gate de entrega

Execute antes do smoke test:

```powershell
cmd /c "npm test"
cmd /c "npx tsc --noEmit"
Set-Location src-tauri
cargo test
cargo check
```

Registre sistema operacional, versão, resultado de cada linha e qualquer captura
de falha encontrada. Não há como automatizar literalmente todos os cenários de
ambiente; este roteiro separa o que precisa de validação humana dos comportamentos
que podem e devem continuar protegidos pela suíte automatizada.
