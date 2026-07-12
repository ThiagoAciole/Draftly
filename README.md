# Draftly

Editor Markdown desktop, local-first e minimalista.

Escreva no modo visual ou edite o Markdown fonte, sem depender de conta, nuvem ou conexão.

## Recursos

- Edição visual e Markdown fonte
- Abas, arquivos recentes e salvamento local
- Busca, estrutura do documento e exportação para PDF
- Suporte exclusivo a arquivos `.md`
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

Para publicar uma versão, atualize a versão do projeto e envie uma tag:

```bash
git tag v0.1.0
git push origin v0.1.0
```

O GitHub Actions cria a Release e anexa os três arquivos automaticamente.

## Licença

Uso pessoal e experimental.
