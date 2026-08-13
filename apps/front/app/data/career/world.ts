import type { CareerRegion } from "~/types/career";

/** Fictional teams and player gamertags — no real orgs or players. */
export interface CareerWorldTeam {
  id: string;
  name: string;
  region: CareerRegion;
  /** Baseline strength (0–95) used to seed the living world rankings. */
  baseStrength: number;
  players: readonly [string, string, string];
}

export const WORLD_TEAMS: readonly CareerWorldTeam[] = [
  // North America
  {
    id: "apex-velocity",
    name: "Apex Velocity",
    region: "na",
    baseStrength: 91,
    players: ["Skyline", "Torque", "Nitrous"],
  },
  {
    id: "binary-boost",
    name: "Binary Boost",
    region: "na",
    baseStrength: 86,
    players: ["Cipher", "Overclock", "Pixelate"],
  },
  {
    id: "phantom-drive",
    name: "Phantom Drive",
    region: "na",
    baseStrength: 80,
    players: ["Wraith", "Sidewind", "Ghostly"],
  },
  {
    id: "jetstream-united",
    name: "Jetstream United",
    region: "na",
    baseStrength: 73,
    players: ["Tailwind", "Vapor", "Slipstream"],
  },
  {
    id: "uplink-racing",
    name: "Uplink Racing",
    region: "na",
    baseStrength: 65,
    players: ["Packet", "Latency", "Bandwidth"],
  },
  // Europe
  {
    id: "crimson-orbit",
    name: "Crimson Orbit",
    region: "eu",
    baseStrength: 92,
    players: ["Redline", "Eclipse", "Perigee"],
  },
  {
    id: "flux-horizon",
    name: "Flux Horizon",
    region: "eu",
    baseStrength: 87,
    players: ["Zenon", "Skyfall", "Mirage"],
  },
  {
    id: "quantum-drift",
    name: "Quantum Drift",
    region: "eu",
    baseStrength: 81,
    players: ["Qubit", "Entangle", "Photon"],
  },
  {
    id: "vector-storm",
    name: "Vector Storm",
    region: "eu",
    baseStrength: 74,
    players: ["Tempest", "Magnitude", "Norm"],
  },
  {
    id: "warpfield",
    name: "Warpfield",
    region: "eu",
    baseStrength: 66,
    players: ["Fold", "Tesseract", "Blink"],
  },
  // South America
  {
    id: "solar-flare",
    name: "Solar Flare",
    region: "sam",
    baseStrength: 84,
    players: ["Corona", "Helios", "Fúria"],
  },
  {
    id: "momentum-ix",
    name: "Momentum IX",
    region: "sam",
    baseStrength: 76,
    players: ["Impulso", "Vértice", "Rasante"],
  },
  {
    id: "gravity-forge",
    name: "Gravity Forge",
    region: "sam",
    baseStrength: 67,
    players: ["Ferrão", "Órbita", "Cometa"],
  },
  // Oceania
  {
    id: "kinetic-pulse",
    name: "Kinetic Pulse",
    region: "oce",
    baseStrength: 78,
    players: ["Joule", "Reef", "Outback"],
  },
  {
    id: "zenith-motors",
    name: "Zenith Motors",
    region: "oce",
    baseStrength: 68,
    players: ["Apogee", "Drover", "Southerly"],
  },
  // Middle East & North Africa
  {
    id: "ion-surge",
    name: "Ion Surge",
    region: "mena",
    baseStrength: 85,
    players: ["Sahar", "Voltra", "Dune"],
  },
  {
    id: "nova-circuit",
    name: "Nova Circuit",
    region: "mena",
    baseStrength: 75,
    players: ["Mirageh", "Kasbah", "Zephyr"],
  },
  {
    id: "titan-boost",
    name: "Titan Boost",
    region: "mena",
    baseStrength: 66,
    players: ["Oasis", "Simoom", "Basalt"],
  },
  // Asia-Pacific
  {
    id: "hyperlane-fc",
    name: "Hyperlane FC",
    region: "apac",
    baseStrength: 79,
    players: ["Shinkai", "Bullet", "Kumo"],
  },
  {
    id: "echo-nexus",
    name: "Echo Nexus",
    region: "apac",
    baseStrength: 71,
    players: ["Hangul", "Resonance", "Typhoon"],
  },
  {
    id: "drift-circuit",
    name: "Drift Circuit",
    region: "apac",
    baseStrength: 64,
    players: ["Touge", "Monsoon", "Kani"],
  },
  // Sub-Saharan Africa
  {
    id: "orbital-fc",
    name: "Orbital FC",
    region: "ssa",
    baseStrength: 72,
    players: ["Savanna", "Kalahari", "Jozi"],
  },
  {
    id: "rocket-syndicate",
    name: "Rocket Syndicate",
    region: "ssa",
    baseStrength: 65,
    players: ["Baobab", "Harmattan", "Zambezi"],
  },
  {
    id: "lunar-apex",
    name: "Lunar Apex",
    region: "ssa",
    baseStrength: 60,
    players: ["Kilima", "Serengeti", "Naira"],
  },
] as const;

export function getWorldTeamById(id: string): CareerWorldTeam | undefined {
  return WORLD_TEAMS.find((team) => team.id === id);
}

export function getWorldTeamsByRegion(region: CareerRegion): CareerWorldTeam[] {
  return WORLD_TEAMS.filter((team) => team.region === region);
}
