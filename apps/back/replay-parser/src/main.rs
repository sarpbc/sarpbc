use std::io::{Read, Write};
use std::process::ExitCode;

fn run() -> Result<String, String> {
    let mut args = std::env::args().skip(1);
    let path = match (args.next(), args.next()) {
        (Some(path), None) => path,
        _ => return Err("usage: replay-parser <file.replay | ->".into()),
    };
    let data = if path == "-" {
        let mut buf = Vec::new();
        std::io::stdin()
            .read_to_end(&mut buf)
            .map_err(|e| format!("failed to read stdin: {e}"))?;
        buf
    } else {
        std::fs::read(&path).map_err(|e| format!("failed to read {path}: {e}"))?
    };
    let summary = replay_parser::parse_replay(&data)?;
    serde_json::to_string(&summary).map_err(|e| format!("failed to serialize output: {e}"))
}

fn main() -> ExitCode {
    match run() {
        Ok(json) => {
            let mut stdout = std::io::stdout().lock();
            if writeln!(stdout, "{json}").is_err() {
                return ExitCode::FAILURE;
            }
            ExitCode::SUCCESS
        }
        Err(message) => {
            eprintln!("replay-parser: {message}");
            ExitCode::FAILURE
        }
    }
}
