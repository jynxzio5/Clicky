// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use device_query::{DeviceQuery, DeviceState, Keycode};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{Emitter, Manager, State};
use windows::Win32::UI::Input::KeyboardAndMouse::{
    SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, INPUT_MOUSE, KEYBDINPUT, KEYBD_EVENT_FLAGS,
    KEYEVENTF_KEYUP, MOUSEEVENTF_ABSOLUTE, MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP,
    MOUSEEVENTF_MOVE, MOUSEEVENTF_RIGHTDOWN, MOUSEEVENTF_RIGHTUP, MOUSEEVENTF_XDOWN,
    MOUSEEVENTF_XUP, MOUSEINPUT, VIRTUAL_KEY,
};
use windows::Win32::UI::WindowsAndMessaging::{GetSystemMetrics, SM_CXSCREEN, SM_CYSCREEN};
use rand::Rng;
use serde::Serialize;

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

#[derive(Clone)]
struct ClickerState {
    running: bool,
    cps: u64,
    randomness: u64,
    humanization_enabled: bool,
    toggle_key: String,
    click_mode: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct MacroConfig {
    part1_key: String,
    part2_key: String,
    dodge_key: String,
    safe_pocket_x: i32,
    safe_pocket_y: i32,
    quick_use_x: i32,
    quick_use_y: i32,
    delay_ms: u64,
}

struct AppState {
    clicker: Arc<Mutex<ClickerState>>,
    macro_config: Arc<Mutex<MacroConfig>>,
    #[allow(dead_code)]
    macro_running: Arc<Mutex<bool>>,
}

#[derive(Clone, Serialize)]
struct ClickerPayload {
    running: bool,
    cps: u64,
    click_mode: String,
}

// ═══════════════════════════════════════════════════════════════════════════
// KEY MAPPING — JS KeyboardEvent.code → device_query Keycode (for detection)
// ═══════════════════════════════════════════════════════════════════════════

fn build_key_map() -> HashMap<String, Keycode> {
    let mut m = HashMap::new();
    // Letters
    for (js, kc) in [
        ("KeyA", Keycode::A), ("KeyB", Keycode::B), ("KeyC", Keycode::C),
        ("KeyD", Keycode::D), ("KeyE", Keycode::E), ("KeyF", Keycode::F),
        ("KeyG", Keycode::G), ("KeyH", Keycode::H), ("KeyI", Keycode::I),
        ("KeyJ", Keycode::J), ("KeyK", Keycode::K), ("KeyL", Keycode::L),
        ("KeyM", Keycode::M), ("KeyN", Keycode::N), ("KeyO", Keycode::O),
        ("KeyP", Keycode::P), ("KeyQ", Keycode::Q), ("KeyR", Keycode::R),
        ("KeyS", Keycode::S), ("KeyT", Keycode::T), ("KeyU", Keycode::U),
        ("KeyV", Keycode::V), ("KeyW", Keycode::W), ("KeyX", Keycode::X),
        ("KeyY", Keycode::Y), ("KeyZ", Keycode::Z),
    ] { m.insert(js.into(), kc); }
    // Digits
    for (js, kc) in [
        ("Digit0", Keycode::Key0), ("Digit1", Keycode::Key1), ("Digit2", Keycode::Key2),
        ("Digit3", Keycode::Key3), ("Digit4", Keycode::Key4), ("Digit5", Keycode::Key5),
        ("Digit6", Keycode::Key6), ("Digit7", Keycode::Key7), ("Digit8", Keycode::Key8),
        ("Digit9", Keycode::Key9),
    ] { m.insert(js.into(), kc); }
    // Function keys
    for (js, kc) in [
        ("F1", Keycode::F1), ("F2", Keycode::F2), ("F3", Keycode::F3), ("F4", Keycode::F4),
        ("F5", Keycode::F5), ("F6", Keycode::F6), ("F7", Keycode::F7), ("F8", Keycode::F8),
        ("F9", Keycode::F9), ("F10", Keycode::F10), ("F11", Keycode::F11), ("F12", Keycode::F12),
    ] { m.insert(js.into(), kc); }
    // Modifiers / special
    for (js, kc) in [
        ("ShiftLeft", Keycode::LShift), ("ShiftRight", Keycode::RShift),
        ("ControlLeft", Keycode::LControl), ("ControlRight", Keycode::RControl),
        ("AltLeft", Keycode::LAlt), ("AltRight", Keycode::RAlt),
        ("Space", Keycode::Space), ("Enter", Keycode::Enter),
        ("Escape", Keycode::Escape), ("Backspace", Keycode::Backspace),
        ("Tab", Keycode::Tab), ("CapsLock", Keycode::CapsLock),
    ] { m.insert(js.into(), kc); }
    m
}

// ═══════════════════════════════════════════════════════════════════════════
// VK MAPPING — JS KeyboardEvent.code → Windows Virtual Key code (for simulation)
// ═══════════════════════════════════════════════════════════════════════════

fn js_code_to_vk(code: &str) -> Option<u16> {
    // Letters: KeyA=0x41, KeyB=0x42, ...
    if code.starts_with("Key") && code.len() == 4 {
        let c = code.as_bytes()[3];
        if c.is_ascii_uppercase() {
            return Some(c as u16);
        }
    }
    // Digits: Digit0=0x30, Digit1=0x31, ...
    if code.starts_with("Digit") && code.len() == 6 {
        let c = code.as_bytes()[5];
        if c.is_ascii_digit() {
            return Some(c as u16);
        }
    }
    match code {
        "AltLeft" | "AltRight" => Some(0x12),   // VK_MENU
        "ControlLeft" | "ControlRight" => Some(0x11), // VK_CONTROL
        "ShiftLeft" | "ShiftRight" => Some(0x10), // VK_SHIFT
        "Space" => Some(0x20),
        "Tab" => Some(0x09),
        "Enter" => Some(0x0D),
        "Escape" => Some(0x1B),
        "CapsLock" => Some(0x14),
        "Backspace" => Some(0x08),
        "F1" => Some(0x70), "F2" => Some(0x71), "F3" => Some(0x72), "F4" => Some(0x73),
        "F5" => Some(0x74), "F6" => Some(0x75), "F7" => Some(0x76), "F8" => Some(0x77),
        "F9" => Some(0x78), "F10" => Some(0x79), "F11" => Some(0x7A), "F12" => Some(0x7B),
        _ => None,
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MOUSE HELPERS
// ═══════════════════════════════════════════════════════════════════════════

fn send_mouse_down() {
    unsafe {
        let input = INPUT {
            r#type: INPUT_MOUSE,
            Anonymous: INPUT_0 {
                mi: MOUSEINPUT { dwFlags: MOUSEEVENTF_LEFTDOWN, ..Default::default() },
            },
        };
        SendInput(&[input], std::mem::size_of::<INPUT>() as i32);
    }
}

fn send_mouse_up() {
    unsafe {
        let input = INPUT {
            r#type: INPUT_MOUSE,
            Anonymous: INPUT_0 {
                mi: MOUSEINPUT { dwFlags: MOUSEEVENTF_LEFTUP, ..Default::default() },
            },
        };
        SendInput(&[input], std::mem::size_of::<INPUT>() as i32);
    }
}

fn send_right_mouse_down() {
    unsafe {
        let input = INPUT {
            r#type: INPUT_MOUSE,
            Anonymous: INPUT_0 {
                mi: MOUSEINPUT { dwFlags: MOUSEEVENTF_RIGHTDOWN, ..Default::default() },
            },
        };
        SendInput(&[input], std::mem::size_of::<INPUT>() as i32);
    }
}

fn send_right_mouse_up() {
    unsafe {
        let input = INPUT {
            r#type: INPUT_MOUSE,
            Anonymous: INPUT_0 {
                mi: MOUSEINPUT { dwFlags: MOUSEEVENTF_RIGHTUP, ..Default::default() },
            },
        };
        SendInput(&[input], std::mem::size_of::<INPUT>() as i32);
    }
}

fn move_mouse_absolute(x: i32, y: i32) {
    unsafe {
        let sw = GetSystemMetrics(SM_CXSCREEN) as i64;
        let sh = GetSystemMetrics(SM_CYSCREEN) as i64;
        let norm_x = ((x as i64) * 65535 / sw) as i32;
        let norm_y = ((y as i64) * 65535 / sh) as i32;
        let input = INPUT {
            r#type: INPUT_MOUSE,
            Anonymous: INPUT_0 {
                mi: MOUSEINPUT {
                    dx: norm_x,
                    dy: norm_y,
                    dwFlags: MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE,
                    ..Default::default()
                },
            },
        };
        SendInput(&[input], std::mem::size_of::<INPUT>() as i32);
    }
}

/// Smooth drag from one position to another with interpolation
fn drag_mouse(from: (i32, i32), to: (i32, i32)) {
    let steps: u32 = 15;
    move_mouse_absolute(from.0, from.1);
    thread::sleep(Duration::from_millis(30));
    send_mouse_down();
    thread::sleep(Duration::from_millis(30));
    for i in 1..=steps {
        let t = i as f64 / steps as f64;
        let x = from.0 + ((to.0 - from.0) as f64 * t) as i32;
        let y = from.1 + ((to.1 - from.1) as f64 * t) as i32;
        move_mouse_absolute(x, y);
        thread::sleep(Duration::from_millis(5));
    }
    thread::sleep(Duration::from_millis(30));
    send_mouse_up();
}

/// Perform a click based on the current mode
fn perform_click(mode: &str, hold_ms: u64) {
    match mode {
        "right" => {
            send_right_mouse_down();
            thread::sleep(Duration::from_millis(hold_ms));
            send_right_mouse_up();
        }
        "double" => {
            send_mouse_down();
            thread::sleep(Duration::from_millis(hold_ms / 2));
            send_mouse_up();
            thread::sleep(Duration::from_millis(2));
            send_mouse_down();
            thread::sleep(Duration::from_millis(hold_ms / 2));
            send_mouse_up();
        }
        _ => {
            send_mouse_down();
            thread::sleep(Duration::from_millis(hold_ms));
            send_mouse_up();
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// KEYBOARD HELPERS
// ═══════════════════════════════════════════════════════════════════════════

fn send_key_down(vk: u16) {
    unsafe {
        let input = INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: VIRTUAL_KEY(vk),
                    dwFlags: KEYBD_EVENT_FLAGS(0),
                    ..Default::default()
                },
            },
        };
        SendInput(&[input], std::mem::size_of::<INPUT>() as i32);
    }
}

fn send_key_up(vk: u16) {
    unsafe {
        let input = INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: VIRTUAL_KEY(vk),
                    dwFlags: KEYEVENTF_KEYUP,
                    ..Default::default()
                },
            },
        };
        SendInput(&[input], std::mem::size_of::<INPUT>() as i32);
    }
}

fn press_key(vk: u16) {
    send_key_down(vk);
    thread::sleep(Duration::from_millis(30));
    send_key_up(vk);
}

/// Press a mouse X button (Mouse4=XBUTTON1, Mouse5=XBUTTON2)
fn press_mouse_x(button: u32) {
    unsafe {
        let down = INPUT {
            r#type: INPUT_MOUSE,
            Anonymous: INPUT_0 {
                mi: MOUSEINPUT {
                    dwFlags: MOUSEEVENTF_XDOWN,
                    mouseData: button,
                    ..Default::default()
                },
            },
        };
        SendInput(&[down], std::mem::size_of::<INPUT>() as i32);
        thread::sleep(Duration::from_millis(30));
        let up = INPUT {
            r#type: INPUT_MOUSE,
            Anonymous: INPUT_0 {
                mi: MOUSEINPUT {
                    dwFlags: MOUSEEVENTF_XUP,
                    mouseData: button,
                    ..Default::default()
                },
            },
        };
        SendInput(&[up], std::mem::size_of::<INPUT>() as i32);
    }
}

/// Press the dodge-roll key (handles both keyboard keys and mouse buttons)
fn press_dodge(key: &str) {
    match key {
        "Mouse3" => {
            send_right_mouse_down();
            thread::sleep(Duration::from_millis(30));
            send_right_mouse_up();
        }
        "Mouse4" => press_mouse_x(1), // XBUTTON1
        "Mouse5" => press_mouse_x(2), // XBUTTON2
        _ => {
            if let Some(vk) = js_code_to_vk(key) {
                press_key(vk);
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MACRO EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

const VK_TAB: u16 = 0x09;
const VK_Q: u16   = 0x51;
const VK_S: u16   = 0x53;
const VK_6: u16   = 0x36;

/// Part 1: Safe Pocket → Quick Use
fn execute_macro_part1(config: &MacroConfig) {
    let delay = Duration::from_millis(config.delay_ms);
    let sp = (config.safe_pocket_x, config.safe_pocket_y);
    let qu = (config.quick_use_x, config.quick_use_y);

    // Validate positions are set
    if sp == (0, 0) || qu == (0, 0) {
        println!("Macro Part 1: positions not set, aborting");
        return;
    }

    println!("Macro Part 1: executing");

    // 1. Open backpack
    press_key(VK_TAB);
    thread::sleep(delay);

    // 2. Drag item from Safe Pocket → Quick Use slot
    drag_mouse(sp, qu);
    thread::sleep(delay);

    // 3. Close backpack
    press_key(VK_TAB);
    thread::sleep(delay);

    // 4. Hold Q to open item wheel
    send_key_down(VK_Q);
    thread::sleep(Duration::from_millis(300));

    // 5. Select item 6
    press_key(VK_6);
    thread::sleep(Duration::from_millis(50));

    // 6. Release Q
    send_key_up(VK_Q);

    println!("Macro Part 1: done");
}

/// Part 2: Quick Use → Safe Pocket
fn execute_macro_part2(config: &MacroConfig) {
    let delay = Duration::from_millis(config.delay_ms);
    let sp = (config.safe_pocket_x, config.safe_pocket_y);
    let qu = (config.quick_use_x, config.quick_use_y);

    if sp == (0, 0) || qu == (0, 0) {
        println!("Macro Part 2: positions not set, aborting");
        return;
    }

    println!("Macro Part 2: executing");

    // 1. Hold S
    send_key_down(VK_S);
    thread::sleep(Duration::from_millis(50));

    // 2. Press dodge-roll key
    press_dodge(&config.dodge_key);
    thread::sleep(delay);

    // 3. Open backpack
    press_key(VK_TAB);
    thread::sleep(delay);

    // 4. Drag item from Quick Use to Safe Pocket
    drag_mouse(qu, sp);
    thread::sleep(delay);

    // 5. Close backpack
    press_key(VK_TAB);
    thread::sleep(delay);

    // 6. Release S
    send_key_up(VK_S);

    println!("Macro Part 2: done");
}

// ═══════════════════════════════════════════════════════════════════════════
// INPUT KEY DETECTION HELPER
// ═══════════════════════════════════════════════════════════════════════════

fn is_key_active(
    key_str: &str,
    keys: &[Keycode],
    mouse_buttons: &[bool],
    key_map: &HashMap<String, Keycode>,
) -> bool {
    // Keyboard check via HashMap
    if let Some(kc) = key_map.get(key_str) {
        if keys.contains(kc) {
            return true;
        }
    }
    // Mouse button check (safe bounds)
    match key_str {
        "Mouse3" => mouse_buttons.len() > 3 && mouse_buttons[3],
        "Mouse4" => mouse_buttons.len() > 4 && mouse_buttons[4],
        "Mouse5" => mouse_buttons.len() > 5 && mouse_buttons[5],
        _ => false,
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// TAURI COMMANDS
// ═══════════════════════════════════════════════════════════════════════════

#[tauri::command]
fn toggle_clicker(state: State<AppState>) -> bool {
    let mut clicker = state.clicker.lock().unwrap();
    clicker.running = !clicker.running;
    println!("Clicker toggled: {}", clicker.running);
    clicker.running
}

#[tauri::command]
fn update_config(
    cps: u64, randomness: u64, humanization_enabled: bool,
    toggle_key: String, click_mode: String, state: State<AppState>,
) {
    let mut clicker = state.clicker.lock().unwrap();
    clicker.cps = cps;
    clicker.randomness = randomness;
    clicker.humanization_enabled = humanization_enabled;
    clicker.toggle_key = toggle_key;
    clicker.click_mode = click_mode;
    println!(
        "Config updated: CPS={}, Rnd={}, Human={}, Key={}, Mode={}",
        cps, randomness, humanization_enabled, &clicker.toggle_key, &clicker.click_mode
    );
}

#[tauri::command]
fn get_clicker_state(state: State<AppState>) -> (bool, u64, u64, bool, String, String) {
    let clicker = state.clicker.lock().unwrap();
    (
        clicker.running, clicker.cps, clicker.randomness,
        clicker.humanization_enabled, clicker.toggle_key.clone(), clicker.click_mode.clone(),
    )
}

#[tauri::command]
fn capture_position() -> (i32, i32) {
    let device_state = DeviceState::new();
    // Wait for all keys/buttons to be released first (so we don't capture the UI click)
    loop {
        let keys = device_state.get_keys();
        let mouse = device_state.get_mouse();
        let any_mouse = mouse.button_pressed.iter().skip(1).any(|&b| b);
        if keys.is_empty() && !any_mouse {
            break;
        }
        thread::sleep(Duration::from_millis(10));
    }
    // Wait for any new key press
    loop {
        let keys = device_state.get_keys();
        if !keys.is_empty() {
            let mouse = device_state.get_mouse();
            println!("Position captured: ({}, {})", mouse.coords.0, mouse.coords.1);
            return mouse.coords;
        }
        thread::sleep(Duration::from_millis(10));
    }
}

#[tauri::command]
fn update_macro_config(
    part1_key: String, part2_key: String, dodge_key: String,
    safe_pocket_x: i32, safe_pocket_y: i32,
    quick_use_x: i32, quick_use_y: i32,
    delay_ms: u64, state: State<AppState>,
) {
    let mut mc = state.macro_config.lock().unwrap();
    mc.part1_key = part1_key;
    mc.part2_key = part2_key;
    mc.dodge_key = dodge_key;
    mc.safe_pocket_x = safe_pocket_x;
    mc.safe_pocket_y = safe_pocket_y;
    mc.quick_use_x = quick_use_x;
    mc.quick_use_y = quick_use_y;
    mc.delay_ms = delay_ms;
    println!(
        "Macro config: P1={}, P2={}, Dodge={}, SP=({},{}), QU=({},{}), Delay={}",
        mc.part1_key, mc.part2_key, mc.dodge_key,
        mc.safe_pocket_x, mc.safe_pocket_y, mc.quick_use_x, mc.quick_use_y, mc.delay_ms
    );
}

#[tauri::command]
fn get_macro_config(state: State<AppState>) -> MacroConfig {
    state.macro_config.lock().unwrap().clone()
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

fn main() {
    let key_map = build_key_map();

    let clicker_state = Arc::new(Mutex::new(ClickerState {
        running: false,
        cps: 10,
        randomness: 0,
        humanization_enabled: true,
        toggle_key: "F6".to_string(),
        click_mode: "left".to_string(),
    }));

    let macro_config = Arc::new(Mutex::new(MacroConfig {
        part1_key: "F7".to_string(),
        part2_key: "F8".to_string(),
        dodge_key: "AltLeft".to_string(),
        safe_pocket_x: 0,
        safe_pocket_y: 0,
        quick_use_x: 0,
        quick_use_y: 0,
        delay_ms: 50,
    }));

    let macro_running = Arc::new(Mutex::new(false));

    let clicker_clone = clicker_state.clone();
    let macro_clone = macro_config.clone();
    let running_clone = macro_running.clone();

    tauri::Builder::default()
        .on_window_event(|window, event| {
            // When the main window is closed, force-exit the entire process
            // so background threads (input listener, clicker engine) and
            // the overlay window are all terminated.
            if window.label() == "main" {
                if let tauri::WindowEvent::CloseRequested { .. } = event {
                    std::process::exit(0);
                }
            }
        })
        .setup(move |app| {
            let main_window = app.get_webview_window("main").unwrap();
            let overlay_window = app.get_webview_window("overlay").unwrap();
            let app_handle = app.handle().clone();

            // ─── THREAD 1: Input Listener ───────────────────────────────
            let input_clicker = clicker_clone.clone();
            let input_macro = macro_clone.clone();
            let input_running = running_clone.clone();
            let km = key_map.clone();

            thread::spawn(move || {
                let device_state = DeviceState::new();
                let mut last_toggle = false;
                let mut last_insert = false;
                let mut last_part1 = false;
                let mut last_part2 = false;

                loop {
                    let keys: Vec<Keycode> = device_state.get_keys();
                    let mouse_buttons = device_state.get_mouse().button_pressed;

                    // 1. Global Visibility Toggle (Insert)
                    let insert_pressed = keys.contains(&Keycode::Insert);
                    if insert_pressed && !last_insert {
                        if main_window.is_visible().unwrap_or(true) {
                            main_window.hide().unwrap();
                            overlay_window.show().unwrap();
                        } else {
                            main_window.show().unwrap();
                            main_window.set_focus().unwrap();
                            overlay_window.hide().unwrap();
                        }
                    }
                    last_insert = insert_pressed;

                    // 2. Clicker Toggle
                    let toggle_key = {
                        let s = input_clicker.lock().unwrap();
                        s.toggle_key.clone()
                    };
                    let toggle_now = is_key_active(&toggle_key, &keys, &mouse_buttons, &km);
                    if toggle_now && !last_toggle {
                        let mut s = input_clicker.lock().unwrap();
                        s.running = !s.running;
                        println!("Global Toggle: {}", s.running);
                        let _ = app_handle.emit(
                            "clicker-state-changed",
                            ClickerPayload {
                                running: s.running,
                                cps: s.cps,
                                click_mode: s.click_mode.clone(),
                            },
                        );
                    }
                    last_toggle = toggle_now;

                    // 3. Macro Keys (only when no macro is already running)
                    let macro_is_running = *input_running.lock().unwrap();
                    if !macro_is_running {
                        let mc = input_macro.lock().unwrap().clone();

                        // Part 1
                        let p1_now = is_key_active(&mc.part1_key, &keys, &mouse_buttons, &km);
                        if p1_now && !last_part1 {
                            let config = mc.clone();
                            let flag = input_running.clone();
                            *flag.lock().unwrap() = true;
                            thread::spawn(move || {
                                execute_macro_part1(&config);
                                *flag.lock().unwrap() = false;
                            });
                        }
                        last_part1 = p1_now;

                        // Part 2
                        let p2_now = is_key_active(&mc.part2_key, &keys, &mouse_buttons, &km);
                        if p2_now && !last_part2 {
                            let config = mc.clone();
                            let flag = input_running.clone();
                            *flag.lock().unwrap() = true;
                            thread::spawn(move || {
                                execute_macro_part2(&config);
                                *flag.lock().unwrap() = false;
                            });
                        }
                        last_part2 = p2_now;
                    }

                    thread::sleep(Duration::from_millis(10));
                }
            });

            // ─── THREAD 2: Clicker Engine ───────────────────────────────
            let engine_clicker = clicker_clone.clone();
            let engine_macro_running = running_clone.clone();
            thread::spawn(move || {
                loop {
                    let (running, cps, randomness, humanization_enabled, click_mode) = {
                        let s = engine_clicker.lock().unwrap();
                        (s.running, s.cps, s.randomness, s.humanization_enabled, s.click_mode.clone())
                    };

                    // Pause clicker while macro is running to avoid interference
                    let macro_active = *engine_macro_running.lock().unwrap();

                    if running && !macro_active {
                        if cps > 0 {
                            let target_ms: u64 = 1000 / cps;
                            let mut hold_ms = target_ms / 2;
                            let gap_ms;

                            if humanization_enabled {
                                let mut rng = rand::thread_rng();
                                let hold_ratio = rng.gen_range(0.3..0.6);
                                hold_ms = (target_ms as f64 * hold_ratio) as u64;
                                if randomness > 0 {
                                    let jitter = rng.gen_range(0..=randomness);
                                    if rng.gen_bool(0.5) { hold_ms = hold_ms.saturating_add(jitter); }
                                    else { hold_ms = hold_ms.saturating_sub(jitter); }
                                }
                                let min_hold = 2.max(target_ms / 4);
                                let max_hold = (target_ms * 3 / 4).max(min_hold);
                                hold_ms = hold_ms.clamp(min_hold, max_hold);
                                gap_ms = {
                                    let mut g = target_ms.saturating_sub(hold_ms);
                                    if randomness > 0 {
                                        let jitter = rng.gen_range(0..=randomness);
                                        if rng.gen_bool(0.5) { g = g.saturating_add(jitter); }
                                        else { g = g.saturating_sub(jitter); }
                                    }
                                    g
                                };
                            } else {
                                hold_ms = hold_ms.max(20);
                                gap_ms = target_ms.saturating_sub(hold_ms);
                            }

                            perform_click(&click_mode, hold_ms);
                            thread::sleep(Duration::from_millis(gap_ms));
                        }
                    } else {
                        thread::sleep(Duration::from_millis(10));
                    }
                }
            });

            Ok(())
        })
        .manage(AppState {
            clicker: clicker_state,
            macro_config,
            macro_running,
        })
        .invoke_handler(tauri::generate_handler![
            toggle_clicker,
            update_config,
            get_clicker_state,
            capture_position,
            update_macro_config,
            get_macro_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
