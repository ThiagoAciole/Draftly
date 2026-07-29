use serde::Serialize;
use spellbook::Dictionary;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;

const SUPPORTED_IMAGE_EXTENSIONS: &[&str] = &["avif", "gif", "jpeg", "jpg", "png", "svg", "webp"];
const PT_BR_AFF: &str = include_str!("../resources/dictionaries/pt-br/pt_BR.aff");
const PT_BR_DIC: &str = include_str!("../resources/dictionaries/pt-br/pt_BR.dic");

static SPELLING_DICTIONARY: OnceLock<Result<Dictionary, String>> = OnceLock::new();

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SpellingError {
    word: String,
    suggestions: Vec<String>,
}

fn spelling_dictionary() -> Result<&'static Dictionary, String> {
    match SPELLING_DICTIONARY.get_or_init(|| {
        Dictionary::new(PT_BR_AFF, PT_BR_DIC)
            .map_err(|error| format!("Dicionário pt-BR inválido: {error}"))
    }) {
        Ok(dictionary) => Ok(dictionary),
        Err(error) => Err(error.clone()),
    }
}

#[tauri::command]
fn check_spelling(text: String) -> Result<Vec<SpellingError>, String> {
    let dictionary = spelling_dictionary()?;
    let mut errors = Vec::new();
    let mut suggestions = Vec::new();

    for word in text.split(|character: char| !character.is_alphabetic() && character != '\'') {
        if word.len() < 3 || dictionary.check(word) {
            continue;
        }

        suggestions.clear();
        dictionary.suggest(word, &mut suggestions);
        errors.push(SpellingError {
            word: word.to_string(),
            suggestions: suggestions.iter().take(5).cloned().collect(),
        });
    }

    Ok(errors)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct StoredImageAsset {
    relative_path: String,
    absolute_path: String,
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

    #[test]
    fn checks_portuguese_spelling_and_returns_suggestions() {
        let errors = check_spelling("Eu vi um caxorro".into()).expect("dictionary must load");
        assert_eq!(errors[0].word, "caxorro");
        assert!(errors[0].suggestions.iter().any(|word| word == "cachorro"));
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            read_text_file,
            write_text_file,
            store_image_asset,
            write_pdf_file,
            get_initial_text_file_path,
            check_spelling
        ])
        .run(tauri::generate_context!())
        .expect("error while running Draftly");
}
