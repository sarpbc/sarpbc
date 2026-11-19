import type { CountryDetail, CountrySummary } from "@sarpbc/types";
import { Controller, Get, Header, Param, Query } from "@nestjs/common";
import { OffsetPaginationQueryDto } from "../../../common/infrastructure/http/dto/offset-pagination-query.dto";
import type { OffsetPaginationQueryInput } from "../../../common/infrastructure/http/dto/offset-pagination-query.dto";
import { CountryService } from "../../application/country.service";
import { mapCountry, mapCountrySummary } from "./country.mapper";

@Controller("countries")
export class CountryController {
  constructor(private readonly countries: CountryService) {}

  @Get()
  @Header("Cache-Control", "public, max-age=60")
  async list() {
    const countries = await this.countries.list();

    return { countries: countries.map((country) => mapCountrySummary(country)) } satisfies {
      countries: CountrySummary[];
    };
  }

  @Get(":code")
  @Header("Cache-Control", "public, max-age=60")
  async find(
    @Param("code") code: string,
    @Query({ schema: OffsetPaginationQueryDto }) page: OffsetPaginationQueryInput,
  ) {
    const country = await this.countries.detail(code, page);

    return { country: mapCountry(country) } satisfies { country: CountryDetail };
  }
}
