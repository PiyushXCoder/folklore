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

/// Watches `path` for changes, emitting `file-changed:<id>` (payload: the path) on modify/create.
/// The frontend listens for that event and drops the watcher via `unwatch_path` when done.
#[tauri::command]
fn watch_path(app: AppHandle, watchers: State<Watchers>, path: String) -> Result<u32, String> {
    let id = NEXT_WATCH_ID.fetch_add(1, Ordering::SeqCst);
    let event_name = format!("file-changed:{id}");

    let mut watcher = notify::recommended_watcher(move |res: notify::Result<notify::Event>| {
        let Ok(event) = res else { return };
        if event.kind.is_modify() || event.kind.is_create() {
            let _ = app.emit(&event_name, ());
        }
    })
    .map_err(|e| e.to_string())?;

    watcher
        .watch(std::path::Path::new(&path), RecursiveMode::NonRecursive)
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
