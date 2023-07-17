import { VectorStoreRetrieverMemory, VectorStoreRetrieverMemoryParams } from "langchain/memory";
import { VectorStoreRetriever } from "langchain/vectorstores/base.js";
import { BaseChatMemory, BaseChatMemoryInput } from "langchain/memory";
import { getBufferString, getInputValue } from "langchain/memory";
import { InputValues, OutputValues } from "../types/types";
import { ChatMessageHistory } from "langchain/stores/message/in_memory"
import { BaseChatMessageHistory } from "langchain/schema";

export interface VectorStoreChatMemoryInput extends VectorStoreRetrieverMemoryParams, BaseChatMemoryInput {
  k?: number;
  chatHistoryKey?: string;
}

export class VectorStoreChatMemory extends VectorStoreRetrieverMemory implements VectorStoreChatMemoryInput {
  k = 3;
  chatHistory: BaseChatMessageHistory;
  returnMessages = false;
  inputKey = "input";
  outputKey = "response";
  chatHistoryKey = "history";

  constructor(fields: VectorStoreChatMemoryInput) {
    super(fields);
    this.chatHistory = fields?.chatHistory ?? new ChatMessageHistory();
    this.returnMessages = fields?.returnMessages ?? this.returnMessages;
    this.inputKey = fields?.inputKey ?? this.inputKey;
    this.outputKey = fields?.outputKey ?? this.outputKey;
    this.k = fields.k ?? this.k;
    this.chatHistoryKey = fields.chatHistoryKey ?? this.chatHistoryKey;
  }

  get memoryKeys() {
    return super.memoryKeys.concat([this.chatHistoryKey]);
  }

  async loadMemoryVariables(inputs: InputValues) {
    const memoryVariables = await super.loadMemoryVariables(inputs);
    const messages = await this.chatHistory.getMessages();
    console.log("messages", messages);
    const buffer = this.returnMessages ? messages.slice(-this.k * 2) : getBufferString(messages.slice(-this.k * 2));

    return {
      ...memoryVariables,
      [this.chatHistoryKey]: buffer,
    };
  }

  async saveContext(inputs: InputValues, outputs: OutputValues): Promise<void> {
    await super.saveContext(inputs, outputs);
    await this.chatHistory.addUserMessage(
        getInputValue(inputs, this.inputKey)
    );
    await this.chatHistory.addAIChatMessage(
        getInputValue(outputs, this.outputKey)
    );
  }

  async clear(): Promise<void> {
    await this.chatHistory.clear();
  }
}
