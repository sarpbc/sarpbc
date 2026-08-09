/** Fictional team names — no real orgs or players. */
export const FICTIONAL_TEAMS = [
  "Apex Velocity",
  "Binary Boost",
  "Crimson Orbit",
  "Drift Circuit",
  "Echo Nexus",
  "Flux Horizon",
  "Gravity Forge",
  "Hyperlane FC",
  "Ion Surge",
  "Jetstream United",
  "Kinetic Pulse",
  "Lunar Apex",
  "Momentum IX",
  "Nova Circuit",
  "Orbital FC",
  "Phantom Drive",
  "Quantum Drift",
  "Rocket Syndicate",
  "Solar Flare",
  "Titan Boost",
  "Uplink Racing",
  "Vector Storm",
  "Warpfield",
  "Zenith Motors",
] as const;

export type FictionalTeam = (typeof FICTIONAL_TEAMS)[number];
