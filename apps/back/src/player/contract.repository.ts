import { EntityRepository } from "@mikro-orm/postgresql";
import { Contract } from "./domain/contract.entity";
import { IContractRepository } from "./domain/contract.repository.interface";

export class ContractRepository extends EntityRepository<Contract> implements IContractRepository {
  async findByPlayer(playerId: string): Promise<Contract[]> {
    return this.find(
      { player: { id: playerId } },
      { populate: ["team"], orderBy: { startDate: "desc" } },
    );
  }

  async findById(id: string): Promise<Contract | null> {
    return this.findOne({ id }, { populate: ["team", "player"] });
  }

  async findPastContractsByPlayer(playerId: string): Promise<Contract[]> {
    return this.find(
      { player: { id: playerId }, endDate: { $ne: null } },
      { populate: ["team"], orderBy: { endDate: "desc" } },
    );
  }

  async findByTeam(teamId: string): Promise<Contract[]> {
    return this.find(
      { team: { id: teamId } },
      { populate: ["player"], orderBy: { startDate: "desc" } },
    );
  }

  async findFormerPlayersByTeam(teamId: string): Promise<Contract[]> {
    return this.find(
      { team: { id: teamId }, endDate: { $ne: null } },
      { populate: ["player"], orderBy: { endDate: "desc" } },
    );
  }

  async findActiveContract(playerId: string): Promise<Contract | null> {
    return this.findOne({ player: { id: playerId }, endDate: null }, { populate: ["team"] });
  }

  async save(contract: Contract): Promise<void> {
    await this.em.persist(contract).flush();
  }

  async delete(contract: Contract): Promise<void> {
    await this.em.remove(contract).flush();
  }
}
