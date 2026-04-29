use enigo::{Enigo, Keyboard, Settings, Key, Direction};
use std::io::{self, BufRead};

fn main() {
    let settings = Settings::default();
    let mut enigo = Enigo::new(&settings).expect("Init fail");
    let stdin = io::stdin();
    eprintln!("typer: listening via stdin...");
    for line in stdin.lock().lines() {
        if let Ok(cmd) = line {
            if cmd.starts_with("TYPE ") {
                let _ = enigo.text(&cmd[5..]);
            } else if cmd.starts_with("BACKSPACE ") {
                if let Ok(count) = cmd[10..].trim().parse::<usize>() {
                    for _ in 0..count {
                        let _ = enigo.key(Key::Backspace, Direction::Click);
                    }
                }
            }
        }
    }
}