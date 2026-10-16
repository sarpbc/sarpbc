import type { TopicRecord } from "../domain/forum";
import type { TopicStore, ForumTransaction } from "./ports";
const predefinedTopics = [
  {
    title: "Rocket League",
    description: "General discussions about Rocket League updates, esports & events",
  },
  {
    title: "Hardware & Stuff",
    description: "Discussions about hardware, peripherals, and other gaming-related topics",
  },
  {
    title: "Offtopic",
    description: "Discussions about off-topic subjects not related to Rocket League",
  },
  {
    title: "Bug & Suggestion",
    description: "Report bugs and suggest improvements for the sarpbc.org platform",
  },
];

export class TopicService {
  constructor(
    private readonly topicRepository: TopicStore,
    private readonly transaction: ForumTransaction,
    private readonly id: () => string = () => crypto.randomUUID(),
  ) {}

  async initializeTopics(): Promise<void> {
    return this.transaction.run(async (scope) => {
      for (const topicData of predefinedTopics) {
        const exists = await scope.topics.findByTitle(topicData.title);
        if (!exists) {
          const topic: TopicRecord = {
            id: this.id(),
            title: topicData.title,
            description: topicData.description,
            posts: [],
            createdAt: new Date(),
            updatedAt: null,
          };
          topic.title = topicData.title;
          topic.description = topicData.description;
          await scope.topics.save(topic);
        }
      }
    });
  }

  async find(): Promise<TopicRecord[]> {
    return this.topicRepository.findAllTopics();
  }

  async findById(id: string): Promise<TopicRecord | null> {
    return this.topicRepository.findById(id);
  }
}
