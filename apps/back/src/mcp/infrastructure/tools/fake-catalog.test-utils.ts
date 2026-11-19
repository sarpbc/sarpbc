import type { ManualCatalogService } from "../../../tournament/application/manual-catalog.service";
import { League } from "../../../tournament/domain/league";

export type Listing = Awaited<ReturnType<ManualCatalogService["findEvent"]>>;

export class FakeCatalog implements Pick<
  ManualCatalogService,
  "createEvent" | "createLeague" | "findEvent" | "leagues" | "updateEvent" | "updateLeague"
> {
  readonly createdEvents: Parameters<ManualCatalogService["createEvent"]>[0][] = [];
  readonly updatedEvents: {
    id: string;
    input: Parameters<ManualCatalogService["updateEvent"]>[1];
  }[] = [];
  readonly createdLeagues: Parameters<ManualCatalogService["createLeague"]>[0][] = [];
  readonly updatedLeagues: Parameters<ManualCatalogService["updateLeague"]>[0][] = [];
  leagueList: League[] = [];

  listing: Listing;

  constructor(listing: Listing) {
    this.listing = listing;
  }

  async createEvent(input: Parameters<ManualCatalogService["createEvent"]>[0]) {
    this.createdEvents.push(input);

    return { event: this.listing.event, stages: [] };
  }

  async createLeague(input: Parameters<ManualCatalogService["createLeague"]>[0]) {
    this.createdLeagues.push(input);

    return Object.assign(new League(), {
      imageUrl: null,
      name: input.name,
      slug: input.slug ?? input.name,
      url: null,
    });
  }

  async findEvent() {
    return this.listing;
  }

  async leagues() {
    return this.leagueList;
  }

  async updateEvent(id: string, input: Parameters<ManualCatalogService["updateEvent"]>[1]) {
    this.updatedEvents.push({ id, input });

    return this.listing;
  }

  async updateLeague(id: string) {
    this.updatedLeagues.push(id);

    return Object.assign(new League(), { id });
  }
}
