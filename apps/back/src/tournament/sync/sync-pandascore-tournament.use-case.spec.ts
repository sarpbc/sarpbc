import { Test, TestingModule } from "@nestjs/testing";
import { PANDASCORE_GATEWAY } from "src/pandascore/application/ports/pandascore.gateway.port";
import { SyncPandascoreTournamentUseCase } from "./sync-pandascore-tournament.use-case";
import { TournamentSyncPersistence } from "./tournament-sync.persistence";

describe("SyncPandascoreTournamentUseCase", () => {
  let useCase: SyncPandascoreTournamentUseCase;
  const pandascoreGateway = {
    getTournamentById: jest.fn(),
    getTournamentBrackets: jest.fn(),
    getTournamentMatches: jest.fn(),
  };
  const persistence = {
    findTournamentById: jest.fn(),
    findTournamentByPandascoreId: jest.fn(),
    upsertTournament: jest.fn(),
    upsertTournamentParticipant: jest.fn(),
    upsertMatchesForTournament: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncPandascoreTournamentUseCase,
        { provide: PANDASCORE_GATEWAY, useValue: pandascoreGateway },
        { provide: TournamentSyncPersistence, useValue: persistence },
      ],
    }).compile();

    useCase = module.get(SyncPandascoreTournamentUseCase);
    jest.clearAllMocks();
  });

  it("fetches brackets when PandaScore reports has_bracket true", async () => {
    persistence.findTournamentById.mockResolvedValue({
      id: "t1",
      pandascoreId: 42,
    });
    pandascoreGateway.getTournamentById.mockResolvedValue({
      id: 42,
      name: "RLCS",
      has_bracket: true,
      expected_roster: [],
    });
    pandascoreGateway.getTournamentBrackets.mockResolvedValue([{ id: 1 }]);
    persistence.upsertMatchesForTournament.mockResolvedValue(1);

    await useCase.execute("t1");

    expect(pandascoreGateway.getTournamentBrackets).toHaveBeenCalledWith(42);
    expect(pandascoreGateway.getTournamentMatches).not.toHaveBeenCalled();
  });

  it("fetches flat matches when PandaScore reports has_bracket false", async () => {
    persistence.findTournamentById.mockResolvedValue({
      id: "t1",
      pandascoreId: 42,
    });
    pandascoreGateway.getTournamentById.mockResolvedValue({
      id: 42,
      name: "Swiss Stage",
      has_bracket: false,
      expected_roster: [],
    });
    pandascoreGateway.getTournamentMatches.mockResolvedValue([{ id: 2 }]);
    persistence.upsertMatchesForTournament.mockResolvedValue(1);

    await useCase.execute("t1");

    expect(pandascoreGateway.getTournamentMatches).toHaveBeenCalledWith(42);
    expect(pandascoreGateway.getTournamentBrackets).not.toHaveBeenCalled();
  });

  it("uses has_bracket from PandaScore upsert, not stale DB value", async () => {
    persistence.findTournamentById.mockResolvedValue({
      id: "t1",
      pandascoreId: 42,
      hasBracket: false,
    });
    pandascoreGateway.getTournamentById.mockResolvedValue({
      id: 42,
      name: "Playoffs",
      has_bracket: true,
      expected_roster: [],
    });
    pandascoreGateway.getTournamentBrackets.mockResolvedValue([{ id: 3 }]);
    persistence.upsertMatchesForTournament.mockResolvedValue(1);

    await useCase.execute("t1");

    expect(pandascoreGateway.getTournamentBrackets).toHaveBeenCalledWith(42);
    expect(pandascoreGateway.getTournamentMatches).not.toHaveBeenCalled();
  });
});
