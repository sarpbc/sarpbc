import { Controller, Get, Header, Param, Query } from "@nestjs/common";
import type { CountryDetail, CountrySummary } from "@sarpbc/types";
import { OffsetPaginationQueryDto } from "../../../common/infrastructure/http/dto/offset-pagination-query.dto";
import { CountryService } from "../../application/country.service";
import { mapCountry, mapCountrySummary } from "./country.mapper";

@Controller("countries")
export class CountryController {
  constructor(private readonly countries: CountryService) {}

  @Get()
  @Header("Cache-Control", "public, max-age=60")
  async list(): Promise<{ countries: CountrySummary[] }> {
    return { countries: (await this.countries.list()).map(mapCountrySummary) };
  }

  @Get(":code")
  @Header("Cache-Control", "public, max-age=60")
  async find(
    @Param("code") code: string,
    @Query({ schema: OffsetPaginationQueryDto }) page: OffsetPaginationQueryDto,
  ): Promise<{ country: CountryDetail }> {
    return { country: mapCountry(await this.countries.find(code, page)) };
  }
}
