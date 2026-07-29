# Remoção das funcionalidades de IA

## Objetivo

Remover completamente a assistência Gemini/IA do Draftly, mantendo intactos o editor Markdown, abas, configurações não relacionadas e demais operações locais.

## Escopo

- Remover menus de IA do `TitleBar` e do editor.
- Remover a aba Gemini do `SettingsModal` e o estado persistido `settings.ai`.
- Remover componentes, cliente, prompts, parser de resposta, diff e respectivos testes de IA.
- Remover o comando Tauri `run_gemini_action` e dependências Rust exclusivas.
- Remover estilos CSS exclusivos da IA e dependências/configurações de ambiente exclusivas.
- Atualizar documentação ou arquivos de configuração que ainda descrevam a IA.

## Fora de escopo

- Alterar o comportamento do editor Markdown.
- Remover ferramentas locais de formatação, busca, exportação ou histórico.
- Refatorar contextos não relacionados à remoção.

## Critérios de aceite

1. Nenhuma referência funcional a IA, Gemini, prompts ou `run_gemini_action` permanece no código ativo.
2. O projeto compila com `npm run build`.
3. A suíte existente passa com `npm test -- --run`.
4. O backend Rust continua compilável sem o cliente HTTP/Gemini.
