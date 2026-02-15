use std::path::PathBuf;
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
use tauri::Manager;

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

            let (mut rx, _child) = app
                .shell()
                .sidecar("bun")
                .expect("failed to create bun command")
                .args([api_server_path.to_str().expect("api-server path")])
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

            // Wait for server to start (adjust timing as needed)
            std::thread::sleep(std::time::Duration::from_millis(1500));

            Ok(())
        })
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}