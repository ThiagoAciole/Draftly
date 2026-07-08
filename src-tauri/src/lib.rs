use std::path::Path;

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
            get_initial_markdown_file_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running Draftly");
}
