use std::path::Path;

fn ensure_supported_text_path(path: &str) -> Result<(), String> {
    let extension = Path::new(path)
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();

    if matches!(extension.as_str(), "md" | "json" | "js" | "ts" | "py" | "html") {
        Ok(())
    } else {
        Err("O Draftly abre e salva arquivos .md, .json, .js, .ts, .py e .html".into())
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
        Err("A exportacao precisa salvar um arquivo .pdf".into())
    }
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    ensure_supported_text_path(&path)?;
    std::fs::read_to_string(path).map_err(|error| error.to_string())
}

#[tauri::command]
fn write_text_file(path: String, content: String) -> Result<(), String> {
    ensure_supported_text_path(&path)?;
    std::fs::write(path, content).map_err(|error| error.to_string())
}

#[tauri::command]
fn write_pdf_file(path: String, bytes: Vec<u8>) -> Result<(), String> {
    ensure_pdf_path(&path)?;
    std::fs::write(path, bytes).map_err(|error| error.to_string())
}

#[tauri::command]
fn get_initial_text_file_path() -> Option<String> {
    std::env::args().skip(1).find(|argument| {
        Path::new(argument)
            .extension()
            .and_then(|value| value.to_str())
            .is_some_and(|extension| matches!(extension.to_ascii_lowercase().as_str(), "md" | "json" | "js" | "ts" | "py" | "html"))
    })
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            read_text_file,
            write_text_file,
            write_pdf_file,
            get_initial_text_file_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running Draftly");
}
