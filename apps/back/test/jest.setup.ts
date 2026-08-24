// MikroORM v7 is ESM-only; Jest runs in CJS. Mock ORM modules so unit tests can load
// entity files and Nest modules without native ESM interop or a live database.
function createPropertyBuilder() {
  const builder: Record<string | symbol, unknown> = {};
  const proxy = new Proxy(builder, {
    get(target, property) {
      if (property === "$type") {
        return () => proxy;
      }

      return () => proxy;
    },
  });

  return proxy;
}

const propertyBuilders = new Proxy(
  {},
  {
    get: () => () => createPropertyBuilder(),
  },
);

jest.mock("@mikro-orm/core", () => {
  return {
    Collection: class Collection<T> {
      private readonly items: T[];

      constructor(_owner?: unknown, items: T[] = []) {
        this.items = [...items];
      }

      getItems(): T[] {
        return [...this.items];
      }

      add(...items: T[]): void {
        this.items.push(...items);
      }

      count(): number {
        return this.items.length;
      }

      isInitialized(): boolean {
        return true;
      }
    },
    EntityRepository: class EntityRepository {},
    defineEntity: jest.fn((metadata) => metadata),
    p: propertyBuilders,
    RequestContext: {
      create: (_em: unknown, cb: () => unknown) => cb(),
    },
    UnderscoreNamingStrategy: class UnderscoreNamingStrategy {
      indexName(tableName: string, columns: string[], type: string): string {
        return `${tableName}_${columns.join("_")}_${type}`;
      }
    },
    QueryOrder: {
      ASC: "ASC",
      DESC: "DESC",
    },
    MikroORM: class MikroORM {},
  };
});

jest.mock("@mikro-orm/nestjs", () => ({
  InjectRepository: () => () => undefined,
  MikroOrmModule: {
    forFeature: jest.fn(() => ({})),
    forRoot: jest.fn(() => ({})),
  },
}));

const decorator = () => () => undefined;

jest.mock("@mikro-orm/decorators/legacy", () => ({
  CreateRequestContext: () => {
    return (
      _target: unknown,
      _propertyKey: string,
      descriptor: PropertyDescriptor,
    ): PropertyDescriptor => descriptor;
  },
  Entity: decorator,
  Enum: decorator,
  Index: decorator,
  ManyToMany: decorator,
  ManyToOne: decorator,
  OneToMany: decorator,
  PrimaryKey: decorator,
  Property: decorator,
  Unique: decorator,
}));

jest.mock("@mikro-orm/postgresql", () => ({
  EntityManager: class EntityManager {},
  EntityRepository: class EntityRepository {},
  MikroORM: class MikroORM {},
  PostgreSqlDriver: class PostgreSqlDriver {},
}));

jest.mock("evlog", () => {
  const mockLogger = () => ({
    set: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    emit: jest.fn(),
  });

  return {
    log: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    },
    initLogger: jest.fn(),
    createLogger: jest.fn(() => mockLogger()),
  };
});

jest.mock("evlog/nestjs", () => ({
  EvlogModule: {
    forRoot: jest.fn(() => class EvlogModuleMock {}),
  },
  useLogger: jest.fn(() => ({
    set: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    emit: jest.fn(),
  })),
}));
