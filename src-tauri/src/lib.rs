use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::Mutex;
use std::time::Duration;
use tauri::State;

const SUPPORTED_IMAGE_EXTENSIONS: &[&str] = &["avif", "gif", "jpeg", "jpg", "png", "svg", "webp"];

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct StoredImageAsset {
    relative_path: String,
    absolute_path: String,
}

fn parse_windows_registry_value(output: &str, name: &str) -> Option<String> {
    output
        .lines()
        .find_map(|line| {
            line.trim()
                .strip_prefix(name)
                .and_then(|value| value.trim_start().strip_prefix("REG_SZ"))
                .map(str::trim)
        })
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
}

fn read_windows_user_environment_variable(name: &str) -> Option<String> {
    let output = Command::new("reg.exe")
        .args(["query", r"HKCU\Environment", "/v", name])
        .output()
        .ok()
        .filter(|output| output.status.success())?;

    parse_windows_registry_value(&String::from_utf8_lossy(&output.stdout), name)
}

fn gemini_api_key_from_environment() -> Option<String> {
    ["GEMINI_API_KEY", "GOOGLE_API_KEY"]
        .into_iter()
        .find_map(|name| {
            read_windows_user_environment_variable(name).or_else(|| std::env::var(name).ok())
        })
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

#[derive(Deserialize)]
struct GeminiResponse {
    steps: Option<Vec<GeminiStep>>,
}
#[derive(Deserialize)]
struct GeminiStep {
    #[serde(rename = "type")]
    kind: String,
    content: Option<Vec<GeminiPart>>,
}
#[derive(Deserialize)]
struct GeminiPart {
    text: Option<String>,
}

#[derive(Default)]
struct GeminiRequestRegistry(Mutex<HashMap<String, tokio::sync::oneshot::Sender<()>>>);

impl GeminiRequestRegistry {
    fn insert(&self, request_id: String) -> tokio::sync::oneshot::Receiver<()> {
        let (sender, receiver) = tokio::sync::oneshot::channel();
        self.0
            .lock()
            .expect("registro Gemini indisponível")
            .insert(request_id, sender);
        receiver
    }

    fn cancel(&self, request_id: &str) -> bool {
        self.0
            .lock()
            .expect("registro Gemini indisponível")
            .remove(request_id)
            .is_some_and(|sender| sender.send(()).is_ok())
    }

    fn remove(&self, request_id: &str) {
        self.0
            .lock()
            .expect("registro Gemini indisponível")
            .remove(request_id);
    }
}

#[tauri::command]
fn has_gemini_api_key_in_environment() -> bool {
    gemini_api_key_from_environment().is_some()
}

#[tauri::command]
fn open_gemini_environment_settings() -> Result<(), String> {
    Command::new("rundll32.exe")
        .arg("sysdm.cpl,EditEnvironmentVariables")
        .spawn()
        .map(|_| ())
        .map_err(|error| {
            format!("Não foi possível abrir as Variáveis de Ambiente do Windows: {error}")
        })
}

#[tauri::command]
async fn run_gemini_action(
    prompt: String,
    model: String,
    request_id: String,
    registry: State<'_, GeminiRequestRegistry>,
) -> Result<String, String> {
    if prompt.trim().is_empty() {
        return Err("Não há conteúdo para analisar.".into());
    }
    if request_id.trim().is_empty() {
        return Err("Identificador de solicitação inválido.".into());
    }
    let api_key = gemini_api_key_from_environment().ok_or_else(|| {
        "Defina a variável GEMINI_API_KEY no Windows e reinicie o Draftly.".to_string()
    })?;
    let model = if model.trim().is_empty() {
        "gemini-3.5-flash-lite"
    } else {
        model.trim()
    };
    let url = "https://generativelanguage.googleapis.com/v1beta/interactions";
    let mut cancellation = registry.insert(request_id.clone());
    let request = reqwest::Client::builder()
        .timeout(Duration::from_secs(12))
        .build()
        .map_err(|error| error.to_string())?
        .post(url)
        .header("x-goog-api-key", api_key)
        .header("Api-Revision", "2026-05-20")
        .json(&serde_json::json!({
            "model": model,
            "input": prompt,
            "store": false,
            "generation_config": { "thinking_level": "low" }
        }));
    let response = tokio::select! {
        _ = &mut cancellation => Err("A solicitação Gemini foi cancelada.".to_string()),
        response = request.send() => response.map_err(|_| "A Gemini não respondeu em até 12 segundos. Verifique sua internet e tente novamente.".to_string()),
    };
    registry.remove(&request_id);
    let response = response?;
    if !response.status().is_success() {
        let status = response.status();
        let detail = response.text().await.unwrap_or_default();
        return Err(format!(
            "A Gemini recusou a solicitação ({status}). {detail}"
        ));
    }
    let payload: GeminiResponse = response
        .json()
        .await
        .map_err(|_| "A Gemini retornou uma resposta inválida.".to_string())?;
    payload
        .steps
        .and_then(|steps| {
            steps
                .into_iter()
                .rev()
                .find(|step| step.kind == "model_output")
        })
        .and_then(|step| step.content)
        .and_then(|parts| parts.into_iter().find_map(|part| part.text))
        .filter(|text| !text.trim().is_empty())
        .ok_or_else(|| "A Gemini não retornou conteúdo.".into())
}

#[tauri::command]
fn cancel_gemini_action(request_id: String, registry: State<'_, GeminiRequestRegistry>) -> bool {
    registry.cancel(&request_id)
}

fn ensure_supported_text_path(path: &str) -> Result<(), String> {
    let extension = Path::new(path)
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();

    if matches!(
        extension.as_str(),
        "md" | "txt" | "json" | "js" | "ts" | "py" | "html"
    ) {
        Ok(())
    } else {
        Err("O Draftly abre e salva arquivos .md, .txt, .json, .js, .ts, .py e .html".into())
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

fn sanitize_image_file_name(file_name: &str) -> Result<(String, String), String> {
    let name = Path::new(file_name)
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| "Nome de imagem invÃ¡lido".to_string())?;
    let extension = Path::new(name)
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();

    if !SUPPORTED_IMAGE_EXTENSIONS.contains(&extension.as_str()) {
        return Err("Use uma imagem PNG, JPG, GIF, WebP, AVIF ou SVG".into());
    }

    let stem = Path::new(name)
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("imagem");
    let safe_stem: String = stem
        .chars()
        .map(|character| {
            if character.is_alphanumeric() || matches!(character, '-' | '_') {
                character
            } else {
                '-'
            }
        })
        .collect();
    let safe_stem = safe_stem.trim_matches('-');
    let safe_stem = if safe_stem.is_empty() {
        "imagem"
    } else {
        safe_stem
    };

    Ok((safe_stem.to_string(), extension))
}

#[tauri::command]
fn store_image_asset(
    document_path: String,
    file_name: String,
    bytes: Vec<u8>,
) -> Result<StoredImageAsset, String> {
    let document = Path::new(&document_path);
    let extension = document
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();

    if extension != "md" {
        return Err("Imagens locais sÃ³ podem ser adicionadas a arquivos Markdown".into());
    }

    let document_directory = document
        .parent()
        .filter(|directory| !directory.as_os_str().is_empty())
        .ok_or_else(|| "NÃ£o foi possÃ­vel localizar a pasta do Markdown".to_string())?;
    let (stem, image_extension) = sanitize_image_file_name(&file_name)?;
    let assets_directory = document_directory.join("images");
    std::fs::create_dir_all(&assets_directory).map_err(|error| error.to_string())?;

    let mut sequence = 0_u32;
    let target_path: PathBuf = loop {
        let suffix = if sequence == 0 {
            String::new()
        } else {
            format!("-{sequence}")
        };
        let candidate = assets_directory.join(format!("{stem}{suffix}.{image_extension}"));
        if !candidate.exists() {
            break candidate;
        }
        sequence += 1;
    };

    std::fs::write(&target_path, bytes).map_err(|error| error.to_string())?;
    let file_name = target_path
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| "NÃ£o foi possÃ­vel salvar a imagem".to_string())?;

    Ok(StoredImageAsset {
        relative_path: format!("images/{file_name}"),
        absolute_path: target_path.to_string_lossy().into_owned(),
    })
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
            .is_some_and(|extension| {
                matches!(
                    extension.to_ascii_lowercase().as_str(),
                    "md" | "txt" | "json" | "js" | "ts" | "py" | "html"
                )
            })
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temporary_directory() -> PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock must be after Unix epoch")
            .as_nanos();
        let directory =
            std::env::temp_dir().join(format!("draftly-tests-{}-{nonce}", std::process::id()));
        std::fs::create_dir_all(&directory).expect("temporary directory must be created");
        directory
    }

    #[test]
    fn accepts_only_supported_text_extensions_case_insensitively() {
        for path in [
            "nota.md",
            "README.TXT",
            "dados.json",
            "app.js",
            "app.ts",
            "script.py",
            "index.html",
        ] {
            assert!(
                ensure_supported_text_path(path).is_ok(),
                "{path} should be supported"
            );
        }

        assert!(ensure_supported_text_path("arquivo.pdf").is_err());
        assert!(ensure_supported_text_path("sem-extensao").is_err());
        assert!(ensure_pdf_path("exportacao.pdf").is_ok());
        assert!(ensure_pdf_path("exportacao.md").is_err());
    }

    #[test]
    fn reads_a_gemini_key_from_the_persisted_windows_user_environment() {
        let registry_output =
            "\r\nHKEY_CURRENT_USER\\Environment\r\n    GEMINI_API_KEY    REG_SZ    test-key\r\n";

        assert_eq!(
            parse_windows_registry_value(registry_output, "GEMINI_API_KEY"),
            Some("test-key".to_string())
        );
    }

    #[test]
    fn cancels_a_pending_gemini_request() {
        let registry = GeminiRequestRegistry::default();
        let mut cancellation = registry.insert("request-1".to_string());

        assert!(registry.cancel("request-1"));
        assert!(cancellation.try_recv().is_ok());
        assert!(!registry.cancel("request-1"));
    }

    #[test]
    fn sanitizes_image_names_and_rejects_unsafe_extensions() {
        assert_eq!(
            sanitize_image_file_name("../../Mapa final!.PNG"),
            Ok(("Mapa-final".to_string(), "png".to_string()))
        );
        assert_eq!(
            sanitize_image_file_name("...webp"),
            Ok(("imagem".to_string(), "webp".to_string()))
        );
        assert!(sanitize_image_file_name("programa.exe").is_err());
    }

    #[test]
    fn stores_images_beside_markdown_without_overwriting_existing_asset() {
        let directory = temporary_directory();
        let document_path = directory.join("nota.md");

        let first = store_image_asset(
            document_path.to_string_lossy().into_owned(),
            "Diagrama final.png".into(),
            vec![1, 2, 3],
        )
        .expect("first image must be stored");
        let second = store_image_asset(
            document_path.to_string_lossy().into_owned(),
            "Diagrama final.png".into(),
            vec![4, 5, 6],
        )
        .expect("second image must get a distinct name");

        assert_eq!(first.relative_path, "images/Diagrama-final.png");
        assert_eq!(second.relative_path, "images/Diagrama-final-1.png");
        assert_eq!(std::fs::read(first.absolute_path).unwrap(), vec![1, 2, 3]);
        assert_eq!(std::fs::read(second.absolute_path).unwrap(), vec![4, 5, 6]);

        std::fs::remove_dir_all(directory).expect("temporary directory must be removed");
    }

    #[test]
    fn refuses_to_store_local_images_for_non_markdown_documents() {
        let directory = temporary_directory();
        let result = store_image_asset(
            directory.join("nota.txt").to_string_lossy().into_owned(),
            "imagem.png".into(),
            vec![1],
        );

        assert!(result.is_err());
        std::fs::remove_dir_all(directory).expect("temporary directory must be removed");
    }
}

pub fn run() {
    tauri::Builder::default()
        .manage(GeminiRequestRegistry::default())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            read_text_file,
            write_text_file,
            store_image_asset,
            write_pdf_file,
            get_initial_text_file_path,
            has_gemini_api_key_in_environment,
            open_gemini_environment_settings,
            run_gemini_action,
            cancel_gemini_action
        ])
        .run(tauri::generate_context!())
        .expect("error while running Draftly");
}
