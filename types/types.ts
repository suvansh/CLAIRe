import { Metadata } from "chromadb/src/types"

export interface IMessage {
    id: string;
    text: string;
    isUser: boolean;
    images: string[];
    timestamp: number;
  }

export type InputValues = Record<string, any>;
export type OutputValues = Record<string, any>;

export type DocumentMetadata = {
    id: string;
    document: string | null;
    metadata: Metadata | null;
};