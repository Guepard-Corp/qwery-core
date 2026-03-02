use std::path::PathBuf;
use tauri::Manager;
use tauri_plugin_shell::process::CommandEvent;

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
use tauri_plugin_shell::ShellExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let resource_dir = app.path()
                .resolve("", tauri::path::BaseDirectory::Resource)
                .expect("failed to resolve resource dir");
            let node_modules_path = resource_dir.join("node_modules");

            println!("Node modules path: {}", node_modules_path.to_str().unwrap());

            // API server is a JS bundle - run it with Bun sidecar
            let target = target_triple();
            let api_server_name = format!("api-server-{}", target);
            let api_server_path: PathBuf = if cfg!(debug_assertions) {
                // Dev: binaries are in src-tauri/binaries/
                PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("binaries").join(&api_server_name)
            } else {
                // Prod: sidecars are next to the executable
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

            // Load .env from app root so API server gets AZURE_* etc. (Tauri may not inherit from dotenv-cli)
            let env_path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..").join(".env");
            let _ = dotenvy::from_path(env_path);

            let (mut rx, _child) = app
                .shell()
                .sidecar("bun")
                .expect("failed to create bun command")
                .args([api_server_path.to_str().expect("api-server path")])
                .envs(std::env::vars_os())
                .env("QWERY_STORAGE_DIR", storage_dir.to_str().expect("storage path"))
                .env("VITE_QWERY_RUNTIME", "DESKTOP")
                .env("LOGGER", "pino")
                .spawn()
                .expect("Failed to spawn API server");

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
            tauri::async_runtime::spawn(async move {
                use std::net::TcpStream;
                use std::time::Duration;
                
                let max_attempts = 30;
                let delay_ms = 200;

                for attempt in 1..=max_attempts {
                    match TcpStream::connect_timeout(
                        &"127.0.0.1:4096".parse().unwrap(),
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

            Ok(())
        })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}