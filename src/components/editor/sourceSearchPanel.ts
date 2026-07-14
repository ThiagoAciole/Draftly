import type { Panel, ViewUpdate } from "@codemirror/view";
import { EditorView } from "@codemirror/view";
import {
  SearchQuery,
  closeSearchPanel,
  findNext,
  findPrevious,
  getSearchQuery,
  replaceAll,
  replaceNext,
  selectMatches,
  setSearchQuery,
} from "@codemirror/search";

function createIcon(paths: string): HTMLSpanElement {
  const icon = document.createElement("span");
  icon.className = "cm-source-search-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  return icon;
}

function createIconButton(label: string, paths: string, action: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "cm-source-search-button";
  button.setAttribute("aria-label", label);
  button.title = label;
  button.append(createIcon(paths));
  button.addEventListener("click", action);
  return button;
}

function createTextButton(label: string, text: string, action: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "cm-source-search-text-button";
  button.setAttribute("aria-label", label);
  button.title = label;
  button.textContent = text;
  button.addEventListener("click", action);
  return button;
}

export function createSourceSearchPanel(view: EditorView): Panel {
  const dom = document.createElement("div");
  dom.className = "cm-source-search";

  const searchRow = document.createElement("div");
  searchRow.className = "cm-source-search-row";

  const inputWrap = document.createElement("div");
  inputWrap.className = "cm-source-search-input-wrap";
  inputWrap.append(createIcon('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'));

  const input = document.createElement("input");
  input.className = "cm-source-search-input";
  input.type = "text";
  input.placeholder = "Buscar...";
  input.setAttribute("aria-label", "Buscar no arquivo");
  input.setAttribute("main-field", "true");
  input.value = getSearchQuery(view.state).search;
  inputWrap.append(input);

  const count = document.createElement("span");
  count.className = "cm-source-search-count";
  count.setAttribute("aria-live", "polite");
  count.setAttribute("aria-atomic", "true");

  const replaceRow = document.createElement("div");
  replaceRow.className = "cm-source-search-row cm-source-search-replace-row";

  const replaceInput = document.createElement("input");
  replaceInput.className = "cm-source-search-input cm-source-search-replace-input";
  replaceInput.type = "text";
  replaceInput.placeholder = "Substituir por...";
  replaceInput.setAttribute("aria-label", "Substituir por");
  replaceInput.value = getSearchQuery(view.state).replace;

  const commitQuery = (overrides: Partial<Pick<SearchQuery, "caseSensitive" | "regexp" | "wholeWord">> = {}) => {
    const current = getSearchQuery(view.state);
    const query = new SearchQuery({
      search: input.value,
      replace: replaceInput.value,
      caseSensitive: overrides.caseSensitive ?? current.caseSensitive,
      regexp: overrides.regexp ?? current.regexp,
      wholeWord: overrides.wholeWord ?? current.wholeWord,
    });
    view.dispatch({ effects: setSearchQuery.of(query) });
    return query;
  };

  const refresh = () => {
    const query = getSearchQuery(view.state);
    const matches: Array<{ from: number; to: number }> = [];
    if (query.valid && query.search) {
      const cursor = query.getCursor(view.state);
      for (let next = cursor.next(); !next.done; next = cursor.next()) matches.push(next.value);
    }
    const selection = view.state.selection.main;
    const activeIndex = matches.findIndex((match) => match.from === selection.from && match.to === selection.to);

    const currentMatch = activeIndex >= 0 ? activeIndex + 1 : matches.length > 0 ? 1 : 0;
    count.textContent = matches.length === 0 ? "Nenhum" : `${currentMatch} de ${matches.length}`;
    count.title = matches.length === 0
      ? "Nenhuma ocorrência encontrada"
      : `Ocorrência ${currentMatch} de ${matches.length}`;
    previousButton.disabled = matches.length === 0;
    nextButton.disabled = matches.length === 0;
    selectAllButton.disabled = matches.length === 0;
    replaceButton.disabled = matches.length === 0;
    replaceAllButton.disabled = matches.length === 0;
    caseButton.classList.toggle("is-active", query.caseSensitive);
    regexpButton.classList.toggle("is-active", query.regexp);
    wordButton.classList.toggle("is-active", query.wholeWord);
    caseButton.setAttribute("aria-pressed", String(query.caseSensitive));
    regexpButton.setAttribute("aria-pressed", String(query.regexp));
    wordButton.setAttribute("aria-pressed", String(query.wholeWord));
  };

  const focusSearch = () => input.focus();
  const goToMatch = (direction: "previous" | "next") => {
    if (direction === "previous") findPrevious(view);
    else findNext(view);
    refresh();
    focusSearch();
  };

  const previousButton = createIconButton(
    "Anterior (Shift+Enter)",
    '<path d="m18 15-6-6-6 6"/>',
    () => goToMatch("previous"),
  );
  const nextButton = createIconButton(
    "Próximo (Enter)",
    '<path d="m6 9 6 6 6-6"/>',
    () => goToMatch("next"),
  );
  const selectAllButton = createIconButton(
    "Selecionar todas as ocorrências",
    '<path d="M4 4h6v6H4z"/><path d="M14 4h6v6h-6z"/><path d="M4 14h6v6H4z"/><path d="M14 14h6v6h-6z"/>',
    () => {
      selectMatches(view);
      refresh();
      focusSearch();
    },
  );
  const caseButton = createTextButton("Diferenciar maiúsculas e minúsculas", "Aa", () => {
    const current = getSearchQuery(view.state);
    commitQuery({ caseSensitive: !current.caseSensitive });
    refresh();
    focusSearch();
  });
  const regexpButton = createTextButton("Usar expressão regular", ".*", () => {
    const current = getSearchQuery(view.state);
    commitQuery({ regexp: !current.regexp });
    refresh();
    focusSearch();
  });
  const wordButton = createTextButton("Buscar palavra inteira", "Ab", () => {
    const current = getSearchQuery(view.state);
    commitQuery({ wholeWord: !current.wholeWord });
    refresh();
    focusSearch();
  });
  const clearButton = createIconButton(
    "Limpar busca",
    '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5"/><path d="M14 11v5"/>',
    () => {
      input.value = "";
      replaceInput.value = "";
      view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search: "" })) });
      refresh();
      focusSearch();
    },
  );
  const closeButton = createIconButton(
    "Fechar busca (Esc)",
    '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    () => closeSearchPanel(view),
  );
  closeButton.classList.add("cm-source-search-close");

  const replaceButton = createTextButton("Substituir ocorrência atual", "Substituir", () => {
    commitQuery();
    replaceNext(view);
    refresh();
    replaceInput.focus();
  });
  replaceButton.classList.add("is-action");
  const replaceAllButton = createTextButton("Substituir todas as ocorrências", "Substituir tudo", () => {
    commitQuery();
    replaceAll(view);
    refresh();
    replaceInput.focus();
  });
  replaceAllButton.classList.add("is-action");

  input.addEventListener("input", () => {
    const query = commitQuery();
    if (query.valid && query.search) {
      const first = query.getCursor(view.state).next();
      if (!first.done) {
        view.dispatch({
          selection: { anchor: first.value.from, head: first.value.to },
          effects: EditorView.scrollIntoView(first.value.from, { y: "center" }),
        });
      }
    }
    refresh();
    focusSearch();
  });

  replaceInput.addEventListener("input", () => {
    commitQuery();
    refresh();
  });

  const handleFieldKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeSearchPanel(view);
    } else if (event.key === "Enter" && input.value) {
      event.preventDefault();
      if (event.currentTarget === replaceInput) {
        commitQuery();
        replaceNext(view);
        refresh();
        replaceInput.focus();
      } else {
        goToMatch(event.shiftKey ? "previous" : "next");
      }
    }
  };
  input.addEventListener("keydown", handleFieldKeydown);
  replaceInput.addEventListener("keydown", handleFieldKeydown);

  const handleOutsideClick = (event: MouseEvent) => {
    if (!dom.contains(event.target as Node)) closeSearchPanel(view);
  };

  searchRow.append(
    inputWrap,
    count,
    previousButton,
    nextButton,
    selectAllButton,
    caseButton,
    regexpButton,
    wordButton,
    clearButton,
    closeButton,
  );
  replaceRow.append(replaceInput, replaceButton, replaceAllButton);
  dom.append(searchRow, replaceRow);
  refresh();

  return {
    dom,
    mount() {
      document.addEventListener("mousedown", handleOutsideClick);
      input.focus();
      input.select();
    },
    update(update: ViewUpdate) {
      const query = getSearchQuery(update.state);
      if (input.value !== query.search) input.value = query.search;
      if (replaceInput.value !== query.replace) replaceInput.value = query.replace;
      refresh();
    },
    destroy() {
      document.removeEventListener("mousedown", handleOutsideClick);
      dom.remove();
    },
  };
}
