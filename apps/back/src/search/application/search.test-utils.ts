interface SearchPage {
  name: string;
  limit?: number;
  offset?: number;
}

export class InMemorySearchSource<Row extends { name: string }> {
  constructor(private readonly rows: Row[] = []) {}

  async find({ name, limit, offset = 0 }: SearchPage) {
    const matching = this.rows.filter((row) => row.name.toLowerCase().includes(name.toLowerCase()));

    return matching.slice(offset, limit === undefined ? undefined : offset + limit);
  }

  async searchByName(page: SearchPage) {
    return await this.find(page);
  }
}
