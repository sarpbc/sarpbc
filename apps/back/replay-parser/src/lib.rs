use std::collections::{HashMap, HashSet};

use boxcars::{
    ActorId, Attribute, HeaderProp, ObjectId, ParserBuilder, RemoteId, Replay, Vector3f,
};
use serde::Serialize;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReplaySummary {
    pub replay_guid: Option<String>,
    pub played_at: Option<String>,
    pub team_size: Option<i32>,
    pub blue_goals: i32,
    pub orange_goals: i32,
    pub players: Vec<PlayerSummary>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerSummary {
    pub name: String,
    pub platform: Platform,
    pub platform_id: Option<String>,
    pub team: u8,
    pub goals: i32,
    pub assists: i32,
    pub saves: i32,
    pub shots: i32,
    pub demolitions: i32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Platform {
    Steam,
    Epic,
    Psn,
    Xbox,
    Switch,
    #[default]
    Unknown,
}

pub fn parse_replay(data: &[u8]) -> Result<ReplaySummary, String> {
    let replay = ParserBuilder::new(data)
        .must_parse_network_data()
        .parse()
        .map_err(|e| format!("failed to parse replay: {e}"))?;
    summarize(&replay)
}

fn summarize(replay: &Replay) -> Result<ReplaySummary, String> {
    let props = &replay.properties;
    let network = NetworkPlayers::collect(replay)?;

    let mut players: Vec<PlayerSummary> = Vec::new();
    let mut matched: HashSet<usize> = HashSet::new();
    for stats in prop(props, "PlayerStats")
        .and_then(HeaderProp::as_array)
        .into_iter()
        .flatten()
    {
        if prop(stats, "bBot").and_then(HeaderProp::as_bool) == Some(true) {
            continue;
        }
        // Spectators and referees are listed with team -1.
        let team = match prop_i32(stats, "Team") {
            Some(0) => 0,
            Some(1) => 1,
            _ => continue,
        };
        let name = prop_str(stats, "Name").unwrap_or_default().to_string();
        let platform = prop(stats, "Platform")
            .and_then(header_platform)
            .unwrap_or(Platform::Unknown);
        let platform_id = header_platform_id(stats);
        let index = network.find(platform_id.as_deref(), &name, team);
        let demolitions = match index {
            Some(i) => {
                matched.insert(i);
                network.players[i].demolitions
            }
            None => 0,
        };
        players.push(PlayerSummary {
            name,
            platform,
            platform_id,
            team,
            goals: prop_i32(stats, "Goals").unwrap_or(0),
            assists: prop_i32(stats, "Assists").unwrap_or(0),
            saves: prop_i32(stats, "Saves").unwrap_or(0),
            shots: prop_i32(stats, "Shots").unwrap_or(0),
            demolitions,
        });
    }

    for (i, player) in network.players.iter().enumerate() {
        if matched.contains(&i) || player.bot {
            continue;
        }
        let (Some(name), Some(team)) = (&player.name, player.team) else {
            continue;
        };
        players.push(PlayerSummary {
            name: name.clone(),
            platform: player.platform,
            platform_id: player.platform_id.clone(),
            team,
            goals: 0,
            assists: 0,
            saves: 0,
            shots: 0,
            demolitions: player.demolitions,
        });
    }

    Ok(ReplaySummary {
        replay_guid: prop_str(props, "Id").map(str::to_string),
        played_at: prop_str(props, "Date").map(str::to_string),
        team_size: prop_i32(props, "TeamSize"),
        blue_goals: prop_i32(props, "Team0Score").unwrap_or(0),
        orange_goals: prop_i32(props, "Team1Score").unwrap_or(0),
        players,
    })
}

fn prop<'a>(props: &'a [(String, HeaderProp)], key: &str) -> Option<&'a HeaderProp> {
    props.iter().find(|(k, _)| k == key).map(|(_, v)| v)
}

fn prop_str<'a>(props: &'a [(String, HeaderProp)], key: &str) -> Option<&'a str> {
    prop(props, key).and_then(HeaderProp::as_string)
}

fn prop_i32(props: &[(String, HeaderProp)], key: &str) -> Option<i32> {
    prop(props, key).and_then(HeaderProp::as_i32)
}

fn header_platform(value: &HeaderProp) -> Option<Platform> {
    let HeaderProp::Byte {
        value: Some(value), ..
    } = value
    else {
        return None;
    };
    Some(match value.as_str() {
        "OnlinePlatform_Steam" => Platform::Steam,
        "OnlinePlatform_Epic" => Platform::Epic,
        "OnlinePlatform_PS4" | "OnlinePlatform_PS3" | "OnlinePlatform_PS5" => Platform::Psn,
        "OnlinePlatform_Dingo" | "OnlinePlatform_Durango" => Platform::Xbox,
        "OnlinePlatform_NNX" | "OnlinePlatform_Switch" => Platform::Switch,
        _ => Platform::Unknown,
    })
}

fn header_platform_id(stats: &[(String, HeaderProp)]) -> Option<String> {
    let online_id = prop(stats, "OnlineID")
        .and_then(HeaderProp::as_u64)
        .filter(|id| *id != 0)
        .map(|id| id.to_string());
    online_id.or_else(|| {
        let Some(HeaderProp::Struct { fields, .. }) = prop(stats, "PlayerID") else {
            return None;
        };
        prop_str(fields, "EpicAccountId")
            .filter(|id| !id.is_empty())
            .map(str::to_string)
    })
}

fn remote_platform(id: &RemoteId) -> (Platform, Option<String>) {
    let (platform, raw) = match id {
        RemoteId::Steam(id) => (Platform::Steam, id.to_string()),
        RemoteId::Epic(id) => (Platform::Epic, id.clone()),
        RemoteId::PlayStation(id) => (Platform::Psn, id.online_id.to_string()),
        RemoteId::PsyNet(id) => (Platform::Psn, id.online_id.to_string()),
        RemoteId::Xbox(id) => (Platform::Xbox, id.to_string()),
        RemoteId::Switch(id) => (Platform::Switch, id.online_id.to_string()),
        _ => (Platform::Unknown, String::new()),
    };
    let id = (!raw.is_empty() && raw != "0").then_some(raw);
    (platform, id)
}

#[derive(Debug, Default)]
struct NetworkPlayer {
    name: Option<String>,
    platform: Platform,
    platform_id: Option<String>,
    team: Option<u8>,
    bot: bool,
    demolitions: i32,
}

/// Players reconstructed from the network stream. One entry per distinct player identity, even if
/// the player had several PlayerReplicationInfo actors (e.g. after reconnecting).
struct NetworkPlayers {
    players: Vec<NetworkPlayer>,
}

impl NetworkPlayers {
    fn find(&self, platform_id: Option<&str>, name: &str, team: u8) -> Option<usize> {
        let by_id = || {
            platform_id.and_then(|id| {
                self.players
                    .iter()
                    .position(|p| p.platform_id.as_deref() == Some(id))
            })
        };
        let by_name = |team: Option<u8>| {
            self.players.iter().position(|p| {
                p.name.as_deref() == Some(name) && team.is_none_or(|team| p.team == Some(team))
            })
        };
        by_id()
            .or_else(|| by_name(Some(team)))
            .or_else(|| by_name(None))
    }

    fn collect(replay: &Replay) -> Result<Self, String> {
        let frames = &replay
            .network_frames
            .as_ref()
            .ok_or("replay has no network data")?
            .frames;

        let mut tracker = Tracker::default();
        for frame in frames {
            for actor in &frame.deleted_actors {
                tracker.live.remove(actor);
                tracker.remove_actor(*actor);
            }
            for actor in &frame.new_actors {
                // Replays periodically re-announce every live actor and re-send its attributes.
                // Only a different object behind the id is a new actor.
                if tracker.live.insert(actor.actor_id, actor.object_id) == Some(actor.object_id) {
                    continue;
                }
                tracker.remove_actor(actor.actor_id);
                let object = replay
                    .objects
                    .get(usize::from(actor.object_id))
                    .map(String::as_str)
                    .unwrap_or_default();
                if let Some(team) = team_archetype(object) {
                    tracker.teams.insert(actor.actor_id, team);
                }
            }
            for update in &frame.updated_actors {
                let property = replay
                    .objects
                    .get(usize::from(update.object_id))
                    .map(String::as_str)
                    .unwrap_or_default();
                tracker.apply(update.actor_id, property, &update.attribute);
            }
        }
        Ok(tracker.into_players())
    }
}

fn team_archetype(object: &str) -> Option<u8> {
    match object {
        "Archetypes.Teams.Team0" => Some(0),
        "Archetypes.Teams.Team1" => Some(1),
        _ => None,
    }
}

#[derive(Debug, Default)]
struct PriInstance {
    name: Option<String>,
    unique_id: Option<RemoteId>,
    team: Option<u8>,
    bot: bool,
}

/// Identity of a demolition. The last demolish value is re-sent periodically, even onto the
/// victim's next car with the car ids cleared, but its impact velocities stay bit-identical,
/// while two distinct demolitions never share all six components.
type DemolishKey = [u32; 6];

fn demolish_key(attacker: &Vector3f, victim: &Vector3f) -> DemolishKey {
    [
        attacker.x, attacker.y, attacker.z, victim.x, victim.y, victim.z,
    ]
    .map(f32::to_bits)
}

#[derive(Debug, Default)]
struct Tracker {
    live: HashMap<ActorId, ObjectId>,
    teams: HashMap<ActorId, u8>,
    /// Live PRI actor id -> index into `pris`. Actor ids are reused after deletion, so each new
    /// PRI actor gets a fresh instance.
    live_pris: HashMap<ActorId, usize>,
    pris: Vec<PriInstance>,
    /// Live car actor id -> last PRI instance driving it.
    car_drivers: HashMap<ActorId, usize>,
    seen_demolitions: HashSet<DemolishKey>,
    /// Attacker and victim PRI instances of each distinct demolition.
    demolitions: Vec<(usize, Option<usize>)>,
}

impl Tracker {
    fn remove_actor(&mut self, actor: ActorId) {
        self.teams.remove(&actor);
        self.live_pris.remove(&actor);
        self.car_drivers.remove(&actor);
    }

    fn pri(&mut self, actor: ActorId) -> usize {
        if let Some(index) = self.live_pris.get(&actor) {
            return *index;
        }
        self.pris.push(PriInstance::default());
        let index = self.pris.len() - 1;
        self.live_pris.insert(actor, index);
        index
    }

    fn apply(&mut self, actor: ActorId, property: &str, attribute: &Attribute) {
        match (property, attribute) {
            ("Engine.PlayerReplicationInfo:PlayerName", Attribute::String(name)) => {
                let pri = self.pri(actor);
                self.pris[pri].name = Some(name.clone());
            }
            ("Engine.PlayerReplicationInfo:UniqueId", Attribute::UniqueId(id)) => {
                let pri = self.pri(actor);
                self.pris[pri].unique_id = Some(id.remote_id.clone());
            }
            ("Engine.PlayerReplicationInfo:bBot", Attribute::Boolean(bot)) => {
                let pri = self.pri(actor);
                self.pris[pri].bot = *bot;
            }
            ("Engine.PlayerReplicationInfo:Team", Attribute::ActiveActor(team)) => {
                let team = self.teams.get(&team.actor).copied();
                let pri = self.pri(actor);
                if team.is_some() {
                    self.pris[pri].team = team;
                }
            }
            ("Engine.Pawn:PlayerReplicationInfo", Attribute::ActiveActor(pri)) => {
                // The PRI link is cleared when a car is demolished, sometimes before the demolish
                // attribute arrives, so keep the last known driver.
                if pri.active && pri.actor.0 >= 0 {
                    let pri = self.pri(pri.actor);
                    self.car_drivers.insert(actor, pri);
                }
            }
            (_, Attribute::Demolish(demo)) => {
                let key = demolish_key(&demo.attack_velocity, &demo.victim_velocity);
                self.demolish(key, demo.attacker, demo.victim, None);
            }
            (_, Attribute::DemolishFx(demo)) => {
                let key = demolish_key(&demo.attack_velocity, &demo.victim_velocity);
                self.demolish(key, demo.attacker, demo.victim, None);
            }
            (_, Attribute::DemolishExtended(demo)) => {
                let key = demolish_key(&demo.attacker_velocity, &demo.victim_velocity);
                let attacker_pri = (demo.attacker_pri.active && demo.attacker_pri.actor.0 >= 0)
                    .then(|| self.pri(demo.attacker_pri.actor));
                self.demolish(key, demo.attacker.actor, demo.victim.actor, attacker_pri);
            }
            _ => {}
        }
    }

    fn demolish(
        &mut self,
        key: DemolishKey,
        attacker_car: ActorId,
        victim_car: ActorId,
        attacker_pri: Option<usize>,
    ) {
        // Demolitions without a player attacker (hazards, goal explosions, re-sends with cleared
        // ids) are not credited by the game either.
        let Some(attacker) = attacker_pri.or_else(|| self.car_drivers.get(&attacker_car).copied())
        else {
            return;
        };
        if self.seen_demolitions.insert(key) {
            let victim = self.car_drivers.get(&victim_car).copied();
            self.demolitions.push((attacker, victim));
        }
    }

    fn into_players(self) -> NetworkPlayers {
        let mut players: Vec<NetworkPlayer> = Vec::new();
        let mut pri_player: Vec<usize> = Vec::with_capacity(self.pris.len());
        for pri in &self.pris {
            let (platform, platform_id) = pri
                .unique_id
                .as_ref()
                .map(remote_platform)
                .unwrap_or((Platform::Unknown, None));
            let existing = players
                .iter()
                .position(|p| match (&platform_id, &p.platform_id) {
                    (Some(a), Some(b)) => a == b,
                    _ => pri.name.is_some() && p.name == pri.name,
                });
            let index = match existing {
                Some(index) => index,
                None => {
                    players.push(NetworkPlayer {
                        platform,
                        platform_id: platform_id.clone(),
                        ..NetworkPlayer::default()
                    });
                    players.len() - 1
                }
            };
            let player = &mut players[index];
            if pri.name.is_some() {
                player.name = pri.name.clone();
            }
            if pri.team.is_some() {
                player.team = pri.team;
            }
            player.bot |= pri.bot;
            pri_player.push(index);
        }
        for (attacker, victim) in self.demolitions {
            let attacker = pri_player[attacker];
            // Some modes destroy a car with its own driver credited as the attacker; the game's
            // demolition counter ignores those.
            if victim.map(|victim| pri_player[victim]) != Some(attacker) {
                players[attacker].demolitions += 1;
            }
        }
        NetworkPlayers { players }
    }
}
