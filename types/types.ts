import { Metadata } from "chromadb/src/types"

export interface IMessage {
  id: string; // uuid for scheduled messages, empty for regular messages
  text: string;
  isUser: boolean;
  images: string[];
  timestamp: number;  // milliseconds since epoch
}

export type InputValues = Record<string, any>;
export type OutputValues = Record<string, any>;

export type DocumentMetadata = {
  id: string;  // stringified counter – chroma doc ID
  document: string | null;
  metadata: Metadata | null;
};

export interface Profile {
  name: string;
  uuid: string;
};