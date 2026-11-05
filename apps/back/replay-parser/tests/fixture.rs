use std::collections::HashMap;

use boxcars::{Attribute, ParserBuilder};
use replay_parser::{Platform, PlayerSummary, ReplaySummary, parse_replay};

const FIXTURE: &[u8] = include_bytes!("fixtures/soccar-strike-3v3.replay");

fn player(
    name: &str,
    platform: Platform,
    platform_id: &str,
    team: u8,
    [goals, assists, saves, shots, demolitions]: [i32; 5],
) -> PlayerSummary {
    PlayerSummary {
        name: name.to_string(),
        platform,
        platform_id: Some(platform_id.to_string()),
        team,
        goals,
        assists,
        saves,
        shots,
        demolitions,
    }
}

#[test]
fn parses_fixture_exactly() {
    let summary = parse_replay(FIXTURE).unwrap();
    let expected = ReplaySummary {
        replay_guid: Some("B0EC9BEA48ADB1B46EF82B8A7CB8D5BD".to_string()),
        played_at: Some("2026-04-06 19-15-50".to_string()),
        team_size: Some(3),
        blue_goals: 4,
        orange_goals: 2,
        players: vec![
            player(
                "Palantir FreedomRouter Pro",
                Platform::Steam,
                "76561198161985105",
                1,
                [0, 1, 0, 0, 0],
            ),
            player(
                "brandonsavagexx",
                Platform::Epic,
                "487e9d2aaf1e4fbfaca11a2079473458",
                0,
                [1, 2, 1, 2, 0],
            ),
            player(
                "Beezyhere",
                Platform::Epic,
                "1d3359d4e6ec4eb98ac5795db87c004a",
                1,
                [1, 0, 2, 2, 2],
            ),
            player(
                "Trafalger Law.",
                Platform::Epic,
                "9fe6f9f381ae439aa0758fe76a7a9b3a",
                0,
                [2, 0, 0, 5, 1],
            ),
            player(
                "Filthyx96",
                Platform::Xbox,
                "2535417721936934",
                0,
                [1, 0, 0, 3, 0],
            ),
            player(
                "JonaOrozco17",
                Platform::Psn,
                "8436819687740427698",
                1,
                [1, 0, 3, 0, 1],
            ),
        ],
    };
    assert_eq!(summary, expected);

    let team_goals = |team: u8| -> i32 {
        summary
            .players
            .iter()
            .filter(|p| p.team == team)
            .map(|p| p.goals)
            .sum()
    };
    assert_eq!(team_goals(0), summary.blue_goals);
    assert_eq!(team_goals(1), summary.orange_goals);
}

/// Independent cross-check: the game replicates its own per-player demolition counter
/// (`TAGame.PRI_TA:MatchDemolishes`) in recent replays.
#[test]
fn demolitions_match_the_game_counter() {
    let replay = ParserBuilder::new(FIXTURE)
        .must_parse_network_data()
        .parse()
        .unwrap();
    let mut names: HashMap<i32, String> = HashMap::new();
    let mut counters: HashMap<i32, i32> = HashMap::new();
    for frame in &replay.network_frames.as_ref().unwrap().frames {
        for update in &frame.updated_actors {
            match (
                replay.objects[usize::from(update.object_id)].as_str(),
                &update.attribute,
            ) {
                ("Engine.PlayerReplicationInfo:PlayerName", Attribute::String(name)) => {
                    names.insert(update.actor_id.0, name.clone());
                }
                ("TAGame.PRI_TA:MatchDemolishes", Attribute::Int(count)) => {
                    counters.insert(update.actor_id.0, *count);
                }
                _ => {}
            }
        }
    }
    let by_name: HashMap<&str, i32> = counters
        .iter()
        .map(|(actor, count)| (names[actor].as_str(), *count))
        .collect();
    assert!(!by_name.is_empty());

    for player in parse_replay(FIXTURE).unwrap().players {
        let counter = by_name.get(player.name.as_str()).copied().unwrap_or(0);
        assert_eq!(player.demolitions, counter, "{}", player.name);
    }
}
