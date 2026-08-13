import { Controller, Get, Query } from "@nestjs/common";
import { SearchResult, SearchType } from "./interfaces/search-result.interface";
import { SearchService } from "./search.service";

@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(
    @Query("q") query: string,
    @Query("type") type?: SearchType,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ): Promise<SearchResult> {
    const searchLimit = limit ? parseInt(limit, 10) : 25;
    const searchOffset = offset ? parseInt(offset, 10) : 0;
    const searchType = type || "all";

    return await this.searchService.search({
      query,
      type: searchType,
      limit: searchLimit,
      offset: searchOffset,
    });
  }

  @Get("players")
  async searchPlayers(
    @Query("q") query: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    const searchLimit = limit ? parseInt(limit, 10) : 25;
    const searchOffset = offset ? parseInt(offset, 10) : 0;

    return await this.searchService.searchPlayers({
      query,
      limit: searchLimit,
      offset: searchOffset,
    });
  }

  @Get("teams")
  async searchTeams(
    @Query("q") query: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    const searchLimit = limit ? parseInt(limit, 10) : 25;
    const searchOffset = offset ? parseInt(offset, 10) : 0;

    return await this.searchService.searchTeams({
      query,
      limit: searchLimit,
      offset: searchOffset,
    });
  }

  @Get("tournaments")
  async searchTournaments(
    @Query("q") query: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    const searchLimit = limit ? parseInt(limit, 10) : 25;
    const searchOffset = offset ? parseInt(offset, 10) : 0;

    return await this.searchService.searchTournaments({
      query,
      limit: searchLimit,
      offset: searchOffset,
    });
  }
}
