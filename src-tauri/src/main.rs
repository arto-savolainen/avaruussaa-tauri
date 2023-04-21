// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use tauri::{SystemTray, CustomMenuItem, SystemTrayMenu, SystemTrayMenuItem, SystemTrayEvent};

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn toggle_tray(test: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", test)
}

fn main() {

  // here `"quit".to_string()` defines the menu item id, and the second parameter is the menu item label.
  let show = CustomMenuItem::new("show".to_string(), "Show");
  let quit = CustomMenuItem::new("quit".to_string(), "Quit");
  let tray_menu = SystemTrayMenu::new()
  .add_item(show)
  .add_native_item(SystemTrayMenuItem::Separator)
  .add_item(quit);

  let tray = SystemTray::new().with_menu(tray_menu);


  tauri::Builder::default()
    .system_tray(tray)

    .on_system_tray_event(|app, event| match event {
      SystemTrayEvent::DoubleClick {
        position: _,
        size: _,
        ..
      } => {
        let window = app.get_window("main").unwrap();
        window.show().unwrap();
        window.unminimize().unwrap();
        // let tray_handle = app.tray_handle();
        // tray_handle.destroy();
      }
      SystemTrayEvent::MenuItemClick { id, .. } => {
        match id.as_str() {
          "quit" => {
            std::process::exit(0);
          }
          "show" => {
            let window = app.get_window("main").unwrap();
            window.show().unwrap();
            window.unminimize().unwrap();
            // let tray_handle = app.tray_handle();
            // tray_handle.destroy();
          }
          _ => {}
        }
      }
      _ => {}
    })

    .setup(|app| {
      #[cfg(debug_assertions)] // only include this code on debug builds
      {
        let window = app.get_window("main").unwrap();
        window.open_devtools();
        window.close_devtools();
      }
      Ok(())
    })

    .invoke_handler(tauri::generate_handler![toggle_tray])

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