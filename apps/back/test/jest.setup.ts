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
