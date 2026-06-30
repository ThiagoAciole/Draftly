# Update Rules

## Regra principal

Sempre que uma mudanca alterar como o projeto funciona, como ele e organizado ou como um agente deve trabalhar, atualize a pasta `.ai-context/`.

## Quando atualizar

| Tipo de mudanca | Arquivo a atualizar |
|---|---|
| Nova feature | `features.md`, `context-pack.md`, `current-state.md`, `changelog.md` |
| Mudanca de arquitetura | `architecture.md`, `decisions.md`, `context-pack.md`, `changelog.md` |
| Novo comando Tauri | `api-and-integrations.md`, `data-flow.md`, `context-pack.md`, `agent-instructions.md` |
| Novo tipo de arquivo | `features.md`, `domain-rules.md`, `api-and-integrations.md`, `context-pack.md` |
| Novo padrao de codigo | `code-patterns.md`, `agent-instructions.md`, `changelog.md` |
| Mudanca visual importante | `ui-patterns.md`, `features.md`, `current-state.md` |
| Nova regra de negocio | `domain-rules.md`, `features.md`, `context-pack.md` |
| Mudanca em estado ou persistencia | `state-management.md`, `data-flow.md`, `domain-rules.md` |
| Debito tecnico identificado | `current-state.md`, `decisions.md` |
| Mudanca de stack/dependencias | `tech-stack.md`, `architecture.md`, `context-pack.md` |
| Mudanca de pasta/estrutura | `folder-structure.md`, `architecture.md`, `agent-instructions.md` |

## Formato de atualizacao

Use entradas curtas, claras e datadas quando possivel. Prefira atualizar o arquivo especifico afetado em vez de reescrever toda a memoria.

## Regras praticas

- Nao documente intencoes como se fossem comportamento existente.
- Se algo nao estiver claro no codigo, escreva `Informacao nao encontrada no codigo atual`.
- Remova duplicacoes quando a memoria crescer.
- Mantenha `context-pack.md` compacto e autocontido.
- Mantenha `agent-instructions.md` operacional.
