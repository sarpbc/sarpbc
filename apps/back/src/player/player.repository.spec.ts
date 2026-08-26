import { PlayerRepository } from "./player.repository";

describe("PlayerRepository.getRandomPlayer", () => {
  it("loads a single random row instead of the full table", async () => {
    const execute = jest.fn().mockResolvedValue([{ id: "p1" }]);
    const findById = jest.fn().mockResolvedValue({ id: "p1", name: "Vatira" });
    const repo = {
      em: { getConnection: () => ({ execute }) },
      findById,
    };

    const result = await PlayerRepository.prototype.getRandomPlayer.call(repo);

    expect(execute).toHaveBeenCalledWith("SELECT id FROM player ORDER BY random() LIMIT 1");
    expect(findById).toHaveBeenCalledWith("p1");
    expect(result).toEqual({ id: "p1", name: "Vatira" });
  });

  it("returns null when the table is empty", async () => {
    const execute = jest.fn().mockResolvedValue([]);
    const findById = jest.fn();
    const repo = {
      em: { getConnection: () => ({ execute }) },
      findById,
    };

    await expect(PlayerRepository.prototype.getRandomPlayer.call(repo)).resolves.toBeNull();
    expect(findById).not.toHaveBeenCalled();
  });
});
