use std::path::{Path, PathBuf};

use comrak::nodes::{AstNode, ListType, NodeValue};
use comrak::{parse_document, Arena, Options};
use typst::diag::{FileError, FileResult, SourceDiagnostic};
use typst::ecow::EcoVec;
use typst::foundations::{Bytes, Datetime, Duration, Smart};
use typst::syntax::{FileId, Source};
use typst::text::{Font, FontBook};
use typst::utils::LazyHash;
use typst::{Library, LibraryExt, World};
use typst_layout::PagedDocument;
use typst_pdf::PdfOptions;

fn ensure_markdown_path(path: &str) -> Result<(), String> {
    let extension = Path::new(path)
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();

    if extension == "md" {
        Ok(())
    } else {
        Err("Draftly v1 abre e salva apenas arquivos .md".into())
    }
}

fn ensure_pdf_path(path: &str) -> Result<(), String> {
    let extension = Path::new(path)
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();

    if extension == "pdf" {
        Ok(())
    } else {
        Err("A exportação precisa salvar um arquivo .pdf".into())
    }
}

struct DraftlyTypstWorld {
    library: LazyHash<Library>,
    book: LazyHash<FontBook>,
    fonts: Vec<Font>,
    source: Source,
}

impl DraftlyTypstWorld {
    fn new(source_text: String) -> Self {
        let source = Source::detached(source_text);
        let fonts = typst_assets::fonts()
            .flat_map(|data| Font::iter(Bytes::new(data)))
            .collect::<Vec<_>>();
        let book = FontBook::from_fonts(&fonts);

        Self {
            library: LazyHash::new(Library::default()),
            book: LazyHash::new(book),
            fonts,
            source,
        }
    }
}

impl World for DraftlyTypstWorld {
    fn library(&self) -> &LazyHash<Library> {
        &self.library
    }

    fn book(&self) -> &LazyHash<FontBook> {
        &self.book
    }

    fn main(&self) -> FileId {
        self.source.id()
    }

    fn source(&self, id: FileId) -> FileResult<Source> {
        if id == self.source.id() {
            Ok(self.source.clone())
        } else {
            Err(FileError::NotFound(PathBuf::from("main.typ")))
        }
    }

    fn file(&self, id: FileId) -> FileResult<Bytes> {
        self.source(id)
            .map(|source| Bytes::from_string(source.text().to_owned()))
    }

    fn font(&self, index: usize) -> Option<Font> {
        self.fonts.get(index).cloned()
    }

    fn today(&self, _offset: Option<Duration>) -> Option<Datetime> {
        None
    }
}

fn format_typst_diagnostics(diagnostics: EcoVec<SourceDiagnostic>) -> String {
    let messages = diagnostics
        .into_iter()
        .map(|diagnostic| diagnostic.message.to_string())
        .collect::<Vec<_>>();

    if messages.is_empty() {
        "Nao foi possivel gerar o PDF.".into()
    } else {
        format!("Nao foi possivel gerar o PDF: {}", messages.join("; "))
    }
}

fn markdown_options() -> Options<'static> {
    let mut options = Options::default();
    options.extension.table = true;
    options.extension.tasklist = true;
    options.extension.strikethrough = true;
    options.extension.autolink = true;
    options
}

fn markdown_to_typst(name: &str, markdown: &str) -> String {
    let arena = Arena::new();
    let root = parse_document(&arena, markdown, &markdown_options());
    let mut body = String::new();

    for child in root.children() {
        render_block(child, &mut body);
    }

    if body.trim().is_empty() {
        body.push_str(&escape_typst_text(name));
    }

    format!("{}{}", typst_preamble(), body)
}

fn typst_preamble() -> &'static str {
    r##"#set page(paper: "a4", margin: (x: 22mm, y: 20mm))
#set text(font: "Libertinus Serif", size: 11pt, fill: rgb("#24222a"), lang: "pt")
#set par(leading: 0.62em, spacing: 0.82em)
#show heading.where(level: 1): set text(size: 23pt, weight: "bold", fill: rgb("#35236f"))
#show heading.where(level: 2): set text(size: 17pt, weight: "bold", fill: rgb("#514196"))
#show heading.where(level: 3): set text(size: 14pt, weight: "bold", fill: rgb("#4a4558"))
#show link: set text(fill: rgb("#6750d8"))
#show raw: set text(font: "DejaVu Sans Mono", size: 9.3pt, fill: rgb("#5b36c8"))

"##
}

fn render_block<'a>(node: &'a AstNode<'a>, output: &mut String) {
    let value = node.data().value.clone();

    match value {
        NodeValue::Document => {
            for child in node.children() {
                render_block(child, output);
            }
        }
        NodeValue::Paragraph => {
            output.push_str(&render_inlines(node));
            output.push_str("\n\n");
        }
        NodeValue::Heading(heading) => {
            output.push_str(&"=".repeat(heading.level as usize));
            output.push(' ');
            output.push_str(&render_inlines(node));
            output.push_str("\n\n");
        }
        NodeValue::BlockQuote => {
            let mut quote = String::new();
            for child in node.children() {
                render_block(child, &mut quote);
            }
            output.push_str("#pad(left: 10pt)[#text(fill: rgb(\"#5b4e72\"), style: \"italic\")[");
            output.push_str(quote.trim());
            output.push_str("]]\n\n");
        }
        NodeValue::List(list) => render_list(node, output, list.list_type),
        NodeValue::CodeBlock(code) => {
            output.push_str("```");
            output.push_str(code.info.split_whitespace().next().unwrap_or("text"));
            output.push('\n');
            output.push_str(&code.literal.replace("```", "` ` `"));
            if !code.literal.ends_with('\n') {
                output.push('\n');
            }
            output.push_str("```\n\n");
        }
        NodeValue::ThematicBreak => {
            output.push_str("#line(length: 100%, stroke: rgb(\"#ded8f7\"))\n\n");
        }
        NodeValue::Table(_) => render_table(node, output),
        NodeValue::HtmlBlock(html) => {
            output.push_str(&escape_typst_text(html.literal.trim()));
            output.push_str("\n\n");
        }
        _ => {
            for child in node.children() {
                render_block(child, output);
            }
        }
    }
}

fn render_list<'a>(node: &'a AstNode<'a>, output: &mut String, list_type: ListType) {
    let mut list_items = Vec::new();

    for child in node.children() {
        let item = render_list_item(child);

        if let Some(checked) = find_task_state(child) {
            flush_typst_list(&mut list_items, output, list_type);
            render_checklist_item(checked, &item, output);
        } else if let Some((checked, content)) = strip_task_marker(&item) {
            flush_typst_list(&mut list_items, output, list_type);
            render_checklist_item(checked, &content, output);
        } else {
            list_items.push(item);
        }
    }

    flush_typst_list(&mut list_items, output, list_type);
}

fn render_list_item<'a>(node: &'a AstNode<'a>) -> String {
    let mut parts = Vec::new();

    for child in node.children() {
        let value = child.data().value.clone();
        match value {
            NodeValue::Paragraph => parts.push(render_inlines(child)),
            NodeValue::List(list) => {
                let mut nested = String::new();
                render_list(child, &mut nested, list.list_type);
                parts.push(format!("\n{}", nested.trim_end()));
            }
            _ => {
                let mut nested = String::new();
                render_block(child, &mut nested);
                let nested = nested.trim();
                if !nested.is_empty() {
                    parts.push(nested.to_owned());
                }
            }
        }
    }

    parts.join(" ")
}

fn render_table<'a>(node: &'a AstNode<'a>, output: &mut String) {
    let rows = node
        .children()
        .filter_map(|row| {
            let is_header = matches!(row.data().value, NodeValue::TableRow(true));
            let cells = row
                .children()
                .map(|cell| {
                    let content = render_inlines(cell);
                    if is_header {
                        format!("[*{}*]", content)
                    } else {
                        format!("[{}]", content)
                    }
                })
                .collect::<Vec<_>>();

            if cells.is_empty() {
                None
            } else {
                Some(cells)
            }
        })
        .collect::<Vec<_>>();

    let columns = rows.iter().map(|row| row.len()).max().unwrap_or(0);
    if columns == 0 {
        return;
    }

    let repeated_columns = if columns == 1 {
        "(1fr,)".to_owned()
    } else {
        format!(
            "({})",
            std::iter::repeat("1fr")
                .take(columns)
                .collect::<Vec<_>>()
                .join(", ")
        )
    };

    output.push_str("#table(\n");
    output.push_str(&format!("  columns: {},\n", repeated_columns));
    output.push_str("  stroke: rgb(\"#ded8f7\"),\n");
    output.push_str("  inset: 7pt,\n");
    output.push_str("  fill: (x, y) => if y == 0 { rgb(\"#f1edff\") } else if calc.odd(y) { rgb(\"#fbfaff\") },\n");

    for (row_index, row) in rows.into_iter().enumerate() {
        if row_index == 0 {
            output.push_str("  table.header(\n");
            for cell in row {
                output.push_str("    ");
                output.push_str(&cell);
                output.push_str(",\n");
            }
            output.push_str("  ),\n");
        } else {
            for cell in row {
                output.push_str("  ");
                output.push_str(&cell);
                output.push_str(",\n");
            }
        }
    }

    output.push_str(")\n\n");
}

fn flush_typst_list(items: &mut Vec<String>, output: &mut String, list_type: ListType) {
    if items.is_empty() {
        return;
    }

    if list_type == ListType::Ordered {
        output.push_str("#enum(\n");
        output.push_str("  numbering: \"1.\",\n");
    } else {
        output.push_str("#list(\n");
        output.push_str("  marker: [#text(fill: rgb(\"#6750d8\"))[•]],\n");
    }

    output.push_str("  tight: true,\n");
    output.push_str("  spacing: 4pt,\n");

    for item in items.drain(..) {
        output.push_str("  [");
        output.push_str(item.trim());
        output.push_str("],\n");
    }

    output.push_str(")\n\n");
}

fn render_checklist_item(checked: bool, content: &str, output: &mut String) {
    let marker = if checked {
        r##"[#box(width: 9pt, height: 9pt, radius: 2pt, fill: rgb("#6750d8"), stroke: rgb("#6750d8"))[#text(size: 7pt, fill: white)[✓]]]"##
    } else {
        r##"[#box(width: 9pt, height: 9pt, radius: 2pt, stroke: rgb("#6750d8"))]"##
    };

    output.push_str("#grid(\n");
    output.push_str("  columns: (13pt, 1fr),\n");
    output.push_str("  column-gutter: 7pt,\n");
    output.push_str("  align: (center, horizon),\n");
    output.push_str("  ");
    output.push_str(marker);
    output.push_str(",\n");
    output.push_str("  [");
    output.push_str(content.trim());
    output.push_str("],\n");
    output.push_str(")\n#v(4pt)\n\n");
}

fn strip_task_marker(value: &str) -> Option<(bool, String)> {
    let trimmed = value.trim_start();

    if let Some(content) = trimmed.strip_prefix("\\[ \\] ") {
        return Some((false, content.trim_start().to_owned()));
    }

    if let Some(content) = trimmed
        .strip_prefix("\\[x\\] ")
        .or_else(|| trimmed.strip_prefix("\\[X\\] "))
    {
        return Some((true, content.trim_start().to_owned()));
    }

    None
}

fn find_task_state<'a>(node: &'a AstNode<'a>) -> Option<bool> {
    if let NodeValue::TaskItem(task) = node.data().value {
        return Some(task.symbol.is_some());
    }

    node.children().find_map(find_task_state)
}

fn render_inlines<'a>(node: &'a AstNode<'a>) -> String {
    let mut output = String::new();

    for child in node.children() {
        let value = child.data().value.clone();
        match value {
            NodeValue::Text(text) => output.push_str(&escape_typst_text(&text)),
            NodeValue::SoftBreak | NodeValue::LineBreak => output.push(' '),
            NodeValue::Code(code) => {
                output.push_str("#raw(\"");
                output.push_str(&escape_typst_string(&code.literal));
                output.push_str("\")");
            }
            NodeValue::Emph => {
                output.push('_');
                output.push_str(&render_inlines(child));
                output.push('_');
            }
            NodeValue::Strong => {
                output.push('*');
                output.push_str(&render_inlines(child));
                output.push('*');
            }
            NodeValue::Strikethrough => {
                output.push_str("#strike[");
                output.push_str(&render_inlines(child));
                output.push(']');
            }
            NodeValue::Link(link) => {
                output.push_str("#link(\"");
                output.push_str(&escape_typst_string(&link.url));
                output.push_str("\")[");
                output.push_str(&render_inlines(child));
                output.push(']');
            }
            NodeValue::Image(link) => {
                output.push_str("#link(\"");
                output.push_str(&escape_typst_string(&link.url));
                output.push_str("\")[Imagem: ");
                output.push_str(&render_inlines(child));
                output.push(']');
            }
            NodeValue::HtmlInline(html) => output.push_str(&escape_typst_text(&html)),
            NodeValue::TaskItem(task) => {
                output.push_str(if task.symbol.is_some() {
                    "[x] "
                } else {
                    "[ ] "
                });
                output.push_str(&render_inlines(child));
            }
            _ => output.push_str(&render_inlines(child)),
        }
    }

    output
}

fn escape_typst_text(value: &str) -> String {
    value
        .chars()
        .flat_map(|char| match char {
            '\\' | '[' | ']' | '#' | '$' | '%' | '&' | '_' | '*' | '<' | '>' | '@' => {
                vec!['\\', char]
            }
            _ => vec![char],
        })
        .collect()
}

fn escape_typst_string(value: &str) -> String {
    value
        .chars()
        .flat_map(|char| match char {
            '\\' => vec!['\\', '\\'],
            '"' => vec!['\\', '"'],
            '\n' => vec!['\\', 'n'],
            '\r' => Vec::new(),
            _ => vec![char],
        })
        .collect()
}

#[tauri::command]
fn read_markdown_file(path: String) -> Result<String, String> {
    ensure_markdown_path(&path)?;
    std::fs::read_to_string(path).map_err(|error| error.to_string())
}

#[tauri::command]
fn write_markdown_file(path: String, content: String) -> Result<(), String> {
    ensure_markdown_path(&path)?;
    std::fs::write(path, content).map_err(|error| error.to_string())
}

#[tauri::command]
fn export_markdown_pdf(path: String, name: String, markdown: String) -> Result<(), String> {
    ensure_pdf_path(&path)?;

    let typst_source = markdown_to_typst(&name, &markdown);
    let world = DraftlyTypstWorld::new(typst_source);
    let document = typst::compile::<PagedDocument>(&world)
        .output
        .map_err(format_typst_diagnostics)?;
    let pdf = typst_pdf::pdf(
        &document,
        &PdfOptions {
            creator: Smart::Custom(Some("Draftly".into())),
            ..PdfOptions::default()
        },
    )
    .map_err(format_typst_diagnostics)?;

    std::fs::write(path, pdf).map_err(|error| error.to_string())
}

#[tauri::command]
fn get_initial_markdown_file_path() -> Option<String> {
    std::env::args().skip(1).find(|argument| {
        Path::new(argument)
            .extension()
            .and_then(|value| value.to_str())
            .is_some_and(|extension| extension.eq_ignore_ascii_case("md"))
    })
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            read_markdown_file,
            write_markdown_file,
            export_markdown_pdf,
            get_initial_markdown_file_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running Draftly");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn markdown_pdf_pipeline_compiles_common_blocks() {
        let markdown = r#"# Titulo

Um paragrafo com **negrito**, _italico_, `codigo` e [link](https://example.com).

- Item
- [x] Feito
- [ ] Pendente

> Citacao importante

```ts
const value = 1;
```

| Nome | Valor |
| --- | --- |
| Draftly | PDF |

---
"#;

        let source = markdown_to_typst("Teste.md", markdown);
        assert!(source.contains("#grid("));
        assert!(source.contains("#list("));
        assert!(source.contains("#table("));
        assert!(source.contains("table.header("));
        assert!(!source.contains("\\[ \\] Feito"));
        assert!(!source.contains("\\[ \\] Pendente"));

        let world = DraftlyTypstWorld::new(source);
        let document = typst::compile::<PagedDocument>(&world).output.unwrap();
        let pdf = typst_pdf::pdf(&document, &PdfOptions::default()).unwrap();

        assert!(pdf.starts_with(b"%PDF"));
    }
}
