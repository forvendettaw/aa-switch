use serde::{Deserialize, Serialize};
use std::process::Command;
use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuEvent, MenuItem, PredefinedMenuItem, Submenu},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, State,
};

// State to track current persona
pub struct AppState {
    pub current_persona: Mutex<String>,
    pub gateway_running: Mutex<bool>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            current_persona: Mutex::new("coder".to_string()),
            gateway_running: Mutex::new(false),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Status {
    pub active_persona: String,
    pub running: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Persona {
    pub name: String,
    pub active: bool,
}

// Get available personas from the personas directory
fn get_available_personas() -> Vec<String> {
    let home = std::env::var("HOME").unwrap_or_else(|_| "~".to_string());
    let persona_dir = format!("{}/.aa-switch/personas", home);

    let mut personas = Vec::new();

    if let Ok(entries) = std::fs::read_dir(&persona_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().map_or(false, |e| e == "md") {
                if let Some(name) = path.file_stem() {
                    personas.push(name.to_string_lossy().to_string());
                }
            }
        }
    }

    // Default personas if directory doesn't exist
    if personas.is_empty() {
        personas.push("coder".to_string());
        personas.push("monica".to_string());
    }

    personas.sort();
    personas
}

// Execute aa-switch CLI command
fn run_aa_switch_command(args: &[&str]) -> Result<String, String> {
    let output = Command::new("aa-switch")
        .args(args)
        .output()
        .map_err(|e| format!("Failed to execute aa-switch: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

// Start the gateway in background
fn start_gateway() -> Result<(), String> {
    // Check if already running by checking if we can connect
    let output = Command::new("curl")
        .args(["-s", "http://127.0.0.1:8080/health"])
        .output();

    if output.is_ok() && output.unwrap().status.success() {
        return Ok(()); // Already running
    }

    // Start in background using nohup
    Command::new("sh")
        .args(["-c", "nohup aa-switch start > /dev/null 2>&1 &"])
        .spawn()
        .map_err(|e| format!("Failed to start gateway: {}", e))?;

    Ok(())
}

// Get current status
#[tauri::command]
fn get_status(state: State<'_, AppState>) -> Result<Status, String> {
    let current_persona = state.current_persona.lock().unwrap().clone();
    let running = *state.gateway_running.lock().unwrap();

    Ok(Status {
        active_persona: current_persona,
        running,
    })
}

// Get available personas
#[tauri::command]
fn get_personas(state: State<'_, AppState>) -> Result<Vec<Persona>, String> {
    let current = state.current_persona.lock().unwrap().clone();
    let personas = get_available_personas();

    Ok(personas
        .into_iter()
        .map(|name| Persona {
            name: name.clone(),
            active: name == current,
        })
        .collect())
}

// Switch persona
#[tauri::command]
fn switch_persona(name: String, state: State<'_, AppState>) -> Result<(), String> {
    // Ensure gateway is running
    if !*state.gateway_running.lock().unwrap() {
        start_gateway()?;
        *state.gateway_running.lock().unwrap() = true;
    }

    // Run the CLI command
    run_aa_switch_command(&["use", &name])?;

    // Update state
    *state.current_persona.lock().unwrap() = name;

    Ok(())
}

pub fn run_tray() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            get_status,
            get_personas,
            switch_persona
        ])
        .setup(|app| {
            let app_handle = app.handle().clone();

            // Start gateway on app startup
            if let Err(e) = start_gateway() {
                eprintln!("Warning: Failed to start gateway: {}", e);
            } else {
                if let Some(state) = app_handle.try_state::<AppState>() {
                    *state.gateway_running.lock().unwrap() = true;
                }
            }

            // Build tray menu
            let quit = PredefinedMenuItem::quit(app, Some("Quit"))?;
            let sep = PredefinedMenuItem::separator(app)?;

            // Create persona menu items
            let personas = get_available_personas();
            let mut persona_items: Vec<MenuItem<tauri::Wry>> = Vec::new();
            for name in personas {
                let item = MenuItem::with_id(
                    app,
                    &format!("persona_{}", name),
                    &name,
                    true,
                    None::<&str>,
                )?;
                persona_items.push(item);
            }

            // Build menu items as trait objects
            let status = MenuItem::with_id(app, "status", "Status: Running", false, None::<&str>)?;

            // Convert persona menu items to trait object references
            let persona_refs: Vec<&dyn tauri::menu::IsMenuItem<tauri::Wry>> = persona_items
                .iter()
                .map(|i| i as &dyn tauri::menu::IsMenuItem<tauri::Wry>)
                .collect();

            let persona_submenu = Submenu::with_items(
                app,
                "Switch Persona",
                true,
                &persona_refs,
            )?;

            let menu = Menu::with_items(
                app,
                &[
                    &status as &dyn tauri::menu::IsMenuItem<tauri::Wry>,
                    &persona_submenu as &dyn tauri::menu::IsMenuItem<tauri::Wry>,
                    &sep as &dyn tauri::menu::IsMenuItem<tauri::Wry>,
                    &quit as &dyn tauri::menu::IsMenuItem<tauri::Wry>,
                ],
            )?;

            // Create tray icon
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(move |app, event| {
                    handle_menu_event(app, event, app_handle.clone());
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn handle_menu_event(app: &AppHandle, event: MenuEvent, app_handle: AppHandle) {
    let id = event.id().as_ref();

    if id == "quit" {
        app.exit(0);
    } else if id.starts_with("persona_") {
        let persona = id.strip_prefix("persona_").unwrap_or("");
        if !persona.is_empty() {
            // Switch persona
            let persona = persona.to_string();
            let handle = app_handle.clone();

            std::thread::spawn(move || {
                if let Err(e) = run_aa_switch_command(&["use", &persona]) {
                    eprintln!("Failed to switch persona: {}", e);
                }

                // Update state
                if let Some(state) = handle.try_state::<AppState>() {
                    *state.current_persona.lock().unwrap() = persona.clone();
                    *state.gateway_running.lock().unwrap() = true;
                }

                // Emit event to frontend
                let _ = handle.emit("tray-persona-clicked", serde_json::json!({ "persona": persona }));
            });
        }
    }
}
