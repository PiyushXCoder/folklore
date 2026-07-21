use std::sync::Mutex;
use tauri::State;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let launch_path = std::env::args().nth(1).filter(|a| !a.starts_with('-'));

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .manage(LaunchPath(Mutex::new(launch_path)))
        .invoke_handler(tauri::generate_handler![get_launch_path, read_file_bytes])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
