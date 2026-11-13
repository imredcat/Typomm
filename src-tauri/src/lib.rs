use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use tauri_plugin_opener::OpenerExt;

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

        // .git, .DS_Store 및 대용량 빌드/패키지 캐시 폴더만 제외하고 모든 파일 표시
        if file_name == ".git"
            || file_name == ".DS_Store"
            || file_name == "node_modules"
            || file_name == "target"
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
            nodes.push(FolderNode {
                name: file_name,
                path: path_str,
                is_dir: false,
                children: None,
            });
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

fn read_path_content(path: &Path) -> Result<String, String> {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let binary_mime = match ext.as_str() {
        "pdf" => Some("application/pdf"),
        "png" => Some("image/png"),
        "jpg" | "jpeg" => Some("image/jpeg"),
        "gif" => Some("image/gif"),
        "webp" => Some("image/webp"),
        "svg" => Some("image/svg+xml"),
        "bmp" => Some("image/bmp"),
        "ico" => Some("image/x-icon"),
        _ => None,
    };

    if let Some(mime) = binary_mime {
        let bytes = fs::read(path).map_err(|e| e.to_string())?;
        let b64 = encode_base64(&bytes);
        Ok(format!("data:{};base64,{}", mime, b64))
    } else {
        fs::read_to_string(path).map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn open_file_dialog() -> Result<Option<FileInfo>, String> {
    let file = rfd::FileDialog::new()
        .add_filter(
            "Supported Files",
            &[
                "md", "markdown", "txt", "html", "htm", "mhtml", "css", "js", "php", "pdf",
                "png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico",
            ],
        )
        .pick_file();

    if let Some(path_buf) = file {
        let path_str = path_buf.to_string_lossy().to_string();
        let name = path_buf
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "Untitled.md".to_string());

        let content = read_path_content(&path_buf)?;

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

    let content = read_path_content(path_buf)?;

    Ok(FileInfo {
        path,
        name,
        content,
    })
}

#[tauri::command]
fn read_binary_file(path: String) -> Result<tauri::ipc::Response, String> {
    let bytes = fs::read(&path).map_err(|e| e.to_string())?;
    Ok(tauri::ipc::Response::new(bytes))
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

fn open_path_preferring_chromium(app: &tauri::AppHandle, target_path: &str) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let chromium_apps = [
            ("/Applications/Google Chrome.app", "Google Chrome"),
            ("/Applications/Chromium.app", "Chromium"),
            ("/Applications/Microsoft Edge.app", "Microsoft Edge"),
            ("/Applications/Brave Browser.app", "Brave Browser"),
            ("/Applications/Arc.app", "Arc"),
        ];
        for (app_path, app_name) in chromium_apps {
            if Path::new(app_path).exists() {
                if std::process::Command::new("open")
                    .args(["-a", app_name, target_path])
                    .spawn()
                    .is_ok()
                {
                    return Ok(());
                }
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        let mut candidates: Vec<std::path::PathBuf> = Vec::new();
        for env_key in ["PROGRAMFILES", "PROGRAMFILES(X86)", "LOCALAPPDATA"] {
            if let Ok(base) = std::env::var(env_key) {
                let base_path = Path::new(&base);
                candidates.push(base_path.join("Google\\Chrome\\Application\\chrome.exe"));
                candidates.push(base_path.join("Chromium\\Application\\chrome.exe"));
                candidates.push(base_path.join("Microsoft\\Edge\\Application\\msedge.exe"));
                candidates.push(base_path.join("BraveSoftware\\Brave-Browser\\Application\\brave.exe"));
            }
        }
        for exe in candidates {
            if exe.exists() {
                if std::process::Command::new(&exe).arg(target_path).spawn().is_ok() {
                    return Ok(());
                }
            }
        }
    }

    app.opener()
        .open_path(target_path, None::<&str>)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn open_in_system_browser(
    app: tauri::AppHandle,
    path: Option<String>,
    content: String,
    file_name: String,
) -> Result<(), String> {
    if let Some(ref p) = path {
        let p_buf = Path::new(p);
        if p_buf.exists() && p_buf.is_file() {
            return open_path_preferring_chromium(&app, p);
        }
    }

    let safe_name: String = file_name
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '.' || c == '-' || c == '_' {
                c
            } else {
                '_'
            }
        })
        .collect();
    let lower = safe_name.to_lowercase();
    let final_name = if lower.ends_with(".html") || lower.ends_with(".htm") || lower.ends_with(".mhtml") {
        safe_name
    } else {
        format!("{}.html", safe_name)
    };

    let temp_path = std::env::temp_dir().join(format!("typomm_preview_{}", final_name));
    fs::write(&temp_path, content).map_err(|e| e.to_string())?;
    let temp_str = temp_path.to_string_lossy().to_string();
    open_path_preferring_chromium(&app, &temp_str)
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
            read_binary_file,
            save_file,
            save_file_as_dialog,
            export_html_dialog,
            pick_background_image,
            start_window_drag,
            center_window_horizontally,
            open_in_system_browser
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
