use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use std::collections::HashMap;
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

struct LaunchPath(Mutex<Option<String>>);

/// The path folklore was launched with (`folklore some.superlore`), consumed once by the
/// frontend on startup. `None` after the first read or when launched with no file arg.
#[tauri::command]
fn get_launch_path(state: State<LaunchPath>) -> Option<String> {
    state.0.lock().unwrap().take()
}

/// Reads a file the user picked via dialog, dropped, or launched with. A custom command, not a
/// plugin command, so it isn't subject to the fs-plugin capability scope.
#[tauri::command]
fn read_file_bytes(path: String) -> Result<Vec<u8>, String> {
    std::fs::read(&path).map_err(|e| e.to_string())
}

/// Live file watchers, keyed by an id handed back to the frontend. Custom commands built directly
/// on `notify`, not the fs plugin's `watch`/`unwatch` — those are ACL-scoped, and this app must be
/// able to watch whatever arbitrary path the user opened (same reasoning as `read_file_bytes`).
struct Watchers(Mutex<HashMap<u32, RecommendedWatcher>>);
static NEXT_WATCH_ID: AtomicU32 = AtomicU32::new(1);

/// Watches `path` for changes, emitting `file-changed:<id>` on modify/create/remove. The frontend
/// listens for that event and drops the watcher via `unwatch_path` when done.
///
/// Watches the **parent directory**, not the file itself, and filters by filename. Many editors
/// (vim, VS Code's atomic save, etc.) save by writing a temp file and `rename()`-ing it over the
/// original — that replaces the inode, so a watch on the file's own path goes dead after the
/// first save (the watched inode is gone; only a directory watch keeps seeing the new one).
#[tauri::command]
fn watch_path(app: AppHandle, watchers: State<Watchers>, path: String) -> Result<u32, String> {
    let id = NEXT_WATCH_ID.fetch_add(1, Ordering::SeqCst);
    let event_name = format!("file-changed:{id}");
    let target = std::path::Path::new(&path);
    let file_name = target.file_name().map(|n| n.to_os_string());
    let dir = target.parent().unwrap_or(target).to_path_buf();

    let mut watcher = notify::recommended_watcher(move |res: notify::Result<notify::Event>| {
        let Ok(event) = res else { return };
        if !(event.kind.is_modify() || event.kind.is_create() || event.kind.is_remove()) {
            return;
        }
        let matches = match &file_name {
            Some(name) => event.paths.iter().any(|p| p.file_name() == Some(name.as_os_str())),
            None => true,
        };
        if matches {
            let _ = app.emit(&event_name, ());
        }
    })
    .map_err(|e| e.to_string())?;

    watcher
        .watch(&dir, RecursiveMode::NonRecursive)
        .map_err(|e| e.to_string())?;

    watchers.0.lock().unwrap().insert(id, watcher);
    Ok(id)
}

#[tauri::command]
fn unwatch_path(watchers: State<Watchers>, id: u32) {
    watchers.0.lock().unwrap().remove(&id);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let launch_path = std::env::args().nth(1).filter(|a| !a.starts_with('-'));

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .manage(LaunchPath(Mutex::new(launch_path)))
        .manage(Watchers(Mutex::new(HashMap::new())))
        .invoke_handler(tauri::generate_handler![
            get_launch_path,
            read_file_bytes,
            watch_path,
            unwatch_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
