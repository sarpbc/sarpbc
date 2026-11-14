/**
 * A real instance of `type` whose constructor never ran. Any collaborator it
 * would use is undefined, so a test that unexpectedly reaches it fails loudly.
 * `instanceof` narrows the value, so no type assertion is involved.
 */
export function unconstructed<T extends object>(type: abstract new (...args: never[]) => T): T {
  const instance: unknown = Reflect.construct(Object, [], type);

  if (!(instance instanceof type)) {
    throw new TypeError(`Cannot create an unconstructed ${type.name}`);
  }

  return instance;
}
