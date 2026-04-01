// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod tray;

use tray::run_tray;

fn main() {
    // Run the tray and setup
    run_tray();
}
