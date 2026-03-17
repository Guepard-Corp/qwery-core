use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::process::Command;
use std::io::Write;
use tauri::Manager;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use keyring::Entry;
use tauri_plugin_shell::ShellExt;

fn target_triple() -> &'static str {
    #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
    return "aarch64-apple-darwin";
    #[cfg(all(target_os = "macos", target_arch = "x86_64"))]
    return "x86_64-apple-darwin";
    #[cfg(all(target_os = "windows", target_arch = "x86_64"))]
    return "x86_64-pc-windows-msvc";
    #[cfg(all(target_os = "linux", target_arch = "aarch64"))]
    return "aarch64-unknown-linux-gnu";
    #[cfg(all(target_os = "linux", target_arch = "x86_64"))]
    return "x86_64-unknown-linux-gnu";
    #[allow(unreachable_code)]
    "aarch64-apple-darwin" // fallback
}

#[cfg(target_os = "windows")]
fn configure_webview_zoom() {
    const ARGS: &str =
        "--disable-pinch --disable-features=OverscrollHistoryNavigation,msExperimentalScrolling";
    std::env::set_var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", ARGS);
}

#[cfg(not(target_os = "windows"))]
fn configure_webview_zoom() {}

const SERVICE_NAME: &str = "run.qwery.desktop";

fn keyring_entry(key: &str) -> Result<Entry, String> {
    #[cfg(target_os = "windows")]
    {
        // On Windows, the credential store key is primarily the "target".
        // If we reuse the same target for all variables, they overwrite each other.
        // Make the target unique per env var key but stable across runs.
        let target = format!("{SERVICE_NAME}/{key}");
        Entry::new_with_target(&target, SERVICE_NAME, "desktop")
            .map_err(|e| format!("keyring init error: {e}"))
    }
    #[cfg(not(target_os = "windows"))]
    {
        Entry::new(SERVICE_NAME, key).map_err(|e| format!("keyring init error: {e}"))
    }
}

#[cfg(target_os = "windows")]
fn keyring_entry_legacy(key: &str) -> Result<Entry, String> {
    // Previous behavior: service=user mapping only. Keep as legacy read/migrate path.
    Entry::new(SERVICE_NAME, key).map_err(|e| format!("keyring init error: {e}"))
}

#[cfg(target_os = "windows")]
fn keyring_entry_legacy_shared_target(key: &str) -> Result<Entry, String> {
    // Broken legacy behavior: all keys shared the same target so values overwrite.
    // Keep only for delete cleanup; do NOT migrate from this.
    Entry::new_with_target(SERVICE_NAME, SERVICE_NAME, key)
        .map_err(|e| format!("keyring init error: {e}"))
}

fn log_path(app: &tauri::AppHandle) -> Option<PathBuf> {
    app.path().app_config_dir().ok().map(|d| d.join("desktop.log"))
}

fn append_log_line(app: &tauri::AppHandle, line: &str) {
    let Some(path) = log_path(app) else { return };
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let Ok(mut f) = fs::OpenOptions::new().create(true).append(true).open(&path) else {
        return;
    };
    let _ = writeln!(f, "{line}");
}

#[tauri::command]
fn save_api_key(app: tauri::AppHandle, key: String, value: String) -> Result<(), String> {
    append_log_line(&app, &format!("desktop:save_api_key key={key} value_len={}", value.len()));
    let entry = keyring_entry(&key)?;
    entry
        .set_password(&value)
        .map_err(|e| {
            append_log_line(&app, &format!("desktop:save_api_key key={key} status=error err={e}"));
            format!("keyring write error: {e}")
        })?;

    // Verify it actually persisted (catches backend issues early).
    match entry.get_password() {
        Ok(v) if v == value => {
            append_log_line(&app, &format!("desktop:save_api_key key={key} status=ok"));
            #[cfg(target_os = "windows")]
            {
                // Best-effort cleanup of legacy location if it exists.
                if let Ok(legacy) = keyring_entry_legacy(&key) {
                    let _ = legacy.delete_credential();
                }
                if let Ok(shared) = keyring_entry_legacy_shared_target(&key) {
                    let _ = shared.delete_credential();
                }
            }
            Ok(())
        }
        Ok(_) => {
            append_log_line(&app, &format!("desktop:save_api_key key={key} status=verify_mismatch"));
            Err("keyring verify mismatch".to_string())
        }
        Err(e) => {
            append_log_line(&app, &format!("desktop:save_api_key key={key} status=verify_error err={e}"));
            Err(format!("keyring verify error: {e}"))
        }
    }
}

#[tauri::command]
fn get_api_key(app: tauri::AppHandle, key: String) -> Result<Option<String>, String> {
    append_log_line(&app, &format!("desktop:get_api_key key={key}"));
    let entry = keyring_entry(&key)?;
    match entry.get_password() {
        Ok(v) => {
            append_log_line(&app, &format!("desktop:get_api_key key={key} status=set len={}", v.len()));
            Ok(Some(v))
        }
        Err(keyring::Error::NoEntry) => {
            #[cfg(target_os = "windows")]
            {
                // Legacy fallback + migrate: if credentials exist under the old scheme,
                // copy them into the new target-based entry so subsequent reads work.
                if let Ok(legacy) = keyring_entry_legacy(&key) {
                    match legacy.get_password() {
                        Ok(v) => {
                            append_log_line(&app, &format!("desktop:get_api_key key={key} status=legacy_set len={}", v.len()));
                            if !v.is_empty() {
                                if let Ok(primary) = keyring_entry(&key) {
                                    let _ = primary.set_password(&v);
                                }
                            }
                            let _ = legacy.delete_credential();
                            return Ok(Some(v));
                        }
                        Err(keyring::Error::NoEntry) => {}
                        Err(e) => {
                            append_log_line(&app, &format!("desktop:get_api_key key={key} status=legacy_error err={e}"));
                        }
                    }
                }
            }
            append_log_line(&app, &format!("desktop:get_api_key key={key} status=missing"));
            Ok(None)
        }
        Err(e) => {
            append_log_line(&app, &format!("desktop:get_api_key key={key} status=error err={e}"));
            Err(format!("keyring read error: {e}"))
        }
    }
}

#[tauri::command]
fn delete_api_key(app: tauri::AppHandle, key: String) -> Result<(), String> {
    append_log_line(&app, &format!("desktop:delete_api_key key={key}"));
    let entry = keyring_entry(&key)?;
    entry
        .delete_credential()
        .or_else(|e| match e {
            keyring::Error::NoEntry => Ok(()),
            other => Err(other),
        })
        .map_err(|e| {
            append_log_line(&app, &format!("desktop:delete_api_key key={key} status=error err={e}"));
            format!("keyring delete error: {e}")
        })?;
    #[cfg(target_os = "windows")]
    {
        if let Ok(legacy) = keyring_entry_legacy(&key) {
            let _ = legacy.delete_credential();
        }
        if let Ok(shared) = keyring_entry_legacy_shared_target(&key) {
            let _ = shared.delete_credential();
        }
    }
    append_log_line(&app, &format!("desktop:delete_api_key key={key} status=ok"));
    Ok(())
}

#[tauri::command]
fn debug_keyring_status() -> HashMap<String, String> {
    let mut out = HashMap::new();
    for key in MANAGED_KEYS {
        let status = match keyring_entry(key) {
            Ok(entry) => match entry.get_password() {
                Ok(v) if !v.is_empty() => "set".to_string(),
                Ok(_) => "empty".to_string(),
                Err(keyring::Error::NoEntry) => "missing".to_string(),
                Err(e) => format!("error:{e}"),
            },
            Err(e) => format!("error:{e}"),
        };
        out.insert((*key).to_string(), status);
    }
    out
}

const MANAGED_KEYS: &[&str] = &[
    "AZURE_API_KEY",
    "AZURE_RESOURCE_NAME",
    "AZURE_OPENAI_DEPLOYMENT",
    "AZURE_API_VERSION",
    "AZURE_OPENAI_BASE_URL",
    "ANTHROPIC_API_KEY",
    "ANTHROPIC_BASE_URL",
    "OPENAI_API_KEY",
    "AGENT_PROVIDER",
    "DEFAULT_MODEL",
];

const CONFIG_KEYS: &[&str] = &[
    "USE_SCHEMA_EMBEDDING",
    "USE_RETRIEVAL",
    "USE_OPTIMIZED_PROMPT",
    "QWERY_TELEMETRY_ENABLED",
    "OTEL_EXPORTER_OTLP_ENDPOINT",
    "QWERY_EXPORT_APP_TELEMETRY",
    "QWERY_EXPORT_METRICS",
    "QWERY_TELEMETRY_DEBUG",
];

fn pick_port(preferred: u16) -> u16 {
    use std::net::TcpListener;
    if TcpListener::bind(("127.0.0.1", preferred)).is_ok() {
        return preferred;
    }
    TcpListener::bind(("127.0.0.1", 0))
        .ok()
        .and_then(|l| l.local_addr().ok().map(|a| a.port()))
        .unwrap_or(preferred)
}

fn pid_file_path(app: &tauri::AppHandle) -> Option<PathBuf> {
    app.path().app_config_dir().ok().map(|d| d.join("api-server.pid"))
}

fn kill_pid_best_effort(pid: u32) {
    #[cfg(target_os = "windows")]
    {
        let _ = Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .output();
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = Command::new("kill")
            .args(["-TERM", &pid.to_string()])
            .output();
        let _ = Command::new("kill")
            .args(["-KILL", &pid.to_string()])
            .output();
    }
}

fn kill_previous_api_server(app: &tauri::AppHandle) {
    let Some(pid_path) = pid_file_path(app) else { return };
    let Ok(raw) = fs::read_to_string(&pid_path) else { return };
    let Ok(pid) = raw.trim().parse::<u32>() else { return };
    kill_pid_best_effort(pid);
    let _ = fs::remove_file(&pid_path);
}

fn write_api_server_pid(app: &tauri::AppHandle, pid: u32) {
    let Some(pid_path) = pid_file_path(app) else { return };
    if let Some(parent) = pid_path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let _ = fs::write(pid_path, pid.to_string());
}

fn config_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("app_config_dir: {e}"))?;
    Ok(dir.join("config.json"))
}

#[tauri::command]
fn get_app_config(app: tauri::AppHandle) -> Result<HashMap<String, String>, String> {
    let path = config_path(&app)?;
    if !path.exists() {
        return Ok(HashMap::new());
    }
    let data = fs::read_to_string(&path).map_err(|e| format!("read config: {e}"))?;
    Ok(serde_json::from_str(&data).unwrap_or_else(|_| HashMap::new()))
}

#[tauri::command]
fn set_app_config(app: tauri::AppHandle, config: HashMap<String, String>) -> Result<(), String> {
    let path = config_path(&app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("create config dir: {e}"))?;
    }
    let data = serde_json::to_string_pretty(&config).map_err(|e| format!("serialize config: {e}"))?;
    fs::write(&path, data).map_err(|e| format!("write config: {e}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    configure_webview_zoom();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_handle = app.handle().clone();
            kill_previous_api_server(&app_handle);
            append_log_line(&app_handle, "desktop: starting");

            let resource_dir = app.path()
                .resolve("", tauri::path::BaseDirectory::Resource)
                .expect("failed to resolve resource dir");
            let node_modules_path = resource_dir.join("node_modules");
            let extensions_dir = if cfg!(debug_assertions) {
                PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                    .join("target")
                    .join("debug")
                    .join("extensions")
            } else {
                let from_resources = resource_dir.join("extensions");
                if from_resources.exists() {
                    from_resources
                } else {
                    let exe_dir = std::env::current_exe()
                        .ok()
                        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
                        .unwrap_or_else(|| resource_dir.clone());
                    exe_dir.join("extensions")
                }
            };

            println!("Node modules path: {}", node_modules_path.to_str().unwrap());

            // API server is a JS bundle - run it with Bun sidecar
            let target = target_triple();
            let base_name = format!("api-server-{}", target);

            // Dev (debug): use per‑triple name under src-tauri/binaries, same as build script
            let api_server_name = if cfg!(debug_assertions) {
                #[cfg(target_os = "windows")]
                {
                    format!("{base_name}.exe")
                }
                #[cfg(not(target_os = "windows"))]
                {
                    base_name
                }
            } else {
                // Prod: use plain "api-server.exe" next to qwery-app.exe on Windows,
                // and "api-server-<triple>" on other platforms if you want
                #[cfg(target_os = "windows")]
                {
                    "api-server.exe".to_string()
                }
                #[cfg(not(target_os = "windows"))]
                {
                    base_name
                }
            };

            let api_server_path: PathBuf = if cfg!(debug_assertions) {
                PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                    .join("binaries")
                    .join(&api_server_name)
            } else {
                let exe_dir = std::env::current_exe()
                    .expect("failed to get executable path")
                    .parent()
                    .expect("failed to get executable dir")
                    .to_path_buf();
                exe_dir.join(&api_server_name)
            };

            let storage_dir = app
                .path()
                .home_dir()
                .expect("failed to resolve home dir")
                .join(".qwery")
                .join("storage");

            let port = pick_port(4096);

            #[cfg(debug_assertions)]
            {
                let env_path =
                    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..").join(".env");
                let _ = dotenvy::from_path(env_path);
            }

            let mut cmd = app
                .shell()
                .sidecar("bun")
                .expect("failed to create bun command")
                .envs(std::env::vars_os())
                // Help Bun/Node resolve deps for extension drivers (e.g. `pg`).
                .env("NODE_PATH", node_modules_path.to_str().unwrap_or(""))
                .current_dir(&resource_dir);

            for key in MANAGED_KEYS {
                match keyring_entry(key) {
                    Ok(entry) => match entry.get_password() {
                        Ok(value) if !value.is_empty() => {
                            append_log_line(&app_handle, &format!("desktop:keyring {key}=set"));
                            cmd = cmd.env(key, value);
                        }
                        Ok(_) => {
                            append_log_line(&app_handle, &format!("desktop:keyring {key}=empty"));
                        }
                        Err(keyring::Error::NoEntry) => {
                            append_log_line(&app_handle, &format!("desktop:keyring {key}=missing"));
                        }
                        Err(e) => {
                            append_log_line(&app_handle, &format!("desktop:keyring {key}=error:{e}"));
                        }
                    },
                    Err(e) => {
                        append_log_line(&app_handle, &format!("desktop:keyring {key}=error:{e}"));
                    }
                }
            }

            if let Ok(dir) = app.path().app_config_dir() {
                let config_path = dir.join("config.json");
                if config_path.exists() {
                    if let Ok(data) = fs::read_to_string(&config_path) {
                        if let Ok(config) = serde_json::from_str::<HashMap<String, String>>(&data) {
                            for key in CONFIG_KEYS {
                                if let Some(value) = config.get(*key) {
                                    cmd = cmd.env(key, value);
                                }
                            }
                        }
                    }
                }
            }

            let (mut rx, child) = cmd
                .args([api_server_path.to_str().expect("api-server path")])
                .env("QWERY_STORAGE_DIR", storage_dir.to_str().expect("storage path"))
                .env(
                    "QWERY_EXTENSIONS_PATH",
                    extensions_dir.to_str().expect("extensions path"),
                )
                .env("HOSTNAME", "127.0.0.1")
                .env("PORT", port.to_string())
                .env("VITE_QWERY_RUNTIME", "DESKTOP")
                .env("LOGGER", "pino")
                .spawn()
                .expect("Failed to spawn API server");

            // Persist PID so we can kill it on next startup after crashes/hard-kills.
            write_api_server_pid(&app_handle, child.pid() as u32);

            let api_url = format!("http://127.0.0.1:{}/api", port);
            if let Some(window) = app.get_webview_window("main") {
                let js = format!(
                    "window.__QWERY_API_URL = {};",
                    serde_json::to_string(&api_url).unwrap_or_else(|_| "\"\"".to_string())
                );
                let _ = window.eval(&js);
            }

            // Optional: Log server output in development
            {
                let app_for_logs = app_handle.clone();
                tauri::async_runtime::spawn(async move {
                    while let Some(event) = rx.recv().await {
                        match event {
                            CommandEvent::Stdout(line) => {
                                let s = String::from_utf8_lossy(&line);
                                append_log_line(&app_for_logs, &format!("bun:stdout {s}"));
                            }
                            CommandEvent::Stderr(line) => {
                                let s = String::from_utf8_lossy(&line);
                                append_log_line(&app_for_logs, &format!("bun:stderr {s}"));
                            }
                            _ => {}
                        }
                    }
                });
            }

            // Wait for server to be ready by checking if port is listening
            let ready_port = port;
            tauri::async_runtime::spawn(async move {
                use std::net::TcpStream;
                use std::time::Duration;
                
                let max_attempts = 30;
                let delay_ms = 200;

                for attempt in 1..=max_attempts {
                    match TcpStream::connect_timeout(
                        &format!("127.0.0.1:{}", ready_port).parse().unwrap(),
                        Duration::from_millis(500),
                    ) {
                        Ok(_) => {
                            println!("API Server is ready (attempt {})", attempt);
                            return;
                        }
                        Err(_) => {
                            // Server not ready yet, continue polling
                        }
                    }

                    if attempt < max_attempts {
                        std::thread::sleep(Duration::from_millis(delay_ms));
                    }
                }

                eprintln!("Warning: API Server did not become ready after {} attempts", max_attempts);
            });

            // Give the server a moment to start before continuing
            // The port check will ensure readiness in the background
            std::thread::sleep(std::time::Duration::from_millis(500));

            // Track child and ensure we kill it on exit / window close.
            let child_state: Arc<Mutex<Option<CommandChild>>> =
                Arc::new(Mutex::new(Some(child)));
            if let Some(window) = app.get_webview_window("main") {
                let child_for_close = child_state.clone();
                let app_for_close = app.app_handle().clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { .. } = event {
                        if let Ok(mut guard) = child_for_close.lock() {
                            if let Some(child) = guard.take() {
                                let _ = child.kill();
                            }
                        }
                        // Best-effort cleanup of persisted pid file.
                        if let Some(pid_path) = pid_file_path(&app_for_close) {
                            let _ = fs::remove_file(pid_path);
                        }
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            save_api_key,
            get_api_key,
            delete_api_key,
            debug_keyring_status,
            get_app_config,
            set_app_config
        ])
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}