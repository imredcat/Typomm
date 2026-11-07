use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Serialize, Deserialize)]
pub struct FileInfo {
    pub path: String,
    pub name: String,
    pub content: String,
}

#[tauri::command]
fn open_file_dialog() -> Result<Option<FileInfo>, String> {
    let file = rfd::FileDialog::new()
        .add_filter("Markdown", &["md", "markdown", "txt"])
        .pick_file();

    if let Some(path_buf) = file {
        let path_str = path_buf.to_string_lossy().to_string();
        let name = path_buf
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "Untitled.md".to_string());

        let content = fs::read_to_string(&path_buf).map_err(|e| e.to_string())?;

        Ok(Some(FileInfo {
            path: path_str,
            name,
            content,
        }))
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn read_file(path: String) -> Result<FileInfo, String> {
    let path_buf = Path::new(&path);
    let name = path_buf
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "Untitled.md".to_string());

    let content = fs::read_to_string(path_buf).map_err(|e| e.to_string())?;

    Ok(FileInfo {
        path,
        name,
        content,
    })
}

#[tauri::command]
fn save_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_file_as_dialog(default_name: Option<String>, content: String) -> Result<Option<FileInfo>, String> {
    let mut dialog = rfd::FileDialog::new().add_filter("Markdown", &["md", "markdown"]);
    if let Some(ref name) = default_name {
        dialog = dialog.set_file_name(name);
    }

    let file = dialog.save_file();

    if let Some(path_buf) = file {
        let path_str = path_buf.to_string_lossy().to_string();
        let name = path_buf
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "Untitled.md".to_string());

        fs::write(&path_buf, &content).map_err(|e| e.to_string())?;

        Ok(Some(FileInfo {
            path: path_str,
            name,
            content,
        }))
    } else {
        Ok(None)
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            open_file_dialog,
            read_file,
            save_file,
            save_file_as_dialog
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
