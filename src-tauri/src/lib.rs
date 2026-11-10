use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Serialize, Deserialize)]
pub struct FileInfo {
    pub path: String,
    pub name: String,
    pub content: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct FolderNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Option<Vec<FolderNode>>,
}

#[derive(Serialize, Deserialize)]
pub struct FolderTree {
    pub root_path: String,
    pub root_name: String,
    pub nodes: Vec<FolderNode>,
}

fn scan_dir_filtered(dir: &Path, depth: usize) -> Vec<FolderNode> {
    if depth > 6 {
        return Vec::new();
    }

    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return Vec::new(),
    };

    let mut nodes: Vec<FolderNode> = Vec::new();

    for entry in entries.flatten() {
        let path_buf = entry.path();
        let file_name = match path_buf.file_name() {
            Some(n) => n.to_string_lossy().to_string(),
            None => continue,
        };

        // 숨김 파일/폴더 및 빌드/패키지 폴더 제외
        if file_name.starts_with('.')
            || file_name == "node_modules"
            || file_name == "target"
            || file_name == "dist"
        {
            continue;
        }

        let path_str = path_buf.to_string_lossy().to_string();

        if path_buf.is_dir() {
            let children = scan_dir_filtered(&path_buf, depth + 1);
            nodes.push(FolderNode {
                name: file_name,
                path: path_str,
                is_dir: true,
                children: Some(children),
            });
        } else if path_buf.is_file() {
            let ext = path_buf
                .extension()
                .map(|e| e.to_string_lossy().to_lowercase())
                .unwrap_or_default();

            if matches!(ext.as_str(), "md" | "markdown" | "html" | "htm" | "txt") {
                nodes.push(FolderNode {
                    name: file_name,
                    path: path_str,
                    is_dir: false,
                    children: None,
                });
            }
        }
    }

    nodes.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    nodes
}

#[tauri::command]
fn open_folder_dialog() -> Result<Option<FolderTree>, String> {
    let folder = rfd::FileDialog::new().pick_folder();

    if let Some(path_buf) = folder {
        let root_path = path_buf.to_string_lossy().to_string();
        let root_name = path_buf
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| root_path.clone());
        let nodes = scan_dir_filtered(&path_buf, 0);

        Ok(Some(FolderTree {
            root_path,
            root_name,
            nodes,
        }))
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn read_folder_tree(path: String) -> Result<FolderTree, String> {
    let path_buf = Path::new(&path);
    if !path_buf.exists() || !path_buf.is_dir() {
        return Err("유효하지 않은 폴더 경로입니다.".to_string());
    }
    let root_name = path_buf
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| path.clone());
    let nodes = scan_dir_filtered(path_buf, 0);

    Ok(FolderTree {
        root_path: path,
        root_name,
        nodes,
    })
}

#[tauri::command]
fn open_file_dialog() -> Result<Option<FileInfo>, String> {
    let file = rfd::FileDialog::new()
        .add_filter("Markdown & HTML", &["md", "markdown", "html", "htm", "txt"])
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
fn save_file_as_dialog(
    default_name: Option<String>,
    default_dir: Option<String>,
    content: String,
) -> Result<Option<FileInfo>, String> {
    let mut dialog = rfd::FileDialog::new()
        .add_filter("Markdown & Text", &["md", "markdown", "txt"])
        .add_filter("HTML", &["html", "htm"]);
    if let Some(ref name) = default_name {
        dialog = dialog.set_file_name(name);
    }
    if let Some(ref dir) = default_dir {
        let dir_path = Path::new(dir);
        if dir_path.exists() && dir_path.is_dir() {
            dialog = dialog.set_directory(dir_path);
        }
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

#[tauri::command]
fn export_html_dialog(
    default_name: Option<String>,
    default_dir: Option<String>,
    content: String,
) -> Result<Option<String>, String> {
    let mut dialog = rfd::FileDialog::new().add_filter("HTML Document", &["html", "htm"]);
    if let Some(ref name) = default_name {
        dialog = dialog.set_file_name(name);
    }
    if let Some(ref dir) = default_dir {
        let dir_path = Path::new(dir);
        if dir_path.exists() && dir_path.is_dir() {
            dialog = dialog.set_directory(dir_path);
        }
    }

    let file = dialog.save_file();

    if let Some(path_buf) = file {
        let path_str = path_buf.to_string_lossy().to_string();
        fs::write(&path_buf, &content).map_err(|e| e.to_string())?;
        Ok(Some(path_str))
    } else {
        Ok(None)
    }
}

fn encode_base64(bytes: &[u8]) -> String {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity(((bytes.len() + 2) / 3) * 4);
    for chunk in bytes.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = if chunk.len() > 1 { chunk[1] as u32 } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as u32 } else { 0 };
        let triple = (b0 << 16) | (b1 << 8) | b2;

        out.push(TABLE[((triple >> 18) & 0x3F) as usize] as char);
        out.push(TABLE[((triple >> 12) & 0x3F) as usize] as char);
        if chunk.len() > 1 {
            out.push(TABLE[((triple >> 6) & 0x3F) as usize] as char);
        } else {
            out.push('=');
        }
        if chunk.len() > 2 {
            out.push(TABLE[(triple & 0x3F) as usize] as char);
        } else {
            out.push('=');
        }
    }
    out
}

#[tauri::command]
fn pick_background_image() -> Result<Option<String>, String> {
    let file = rfd::FileDialog::new()
        .add_filter("Images", &["png", "jpg", "jpeg", "webp", "gif", "svg"])
        .pick_file();

    if let Some(path_buf) = file {
        let ext = path_buf
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("png")
            .to_lowercase();
        let mime = match ext.as_str() {
            "jpg" | "jpeg" => "image/jpeg",
            "webp" => "image/webp",
            "gif" => "image/gif",
            "svg" => "image/svg+xml",
            _ => "image/png",
        };
        let bytes = fs::read(&path_buf).map_err(|e| e.to_string())?;
        let b64 = encode_base64(&bytes);
        Ok(Some(format!("data:{};base64,{}", mime, b64)))
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn start_window_drag(window: tauri::Window) -> Result<(), String> {
    window.start_dragging().map_err(|e| e.to_string())
}

#[tauri::command]
fn center_window_horizontally(window: tauri::Window) -> Result<(), String> {
    if let Ok(Some(monitor)) = window.current_monitor() {
        let screen_pos = monitor.position();
        let screen_size = monitor.size();
        if let Ok(win_size) = window.outer_size() {
            // 창의 세로 크기를 모니터 최대 세로 크기로 조정
            let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
                width: win_size.width,
                height: screen_size.height,
            }));

            // 가로 중앙 정렬 및 화면 최상단(y) 배치
            let centered_x =
                screen_pos.x + ((screen_size.width as i32 - win_size.width as i32) / 2);
            let target_y = screen_pos.y;

            window
                .set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                    x: centered_x,
                    y: target_y,
                }))
                .map_err(|e| e.to_string())?;
            return Ok(());
        }
    }
    window.center().map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            open_file_dialog,
            open_folder_dialog,
            read_folder_tree,
            read_file,
            save_file,
            save_file_as_dialog,
            export_html_dialog,
            pick_background_image,
            start_window_drag,
            center_window_horizontally
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
