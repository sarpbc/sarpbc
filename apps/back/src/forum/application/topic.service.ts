import { mapSequentially } from "../../common/application/sequentially";
import type { TopicRecord } from "./models";
import type { TopicStore, ForumTransaction } from "./ports";

const predefinedTopics = [
  {
    description: "General discussions about Rocket League updates, esports & events",
    title: "Rocket League",
  },
  {
    description: "Discussions about hardware, peripherals, and other gaming-related topics",
    title: "Hardware & Stuff",
  },
  {
    description: "Discussions about off-topic subjects not related to Rocket League",
    title: "Offtopic",
  },
  {
    description: "Report bugs and suggest improvements for the sarpbc.org platform",
    title: "Bug & Suggestion",
  },
];

export class TopicService {
  constructor(
    private readonly topicRepository: TopicStore,
    private readonly transaction: ForumTransaction,
  ) {}

  async initializeTopics(): Promise<void> {
    await this.transaction.run(async (scope) => {
      await mapSequentially(predefinedTopics, async (topicData) => {
        const exists = await scope.topics.findByTitle(topicData.title);

        if (!exists) {
          const topic: TopicRecord = {
            createdAt: new Date(),
            description: topicData.description,
            id: crypto.randomUUID(),
            posts: [],
            title: topicData.title,
            updatedAt: null,
          };

          await scope.topics.save(topic);
        }
      });
    });
  }

  async find(): Promise<TopicRecord[]> {
    return await this.topicRepository.findAllTopics();
  }

  async findById(id: string): Promise<TopicRecord | null> {
    return await this.topicRepository.findById(id);
  }
}
