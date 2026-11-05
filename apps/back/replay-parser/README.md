# replay-parser

Reads one Rocket League `.replay` file and prints one JSON object with the match
result and per-player stats. Built on [boxcars](https://github.com/nickbabcock/boxcars).

```sh
cargo build --release
target/release/replay-parser path/to/match.replay   # or `-` to read stdin
cargo test
```

On success the JSON goes to stdout and the exit code is 0. On any error a message
goes to stderr, nothing goes to stdout and the exit code is non-zero.

## Output

```json
{
  "replayGuid": "B0EC9BEA48ADB1B46EF82B8A7CB8D5BD",
  "playedAt": "2026-04-06 19-15-50",
  "teamSize": 3,
  "blueGoals": 4,
  "orangeGoals": 2,
  "players": [
    {
      "name": "Beezyhere",
      "platform": "epic",
      "platformId": "1d3359d4e6ec4eb98ac5795db87c004a",
      "team": 1,
      "goals": 1,
      "assists": 0,
      "saves": 2,
      "shots": 2,
      "demolitions": 2
    }
  ]
}
```

- `replayGuid`, `playedAt` (raw header `Date`) and `teamSize` come from the header and are
  `null` when absent. `blueGoals` and `orangeGoals` are `Team0Score` and `Team1Score`, with
  0 when absent.
- `team` is 0 for blue and 1 for orange. `platform` is one of `steam`, `epic`, `psn`, `xbox`,
  `switch` or `unknown`. `platformId` is the header `OnlineID`, or `PlayerID.EpicAccountId`
  for Epic players, or `null`.
- Goals, assists, saves and shots come from the header `PlayerStats`. Bots and spectators
  (team -1) are excluded.
- A player who left before the end is not listed in `PlayerStats`. If the network data
  identifies them by name and team, they are still listed with zero header stats and their
  computed demolitions.

## Demolitions

The header does not record demolitions, so they are computed from the network frames:

1. Track the `ReplicatedDemolish`, `ReplicatedDemolishGoalExplosion`,
   `ReplicatedDemolish_CustomFX` and `ReplicatedDemolishExtended` car attributes.
2. Credit the attacker's PlayerReplicationInfo (PRI). `ReplicatedDemolishExtended` names it
   directly. For older attributes, the attacker's car is mapped to its last
   `Engine.Pawn:PlayerReplicationInfo`. Actor ids are reused, so the mapping is reset when an
   id is deleted or reassigned to a different object. The periodic re-announcement of a live
   actor does not reset it.
3. Deduplication: the replay re-sends the last demolish value every keyframe, sometimes onto
   the victim's next car with the car ids cleared. A demolition is counted once per distinct
   pair of attacker and victim impact velocities. Re-sends are bit-identical, while distinct
   demolitions never share all six components.
4. Demolitions without a player attacker, such as hazards or goal explosions, are ignored, as
   are self-demolitions. The game's own counter ignores both.
5. PRIs are grouped into players by platform id, or by name when no id is available, then
   matched to header players by platform id, then by name.

Recent replays also replicate the game's own counter, `TAGame.PRI_TA:MatchDemolishes`. The
frame-based count matched it for every player in all 23 boxcars sample replays that contain
it (RL net versions 10 to 12, 2025 to 2026). Older replays do not have the counter, so it is
used only as a cross-check in the tests.

## Fixture

`tests/fixtures/soccar-strike-3v3.replay` is `assets/replays/good/P3_Soccar Strike.replay` from
[nickbabcock/boxcars](https://github.com/nickbabcock/boxcars) at commit `6f843778`, MIT license.
It is a 3v3 Stadium_P tournament match played on 2026-04-06 (1,633,617 bytes).
