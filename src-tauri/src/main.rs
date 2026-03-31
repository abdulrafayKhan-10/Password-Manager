// Main entry point for the Tauri desktop application

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    password_manager_lib::run();
}
