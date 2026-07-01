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

jest.mock("@mikro-orm/core", () => {
  const actual = jest.requireActual("@mikro-orm/core");
  return {
    ...actual,
    CreateRequestContext: () => {
      return (
        _target: unknown,
        _propertyKey: string,
        descriptor: PropertyDescriptor,
      ): PropertyDescriptor => descriptor;
    },
  };
});
