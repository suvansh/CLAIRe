import { BaseChatMessageHistory, BaseEntityStore, HumanMessage } from "langchain/schema";
import { BaseChatMemory, BaseChatMemoryInput } from "langchain/memory";
import { BaseLanguageModel } from "langchain/base_language";
import { Chroma } from "langchain/vectorstores/chroma";
import { ENTITY_EXTRACTION_PROMPT, CLAIRE_ENTITY_SUMMARIZATION_PROMPT } from "../prompts/entity";
import { getBufferString, getInputValue } from "langchain/memory";
import { DocumentMetadata, InputValues, OutputValues } from "../types/types";
import { LLMChain } from "langchain/chains";
import { PromptTemplate } from "langchain/prompts";
import { Document } from "langchain/document";
import { VectorStoreRetriever } from "langchain/vectorstores/base.js";
import { Metadata } from "chromadb/src/types"
import { getPromptInputKey, getOutputValue } from "./utils";
import ChromaEntityStore from "./ChromaEntityStore";
import moment from "moment";
import { ChromaChatMessageHistory } from "./ChromaChatMessageHistory";

export interface ClaireMemoryInput extends BaseChatMemoryInput {
  llm: BaseLanguageModel;
  chroma: Chroma;
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

export class ClaireMemory extends BaseChatMemory implements ClaireMemoryInput {
  private entityExtractionChain: LLMChain;
  private entitySummarizationChain: LLMChain;
  entityStore: BaseEntityStore;
  chroma: Chroma;
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

  private constructor(fields: ClaireMemoryInput, entityStore: BaseEntityStore, chromaChatHistory: BaseChatMessageHistory) {
    super({
      chatHistory: chromaChatHistory,
      returnMessages: fields.returnMessages ?? false,
      inputKey: fields.inputKey,
      outputKey: fields.outputKey,
    });

    this.llm = fields.llm;
    this.chroma = fields.chroma;
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

  static async create(fields: ClaireMemoryInput): Promise<ClaireMemory> {
    if (!fields.entityStore && !fields.entityStoreCollectionName) {
      throw new Error("Must provide either entityStore or entityStoreCollectionName");
    }
    const entityStore = fields.entityStore ?? await ChromaEntityStore.create(fields.entityStoreCollectionName!);
    if (fields.chatHistory && !(fields.chatHistory instanceof ChromaChatMessageHistory)) {
      throw new Error("EntityVectorStoreMemory is only compatible with ChromaChatMessageHistory");
    }
    const chatHistory = fields.chatHistory ?? await ChromaChatMessageHistory.create(fields.chroma, fields.k ?? 3);
    return new ClaireMemory(fields, entityStore, chatHistory);
  }

  get memoryKeys() {
    return [this.userKey, this.dateTimeKey, this.entitiesKey, this.memoryKey];
  }

  async loadMemoryVariables(inputs: InputValues) {
    // adapted from EntityMemory
    const promptInputKey = this.inputKey ?? getPromptInputKey(inputs, this.memoryKeys);
    const messages = getInputValue(inputs, this.chatHistoryKey);
    const serializedMessages = getBufferString(
      messages.slice(-this.k * 2),
      this.humanPrefix,
      this.aiPrefix
    );
    const fullSerializedMessages: string = getBufferString(
      [...messages.slice(-this.k * 2), new HumanMessage(inputs[promptInputKey])],
      this.humanPrefix,
      this.aiPrefix,
    )

    // extract entities from messages
    const output = await this.entityExtractionChain.predict({
      history: serializedMessages,
      input: inputs[promptInputKey]
    });

    const entities: string[] = output.trim() === "NONE" ? [] : output.split(",").map((w) => w.trim());
    this.entityCache = [...entities];

    const entitySummaries: { [key: string]: string | undefined } = {};
    if (this.entityStore instanceof ChromaEntityStore) { // adds in semantically similar entities
      const entityDocs: { [key: string]: DocumentMetadata[] } = {};
      const relevantEntities: Record<string, DocumentMetadata[]> = await this.entityStore.getBySimilarity(fullSerializedMessages, this.similarEntityLimit);

      // merge in semantically similar entities while ignoring duplicates
      for (const entity of entities) {
        const exactDocs = await this.entityStore.getDocs(entity);
        const similarDocs = relevantEntities[entity] ?? [];
        let combinedDocs: DocumentMetadata[] = [...exactDocs, ...similarDocs];
        // eliminate duplicates
        combinedDocs = combinedDocs.filter(
          (result, index, self) =>
            index === self.findIndex((t) => t.id === result.id)
        );
        // sort by id
        combinedDocs.sort((a, b) => ((a.metadata?.created ?? 0) as number) - ((b.metadata?.created ?? 0) as number));
        entityDocs[entity] = combinedDocs;
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
    const queryResults = await (this.chatHistory as ChromaChatMessageHistory).searchMessagesSemantic(query);
    const fullResults = await (this.chatHistory as ChromaChatMessageHistory).searchMessagesSemantic(fullSerializedMessages);
    let combinedResults: DocumentMetadata[] = [...queryResults, ...fullResults];
    combinedResults = combinedResults.filter(
      (result, index, self) =>
        index === self.findIndex((t) => t.id === result.id)
    );

    combinedResults.sort((a, b) => parseInt(a.id) - parseInt(b.id));

    // Map to a new array of metadata-string tuples with the required prefix based on 'isUser'
    const prefixedResults: [Metadata | null, string][] = combinedResults.map((result) => {
      return [result.metadata, (result.metadata?.isUser ? this.humanPrefix : this.aiPrefix) + ": " + (result.document ?? "")]
    });

    const memoryContent = this.returnDocs
      ? prefixedResults.map(result => new Document({ pageContent: result[1], metadata: result[0] ?? undefined }))
      : prefixedResults.map(result => result[1]).join("\n");

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
    const input = getInputValue(inputs, promptInputKey);
    const output = getOutputValue(outputs, this.outputKey);
    for (const entity of this.entityCache) {
      const existingSummary = await this.entityStore.get(entity, "No current information known.");
      const entityOutput = await this.entitySummarizationChain.predict({
        summary: existingSummary,
        entity,
        history: serializedMessages,
        datetime: moment().format("ddd MM/DD/YYYY HH:mm Z"),
        input: input,
      });
      if (entityOutput.trim() !== "UNCHANGED") {
        await this.entityStore.set(entity, entityOutput.trim());
      }
    }

    // ChromaChatMessageHistory
    await (this.chatHistory as ChromaChatMessageHistory).addUserMessageMetadata(input, {
      id: "",
      isUser: true,
      images: [],
      timestamp: moment().valueOf()
    });
    await (this.chatHistory as ChromaChatMessageHistory).addAIChatMessageMetadata(output, {
      id: "",
      isUser: false,
      images: [],
      timestamp: moment().valueOf()
    });
  }

  async clear() {
    await super.clear();
    await this.chatHistory.clear();
    await this.entityStore.clear();
  }
}
