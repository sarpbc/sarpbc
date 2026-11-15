export const SCANNED_SOURCES = ["front", "admin", "ui"] as const;

export type ScannedSource = (typeof SCANNED_SOURCES)[number];

export interface Tally {
  count: number;
  key: string;
}

export interface SourceTally {
  count: number;
  source: ScannedSource;
}

export interface PropUsage {
  /** Bindings whose value is an expression, so only the call site knows it. */
  dynamic: number;
  name: string;
  total: number;
  values: Tally[];
}

export interface FileUsage {
  count: number;
  path: string;
}

export interface StaticProp {
  name: string;
  value: string;
}

/** One distinct way a component is called: its literal props, its bound props and whether it has default content. */
export interface Recipe {
  content: boolean;
  count: number;
  dynamic: string[];
  props: StaticProp[];
  source: ScannedSource;
}

export interface ComponentUsage {
  events: Tally[];
  files: FileUsage[];
  name: string;
  props: PropUsage[];
  recipes: Recipe[];
  slots: Tally[];
  sources: SourceTally[];
  total: number;
}

export interface SymbolUsage {
  files: FileUsage[];
  name: string;
  total: number;
}

export interface Inventory {
  components: ComponentUsage[];
  composables: SymbolUsage[];
  types: SymbolUsage[];
}
