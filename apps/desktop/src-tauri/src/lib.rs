use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::process::Command;
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
    Entry::new(SERVICE_NAME, key).map_err(|e| format!("keyring init error: {e}"))
}

#[tauri::command]
fn save_api_key(key: String, value: String) -> Result<(), String> {
    let entry = keyring_entry(&key)?;
    entry
        .set_password(&value)
        .map_err(|e| format!("keyring write error: {e}"))
}

#[tauri::command]
fn get_api_key(key: String) -> Result<Option<String>, String> {
    let entry = keyring_entry(&key)?;
    match entry.get_password() {
        Ok(v) => Ok(Some(v)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(format!("keyring read error: {e}")),
    }
}

#[tauri::command]
fn delete_api_key(key: String) -> Result<(), String> {
    let entry = keyring_entry(&key)?;
    entry
        .set_password("")
        .map_err(|e| format!("keyring delete error: {e}"))
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

            let resource_dir = app.path()
                .resolve("", tauri::path::BaseDirectory::Resource)
                .expect("failed to resolve resource dir");
            let node_modules_path = resource_dir.join("node_modules");
            let extensions_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .join("target")
                .join("debug")
                .join("extensions");

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
                .envs(std::env::vars_os());

            for key in MANAGED_KEYS {
                if let Ok(entry) = keyring_entry(key) {
                    if let Ok(value) = entry.get_password() {
                        if !value.is_empty() {
                            cmd = cmd.env(key, value);
                        }
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
            #[cfg(debug_assertions)]
            {
                tauri::async_runtime::spawn(async move {
                    while let Some(event) = rx.recv().await {
                        match event {
                            CommandEvent::Stdout(line) => {
                                println!("API Server: {}", String::from_utf8_lossy(&line));
                            }
                            CommandEvent::Stderr(line) => {
                                eprintln!("API Server Error: {}", String::from_utf8_lossy(&line));
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
            get_app_config,
            set_app_config
        ])
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}