import { Topic } from "../../forum.entities";

export interface ITopicRepository {
  findAllTopics(): Promise<Topic[]>;
  findById(id: string): Promise<Topic | null>;
  findByTitle(title: string): Promise<Topic | null>;
  save(topic: Topic): Promise<void>;
}
