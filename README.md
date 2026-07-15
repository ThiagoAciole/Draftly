# Draftly

Editor Markdown desktop, local-first e minimalista.

Escreva no modo visual ou edite o Markdown fonte, sem depender de conta, nuvem ou conexão.

## Recursos

- Edição visual e Markdown fonte
- Abas, arquivos recentes e salvamento local
- Busca, estrutura do documento e exportação para PDF
- Suporte a Markdown, texto simples, JSON, JavaScript, TypeScript, Python e HTML
- Interface escura, responsiva e focada na escrita

## Tecnologias

React, TypeScript, Vite, Tauri v2 e BlockNote.

## Desenvolvimento

Pré-requisitos: Node.js 20+ e Rust estável.

```bash
npm install
npm run tauri:dev
```

## Build

```bash
npm run tauri:build
```

## Downloads

As versões publicadas no GitHub incluem:

- `Draftly.exe` — executável portátil para Windows
- `*-setup.exe` — instalador Windows (NSIS)
- `*.deb` — pacote para Debian e Ubuntu

Para publicar a próxima versão patch, deixe o Git limpo e execute:

```bash
npm run release:patch
```

O comando incrementa e sincroniza as versões npm, Tauri e Cargo, executa as validações, cria o commit e a tag e envia tudo ao GitHub. A tag dispara o GitHub Actions, que cria a Release e anexa os três arquivos automaticamente.

Para uma versão minor ou major, use `npm run release:minor` ou `npm run release:major`.

## Licença

Uso pessoal e experimental.
