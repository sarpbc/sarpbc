/**
 * Runs `task` over `items` one at a time, in order. Use it only where each step depends on the
 * previous one (shared transaction state, generated slugs); independent work belongs in Promise.all.
 */
export async function mapSequentially<Item, Result>(
  items: readonly Item[],
  task: (item: Item, index: number) => Promise<Result>,
): Promise<Result[]> {
  const results: Result[] = [];

  const step = async (index: number): Promise<void> => {
    if (index === items.length) {
      return;
    }

    results.push(await task(items[index], index));
    await step(index + 1);
  };

  await step(0);

  return results;
}
