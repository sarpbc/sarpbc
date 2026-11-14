import type { CareerRegion } from "~/types/career";

/** Fictional teams and player gamertags — no real orgs or players. */
export interface CareerWorldTeam {
  id: string;
  name: string;
  region: CareerRegion;
  baseStrength: number;
  players: readonly [string, string, string];
}

export const WORLD_TEAMS: readonly CareerWorldTeam[] = [
  {
    baseStrength: 92,
    id: "apex-velocity",
    name: "Apex Velocity",
    players: ["Skyline", "Torque", "Nitrous"],
    region: "na",
  },
  {
    baseStrength: 87,
    id: "binary-boost",
    name: "Binary Boost",
    players: ["Cipher", "Overclock", "Pixelate"],
    region: "na",
  },
  {
    baseStrength: 80,
    id: "phantom-drive",
    name: "Phantom Drive",
    players: ["Wraith", "Sidewind", "Ghostly"],
    region: "na",
  },
  {
    baseStrength: 73,
    id: "jetstream-united",
    name: "Jetstream United",
    players: ["Tailwind", "Vapor", "Slipstream"],
    region: "na",
  },
  {
    baseStrength: 65,
    id: "uplink-racing",
    name: "Uplink Racing",
    players: ["Packet", "Latency", "Bandwidth"],
    region: "na",
  },
  {
    baseStrength: 96,
    id: "crimson-orbit",
    name: "Crimson Orbit",
    players: ["Redline", "Eclipse", "Perigee"],
    region: "eu",
  },
  {
    baseStrength: 91,
    id: "flux-horizon",
    name: "Flux Horizon",
    players: ["Zenon", "Skyfall", "Mirage"],
    region: "eu",
  },
  {
    baseStrength: 85,
    id: "quantum-drift",
    name: "Quantum Drift",
    players: ["Qubit", "Entangle", "Photon"],
    region: "eu",
  },
  {
    baseStrength: 77,
    id: "vector-storm",
    name: "Vector Storm",
    players: ["Tempest", "Magnitude", "Norm"],
    region: "eu",
  },
  {
    baseStrength: 69,
    id: "warpfield",
    name: "Warpfield",
    players: ["Fold", "Tesseract", "Blink"],
    region: "eu",
  },
  {
    baseStrength: 86,
    id: "solar-flare",
    name: "Solar Flare",
    players: ["Corona", "Helios", "Fúria"],
    region: "sam",
  },
  {
    baseStrength: 78,
    id: "momentum-ix",
    name: "Momentum IX",
    players: ["Impulso", "Vértice", "Rasante"],
    region: "sam",
  },
  {
    baseStrength: 70,
    id: "gravity-forge",
    name: "Gravity Forge",
    players: ["Ferrão", "Órbita", "Cometa"],
    region: "sam",
  },
  {
    baseStrength: 76,
    id: "kinetic-pulse",
    name: "Kinetic Pulse",
    players: ["Joule", "Reef", "Outback"],
    region: "oce",
  },
  {
    baseStrength: 66,
    id: "zenith-motors",
    name: "Zenith Motors",
    players: ["Apogee", "Drover", "Southerly"],
    region: "oce",
  },
  {
    baseStrength: 86,
    id: "ion-surge",
    name: "Ion Surge",
    players: ["Sahar", "Voltra", "Dune"],
    region: "mena",
  },
  {
    baseStrength: 78,
    id: "nova-circuit",
    name: "Nova Circuit",
    players: ["Mirageh", "Kasbah", "Zephyr"],
    region: "mena",
  },
  {
    baseStrength: 70,
    id: "titan-boost",
    name: "Titan Boost",
    players: ["Oasis", "Simoom", "Basalt"],
    region: "mena",
  },
  {
    baseStrength: 77,
    id: "hyperlane-fc",
    name: "Hyperlane FC",
    players: ["Shinkai", "Bullet", "Kumo"],
    region: "apac",
  },
  {
    baseStrength: 69,
    id: "echo-nexus",
    name: "Echo Nexus",
    players: ["Hangul", "Resonance", "Typhoon"],
    region: "apac",
  },
  {
    baseStrength: 61,
    id: "drift-circuit",
    name: "Drift Circuit",
    players: ["Touge", "Monsoon", "Kani"],
    region: "apac",
  },
  {
    baseStrength: 70,
    id: "orbital-fc",
    name: "Orbital FC",
    players: ["Savanna", "Kalahari", "Jozi"],
    region: "ssa",
  },
  {
    baseStrength: 63,
    id: "rocket-syndicate",
    name: "Rocket Syndicate",
    players: ["Baobab", "Harmattan", "Zambezi"],
    region: "ssa",
  },
  {
    baseStrength: 56,
    id: "lunar-apex",
    name: "Lunar Apex",
    players: ["Kilima", "Serengeti", "Naira"],
    region: "ssa",
  },
] as const;

export const getWorldTeamById = (id: string): CareerWorldTeam | undefined =>
  WORLD_TEAMS.find((team) => team.id === id);

export const getWorldTeamsByRegion = (region: CareerRegion): CareerWorldTeam[] =>
  WORLD_TEAMS.filter((team) => team.region === region);
