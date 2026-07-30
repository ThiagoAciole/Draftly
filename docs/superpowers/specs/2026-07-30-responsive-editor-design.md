# Responsividade do editor Draftly

## Objetivo

Melhorar o comportamento visual do editor durante o redimensionamento da janela, principalmente entre 760px e 1000px, sem alterar o fluxo de edição, arquivos ou estado da aplicação.

## Decisão

A toolbar será composta com Flexbox, permitindo que a área de formatação encolha e role horizontalmente enquanto o seletor de modo permanece acessível. O canvas terá espaçamentos progressivos por breakpoint e os controles laterais serão removidos quando não houver espaço confortável.

## Escopo

- Alterar `src/styles/editor.css`.
- Ajustar `src/styles/titlebar.css` somente se a titlebar apresentar colisão no breakpoint intermediário.
- Manter os breakpoints existentes de 760px, 500px e 360px, adicionando uma faixa intermediária quando necessário.
- Não modificar React, contextos, Rust, persistência ou operações de arquivo.

## Critérios de aceite

- Toolbar sem sobreposição entre 760px e 1000px.
- Seletor visual/Markdown sempre acessível.
- Toolbar rolável abaixo de 760px.
- Canvas e texto sem corte horizontal.
- Outline e resizers ocultos quando a largura não comportar seu uso.
- `npx tsc --noEmit` passa.
