import { BaseEntityStore, HumanChatMessage } from "langchain/schema";
import { BaseChatMemory, BaseChatMemoryInput } from "langchain/memory";
import { BaseLanguageModel } from "langchain/base_language";
import { ENTITY_EXTRACTION_PROMPT, CLAIRE_ENTITY_SUMMARIZATION_PROMPT } from "../prompts/entity";
import { getBufferString, getInputValue } from "langchain/memory";
import { DocumentMetadata, InputValues, OutputValues } from "../types/types";
import { LLMChain } from "langchain/chains";
import { PromptTemplate } from "langchain/prompts";
import { Document } from "langchain/document";
import { VectorStoreRetriever } from "langchain/vectorstores/base.js";
import { getPromptInputKey } from "./utils";
import ChromaEntityStore from "./ChromaEntityStore";
import moment from "moment";

export interface EntityVectorStoreMemoryInput extends BaseChatMemoryInput {
  llm: BaseLanguageModel;
  vectorStoreRetriever: VectorStoreRetriever;
  k?: number;
  entityStore?: BaseEntityStore;
  entityStoreCollectionName?: string;
  entityCache?: string[];
  entityExtractionPrompt?: PromptTemplate;
  entitySummarizationPrompt?: PromptTemplate;
  chatHistoryKey?: string;
  entitiesKey?: string;
  memoryKey?: string;
  dateTimeKey?: string;
  userKey?: string;
  returnDocs?: boolean;
  humanPrefix?: string;
  aiPrefix?: string;
  similarEntityLimit?: number;
}

export class EntityVectorStoreMemory extends BaseChatMemory implements EntityVectorStoreMemoryInput {
  private entityExtractionChain: LLMChain;
  private entitySummarizationChain: LLMChain;
  entityStore: BaseEntityStore;
  vectorStoreRetriever: VectorStoreRetriever;
  entityCache: string[] = [];
  k = 3;
  chatHistoryKey = "history";
  entitiesKey = "entities";
  memoryKey = "memory";
  dateTimeKey = "datetime";
  userKey = "user";
  returnDocs = false;
  llm: BaseLanguageModel;
  humanPrefix?: string;
  aiPrefix?: string;
  similarEntityLimit = 3;

  private constructor(fields: EntityVectorStoreMemoryInput, entityStore: BaseEntityStore) {
    super({
      chatHistory: fields.chatHistory,
      returnMessages: fields.returnMessages ?? false,
      inputKey: fields.inputKey,
      outputKey: fields.outputKey,
    });

    this.llm = fields.llm;
    this.vectorStoreRetriever = fields.vectorStoreRetriever;
    this.humanPrefix = fields.humanPrefix;
    this.aiPrefix = fields.aiPrefix;
    this.chatHistoryKey = fields.chatHistoryKey ?? this.chatHistoryKey;
    this.entitiesKey = fields.entitiesKey ?? this.entitiesKey;
    this.memoryKey = fields.memoryKey ?? this.memoryKey;
    this.dateTimeKey = fields.dateTimeKey ?? this.dateTimeKey;
    this.returnDocs = fields.returnDocs ?? this.returnDocs;
    this.entityExtractionChain = new LLMChain({
      llm: this.llm,
      prompt: fields.entityExtractionPrompt ?? ENTITY_EXTRACTION_PROMPT,
    });
    this.entitySummarizationChain = new LLMChain({
      llm: this.llm,
      prompt: fields.entitySummarizationPrompt ?? CLAIRE_ENTITY_SUMMARIZATION_PROMPT,
    });
    this.entityStore = entityStore;
    this.entityCache = fields.entityCache ?? this.entityCache;
    this.k = fields.k ?? this.k;
    this.similarEntityLimit = fields.similarEntityLimit ?? this.similarEntityLimit;
  }

  static async create(fields: EntityVectorStoreMemoryInput): Promise<EntityVectorStoreMemory> {
    const entityStore = fields.entityStore ?? await ChromaEntityStore.create(fields.entityStoreCollectionName);
    return new EntityVectorStoreMemory(fields, entityStore);
  }

  get memoryKeys() {
    return [this.userKey, this.dateTimeKey, this.chatHistoryKey, this.entitiesKey, this.memoryKey];
  }

  async loadMemoryVariables(inputs: InputValues) {
    // adapted from EntityMemory
    const promptInputKey = this.inputKey ?? getPromptInputKey(inputs, this.memoryKeys);
    const messages = await this.chatHistory.getMessages();
    const serializedMessages = getBufferString(
      messages.slice(-this.k * 2),
      this.humanPrefix,
      this.aiPrefix
    );
    const fullSerializedMessages: string = getBufferString(
      [...messages.slice(-this.k * 2), new HumanChatMessage(inputs[promptInputKey])],
      this.humanPrefix,
      this.aiPrefix,
    )
    const output = await this.entityExtractionChain.predict({
      history: serializedMessages,
      input: inputs[promptInputKey]
    });

    const entities: string[] = output.trim() === "NONE" ? [] : output.split(",").map((w) => w.trim());
    this.entityCache = [...entities];

    const entitySummaries: { [key: string]: string | undefined } = {};
    if (this.entityStore instanceof ChromaEntityStore) {
      const entityDocs: { [key: string]: DocumentMetadata[] } = {};
      const relevantEntities: Record<string, DocumentMetadata[]> = await this.entityStore.getBySimilarity(fullSerializedMessages, this.similarEntityLimit);

      for (const entity of entities) {
        const exactDocs = await this.entityStore.getDocs(entity);
        const exactDocIds = new Set(exactDocs.map(doc => doc.id));
        const similarDocs = relevantEntities[entity] ?? [];
        const newDocs = similarDocs.filter((doc) => !exactDocIds.has(doc.id));
        entityDocs[entity] = [...exactDocs, ...newDocs];
      }

      for (const [entity, docs] of Object.entries(entityDocs)) {
        entitySummaries[entity] = ChromaEntityStore.getEntityStringFromDocs(docs);
      }
    } else {
      for (const entity of entities) {
        entitySummaries[entity] = await this.entityStore.get(entity, "No current information known.");
      }
    }

    // converts entitySummaries object to string e.g. { "entity1": "summary1", "entity2": "summary2" } => "entity1:\nsummary1\n\nentity2:\nsummary2"
    const entitySummariesString = Object.entries(entitySummaries).map(([k, v]) => `${k}:\n${v}`).join("\n\n");
    const buffer = this.returnMessages ? messages.slice(-this.k * 2) : serializedMessages;

    // adapted from VectorStoreRetrieverMemory
    const query = getInputValue(inputs, this.inputKey);
    const queryResults = await this.vectorStoreRetriever.getRelevantDocuments(query);
    const fullResults = await this.vectorStoreRetriever.getRelevantDocuments(fullSerializedMessages);
    const results = [...new Set([...queryResults, ...fullResults])];
    const memoryContent = this.returnDocs ? results : results.map((r) => r.pageContent).join("\n");

    return {
      [this.userKey]: inputs.user ?? "a human",
      [this.dateTimeKey]: inputs.datetime ?? moment().format("ddd MM/DD/YYYY HH:mm Z"),
      [this.chatHistoryKey]: buffer,
      [this.entitiesKey]: entitySummariesString,
      [this.memoryKey]: memoryContent
    };
  }

  async saveContext(inputs: InputValues, outputs: OutputValues): Promise<void> {
    // EntityMemory
    await super.saveContext(inputs, outputs);
    const promptInputKey = this.inputKey ?? getPromptInputKey(inputs, this.memoryKeys);
    const messages = await this.chatHistory.getMessages();
    const serializedMessages = getBufferString(
      messages.slice(-this.k * 2),
      this.humanPrefix,
      this.aiPrefix
    );
    const inputData = inputs[promptInputKey];
    for (const entity of this.entityCache) {
      const existingSummary = await this.entityStore.get(entity, "No current information known.");
      const output = await this.entitySummarizationChain.predict({
        summary: existingSummary,
        entity,
        history: serializedMessages,
        datetime: moment().format("ddd MM/DD/YYYY HH:mm Z"),
        input: inputData,
      });
      if (output.trim() !== "UNCHANGED") {
        await this.entityStore.set(entity, output.trim());
      }
    }

    // VectorStoreRetrieverMemory
    const text = Object.entries(inputs)
      .filter(([k]) => k !== this.memoryKey)
      .concat(Object.entries(outputs))
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
    await this.vectorStoreRetriever.addDocuments([new Document({ pageContent: text })]);
  }

  async clear() {
    await super.clear();
    await this.chatHistory.clear()
    await this.entityStore.clear();
  }
}
