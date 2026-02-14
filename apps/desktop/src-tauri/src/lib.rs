use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Start the Bun API server sidecar
            let (mut rx, _child) = app
                .shell()
                .sidecar("api-server")
                .expect("failed to create api-server command")
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