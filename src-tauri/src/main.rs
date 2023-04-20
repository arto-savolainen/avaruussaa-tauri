// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn main() {
    tauri::Builder::default()
    .setup(|app| {
      #[cfg(debug_assertions)] // only include this code on debug builds
      {
        let window = app.get_window("main").unwrap();
        window.open_devtools();
        window.close_devtools();
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![greet])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

// .setup(|app| {
//   let maybe_app_settings = app
//       .path_resolver()
//       .app_config_dir()
//       .map(|dir| dir.join("settings.json"))
//       .and_then(|path| std::fs::read_to_string(path).ok())
//       .and_then(|json_string| serde_json::from_str::<AppSettings>(&json_string).ok());

//   app.manage(Mutex::new(maybe_app_settings.unwrap_or_default()));

//   Ok(())
// })