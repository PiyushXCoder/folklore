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

/// Prefer the window manager's own decorations over GTK's client-side ones on Linux.
///
/// GTK3 draws its own titlebar (CSD) by default. It ignores the WM/desktop theme, duplicates the
/// title the WM already shows (and goes stale — `set_title` updates the Wayland toplevel but not
/// GTK's own headerbar label), and under a tiling WM it eats a row of pixels nothing asked for.
///
/// `GTK_CSD=0` is GTK's own opt-out, so the WM decorates the window instead. Must be set before
/// GTK initializes, hence the first line of `run()`. Only a default — an explicit `GTK_CSD` in
/// the environment still wins.
///
/// **X11 only.** `gtk_window_should_use_csd()` returns TRUE unconditionally for a Wayland display
/// *before* it reads `GTK_CSD` — GTK3 never implemented the `xdg-decoration` protocol, so it has
/// no server-side path there at all and the variable is silently ignored (verified on niri: the
/// GTK titlebar still rendered with `GTK_CSD=0` set). See `undecorate_on_wayland` for that case.
#[cfg(target_os = "linux")]
fn prefer_server_side_decorations() {
    if std::env::var_os("GTK_CSD").is_none() {
        std::env::set_var("GTK_CSD", "0");
    }
}

/// True when GTK will pick its Wayland backend, and therefore force CSD (see above).
///
/// `GDK_BACKEND` is checked first because it overrides backend selection — a Wayland session with
/// `GDK_BACKEND=x11` runs through XWayland, where `GTK_CSD=0` does work and the WM decorates us.
#[cfg(target_os = "linux")]
fn gtk_will_force_csd() -> bool {
    match std::env::var("GDK_BACKEND") {
        Ok(backend) if !backend.is_empty() => backend.split(',').any(|b| b == "wayland"),
        _ => std::env::var_os("WAYLAND_DISPLAY").is_some(),
    }
}

/// Drops decorations entirely on Wayland, since GTK3's only alternative is to draw them itself.
///
/// Not a compromise so much as the sole remaining choice: it's GTK's titlebar or none, and none is
/// what "don't prefer CSD" means in practice — the compositor frames and labels the window (niri,
/// Hyprland, sway draw their own border and show the toplevel title). On a *floating* Wayland
/// compositor this leaves no titlebar to drag or close by mouse; the native menu bar's File → Quit,
/// the About window's own Close button, and the compositor's move/resize bindings (usually
/// Super+drag) cover it.
///
/// Applies to every window, not just `main` — the About window is a second real toplevel and would
/// otherwise be the one thing in the app still wearing a GTK titlebar. It exists only after the
/// user opens it, hence the `tauri://window-created` listener alongside the initial sweep.
#[cfg(target_os = "linux")]
fn undecorate_on_wayland(app: &tauri::App) {
    use tauri::{Listener, Manager};

    if !gtk_will_force_csd() {
        return;
    }

    for window in app.webview_windows().values() {
        let _ = window.set_decorations(false);
    }

    let handle = app.handle().clone();
    app.listen_any("tauri://window-created", move |event| {
        #[derive(serde::Deserialize)]
        struct Created {
            label: String,
        }
        if let Ok(created) = serde_json::from_str::<Created>(event.payload()) {
            if let Some(window) = handle.get_webview_window(&created.label) {
                let _ = window.set_decorations(false);
            }
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "linux")]
    prefer_server_side_decorations();

    let launch_path = std::env::args().nth(1).filter(|a| !a.starts_with('-'));

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .manage(LaunchPath(Mutex::new(launch_path)))
        .manage(Watchers(Mutex::new(HashMap::new())))
        .setup(|app| {
            #[cfg(target_os = "linux")]
            undecorate_on_wayland(app);
            let _ = app;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_launch_path,
            read_file_bytes,
            watch_path,
            unwatch_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
