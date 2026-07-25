# Plano de implementação: âncora premium do menu lateral

> **Para agentes executores:** SUB-SKILL OBRIGATÓRIO: usar `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para implementar este plano tarefa por tarefa. As etapas usam caixas de seleção (`- [ ]`) para acompanhamento.

**Objetivo:** alinhar o menu lateral do BlockNote à primeira linha visual de blocos textuais e ao topo de blocos ricos, sem alturas fixas em CSS.

**Arquitetura:** substituir apenas o controlador de posicionamento. Um helper puro calcula um `DOMRect` de âncora a partir da geometria renderizada; um controller local usa esse retângulo como referência virtual do Floating UI e preserva os botões, estados e ações já existentes de `CustomSideMenu`. O CSS passa a cuidar somente de aparência.

**Stack:** React 19, TypeScript, BlockNote 0.51.4, `@floating-ui/react` 0.27.19, Vitest 3 e jsdom.

## Restrições globais

- Não alterar o modelo de documentos, atalhos, slash menu nem comandos Tauri.
- Não importar módulos internos não exportados do BlockNote; usar somente `@blocknote/core`, `@blocknote/core/extensions` e `@blocknote/react`.
- Declarar `@floating-ui/react` como dependência direta antes de importá-la no código da aplicação.
- A âncora de texto deve usar o primeiro `ClientRect` renderizado; nunca `font-size`, `line-height` ou uma tabela de alturas.
- Para bloco vazio, sem retângulos de texto ou bloco rico, usar a caixa do bloco como fallback seguro.
- O menu deve ocultar-se no scroll, como o `SideMenuController` atual, exceto quando estiver congelado pelo menu de arraste aberto.
- Não criar commit automaticamente neste checkout compartilhado.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
| --- | --- |
| `src/components/editor/sideMenuAnchor.ts` | Encontrar o elemento do bloco e calcular seu retângulo de âncora, sem React. |
| `src/components/editor/sideMenuAnchor.test.ts` | Cobrir a seleção da primeira linha e todos os fallbacks de geometria. |
| `src/components/editor/PremiumSideMenuController.tsx` | Conectar estado do `SideMenuExtension`, referência virtual do Floating UI, portal e ocultação no scroll. |
| `src/components/editor/CustomSideMenu.tsx` | Reutilizar o menu existente, mas renderizá-lo pelo novo controller. |
| `src/styles/globals.css` | Remover apenas as alturas fixas de `.bn-side-menu`; preservar estilo visual. |
| `package.json` / `package-lock.json` | Declarar o Floating UI usado diretamente pelo novo controller. |

### Tarefa 1: contrato de geometria da âncora

**Arquivos:**

- Criar: `src/components/editor/sideMenuAnchor.ts`
- Criar: `src/components/editor/sideMenuAnchor.test.ts`

**Consome:** um elemento `.bn-block` identificado por `data-id` e seu `.bn-block-content`.

**Produz:**

```ts
export function getBlockElement(blockId: string, root: ParentNode): HTMLElement | null;
export function getSideMenuAnchorRect(blockElement: HTMLElement): DOMRect;
```

- [ ] **Etapa 1: escrever os testes que falham**

```ts
// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { getBlockElement, getSideMenuAnchorRect } from "./sideMenuAnchor";

describe("getSideMenuAnchorRect", () => {
  it("usa a primeira linha renderizada de um bloco textual", () => {
    const block = document.createElement("div");
    block.className = "bn-block";
    block.innerHTML = '<div class="bn-block-content"><div class="bn-inline-content">linha um<br>linha dois</div></div>';
    const inline = block.querySelector(".bn-inline-content")!;
    vi.spyOn(inline, "getClientRects").mockReturnValue([
      new DOMRect(100, 40, 500, 30),
      new DOMRect(100, 70, 500, 30),
    ] as DOMRectList);

    expect(getSideMenuAnchorRect(block)).toEqual(new DOMRect(100, 40, 500, 30));
  });

  it("usa a caixa do conteúdo quando não há linha de texto", () => {
    const block = document.createElement("div");
    block.innerHTML = '<div class="bn-block-content"></div>';
    const content = block.firstElementChild!;
    vi.spyOn(content, "getBoundingClientRect").mockReturnValue(new DOMRect(20, 30, 600, 44));

    expect(getSideMenuAnchorRect(block)).toEqual(new DOMRect(20, 30, 600, 44));
  });

  it("localiza somente o bloco solicitado", () => {
    const root = document.createElement("div");
    root.innerHTML = '<div class="bn-block" data-id="a"></div><div class="bn-block" data-id="b"></div>';

    expect(getBlockElement("b", root)?.dataset.id).toBe("b");
    expect(getBlockElement("inexistente", root)).toBeNull();
  });
});
```

- [ ] **Etapa 2: executar e confirmar a falha**

Executar: `cmd /c npm test -- src/components/editor/sideMenuAnchor.test.ts`

Esperado: falha por não encontrar `./sideMenuAnchor`.

- [ ] **Etapa 3: implementar o helper mínimo**

```ts
export function getBlockElement(blockId: string, root: ParentNode) {
  return root.querySelector<HTMLElement>(`.bn-block[data-id="${CSS.escape(blockId)}"]`);
}

export function getSideMenuAnchorRect(blockElement: HTMLElement) {
  const content = blockElement.querySelector<HTMLElement>(".bn-block-content");
  if (!content) return blockElement.getBoundingClientRect();

  const inlineContent = content.querySelector<HTMLElement>(".bn-inline-content");
  const firstLine = inlineContent?.getClientRects().item(0);
  return firstLine ?? content.getBoundingClientRect();
}
```

Se `CSS.escape` não estiver disponível no WebView alvo, trocar somente a busca por uma iteração em `root.querySelectorAll<HTMLElement>(".bn-block[data-id]")` que compare `dataset.id === blockId`; não interpolar o id sem escape.

- [ ] **Etapa 4: executar e confirmar que passa**

Executar: `cmd /c npm test -- src/components/editor/sideMenuAnchor.test.ts`

Esperado: 3 testes aprovados.

### Tarefa 2: controlador com referência virtual e fallback nativo

**Arquivos:**

- Criar: `src/components/editor/PremiumSideMenuController.tsx`
- Modificar: `package.json`
- Modificar: `package-lock.json`

**Consome:** `SideMenuExtension`, `getBlockElement`, `getSideMenuAnchorRect` e um componente `SideMenuProps`.

**Produz:**

```ts
export function PremiumSideMenuController(props: {
  sideMenu: React.FC<SideMenuProps>;
}): React.JSX.Element | null;
```

- [ ] **Etapa 1: declarar a dependência direta**

Executar: `cmd /c npm install @floating-ui/react@0.27.19`

Esperado: `package.json` passa a listar `"@floating-ui/react": "^0.27.19"` e somente o lockfile correspondente é atualizado.

- [ ] **Etapa 2: criar o controller sem duplicar ações do menu**

Implementar o controller com `useExtensionState(SideMenuExtension, ...)` para ler apenas `{ show, block }`; não copiar `DeleteBlockButton`, `AddBlockButton` nem `DragHandleButton`.

```ts
const { refs, floatingStyles, context } = useFloating({
  open: Boolean(show && block),
  placement: "left",
  whileElementsMounted: (reference, floating, update) =>
    autoUpdate(reference, floating, () => {
      editor.getExtension(SideMenuExtension)?.hideMenuIfNotFrozen();
      update();
    }, { ancestorScroll: true, ancestorResize: true, elementResize: true, layoutShift: true }),
});
```

Antes de renderizar, localizar `block.id` a partir de `editor.domElement` (ou do `editor.prosemirrorView.dom`) e definir a referência virtual:

```ts
refs.setPositionReference({
  contextElement: blockElement,
  getBoundingClientRect: () => getSideMenuAnchorRect(blockElement),
});
```

Renderizar `props.sideMenu` dentro de `FloatingPortal` cujo `root` seja `editor.portalElement`; aplicar `floatingStyles` ao wrapper e `zIndex: 20`. Usar `useDismiss(context, { enabled: false })` e `useInteractions` para preservar a interação sem roubar foco do editor.

- [ ] **Etapa 3: acrescentar observação do conteúdo ativo**

Instalar um `ResizeObserver` no `.bn-block-content` ativo e um `MutationObserver` com `{ childList: true, subtree: true, characterData: true }`. Ambos devem chamar `refs.update()` via um único `requestAnimationFrame` pendente. Desconectar os dois observers e cancelar o frame no cleanup.

O observer garante reposicionamento depois de quebra de linha, troca de fonte, mudança de zoom, inserção/remover texto e redimensionamento de janela, sem mutar o documento.

- [ ] **Etapa 4: validar compilação**

Executar: `cmd /c npm exec tsc -- --noEmit`

Esperado: saída sem erros de TypeScript.

### Tarefa 3: trocar o controller e remover a causa do desalinhamento

**Arquivos:**

- Modificar: `src/components/editor/CustomSideMenu.tsx:1-81`
- Modificar: `src/styles/globals.css:389-438`

**Consome:** `PremiumSideMenuController` da tarefa 2.

**Produz:** o mesmo conjunto de três ações atuais — deletar, adicionar e arrastar — posicionado pelo controller premium.

- [ ] **Etapa 1: trocar apenas o ponto de montagem**

Em `CustomSideMenu.tsx`, remover o import de `SideMenuController`, importar `PremiumSideMenuController` e substituir a implementação final por:

```tsx
export function CustomSideMenuController() {
  return <PremiumSideMenuController sideMenu={CustomSideMenu} />;
}
```

Não alterar `CustomSideMenu`, `DeleteBlockButton` ou `CustomDragHandleMenu`.

- [ ] **Etapa 2: apagar as alturas artificiais**

Em `globals.css`, remover somente estes seletores e seus `height`:

```css
.bn-side-menu:not([data-block-type]) { height: 30px !important; }
.bn-side-menu[data-block-type="paragraph"] { height: 30px !important; }
.bn-side-menu[data-block-type="heading"][data-level="1"] { height: 39px !important; }
.bn-side-menu[data-block-type="heading"][data-level="2"] { height: 29px !important; }
.bn-side-menu[data-block-type="heading"][data-level="3"] { height: 23px !important; }
```

Manter `gap`, `margin-right`, `background-color` e `overflow`; eles são aparência, não geometria.

- [ ] **Etapa 3: validar regressão estática**

Executar: `cmd /c npm test`

Esperado: todos os testes existentes e os novos testes de âncora aprovados.

Executar: `cmd /c npm exec tsc -- --noEmit`

Esperado: saída sem erros.

### Tarefa 4: validação visual e de interação no Tauri

**Arquivos:**

- Não criar arquivos de produto.

- [ ] **Etapa 1: abrir o app de desenvolvimento**

Executar: `cmd /c npm run tauri:dev`

- [ ] **Etapa 2: validar a matriz de geometria**

Confirmar com o menu visível que os três ícones permanecem centralizados na primeira linha para:

- parágrafo vazio;
- parágrafo de uma linha;
- parágrafo de cinco linhas por quebra automática;
- `h1`, `h2` e `h3`;
- item de lista e checklist;
- zoom do sistema em 100%, 125% e 150%.

Confirmar que o menu ancora ao topo do conteúdo em bloco de código, imagem e tabela, sem cobrir controles internos.

- [ ] **Etapa 3: validar atualizações dinâmicas**

Com o menu visível sobre um parágrafo, digitar até ocorrer quebra de linha; alterar o tamanho da janela; rolar o editor; abrir e fechar o menu do handle. Esperado: o menu acompanha a primeira linha sem tremular, esconde no scroll e continua clicável depois de abrir o menu de arraste.

- [ ] **Etapa 4: registrar evidência de revisão**

Anexar na descrição da mudança uma captura de parágrafo multilinha e uma de `h1`, além das saídas de `npm test` e `tsc --noEmit`. Não criar commit, push ou PR sem solicitação explícita.

## Revisão do plano

- Cobertura: as tarefas removem a fonte do bug (alturas artificiais), definem a âncora real, preservam o menu existente e validam geometria, acessibilidade de clique e scroll.
- Sem placeholders: cada arquivo, interface, fallback e comando de validação está especificado.
- Consistência: `getSideMenuAnchorRect` é criado na tarefa 1, consumido na tarefa 2 e substitui os seletores de altura na tarefa 3.
