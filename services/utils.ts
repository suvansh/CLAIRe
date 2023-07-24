import { InputValues, OutputValues } from "../types/types";

// from https://github.com/hwchase17/langchainjs/blob/c2980108f7cf4d7eeccc50e290c41ce14a025f79/langchain/src/memory/base.ts#L97 but can't import from langchain for some reason so replicated here.
export function getPromptInputKey(
  inputs: Record<string, unknown>,
  memoryVariables: string[]
): string {
  const promptInputKeys = Object.keys(inputs).filter(
    (key) => !memoryVariables.includes(key) && key !== "stop"
  );
  if (promptInputKeys.length !== 1) {
    throw new Error(
      `One input key expected, but got ${promptInputKeys.length}`
    );
  }
  return promptInputKeys[0];
}

// from https://github.com/hwchase17/langchainjs/blob/c2980108f7cf4d7eeccc50e290c41ce14a025f79/langchain/src/memory/base.ts#L20 but can't import from langchain for some reason so replicated here.
const getValue = (values: InputValues | OutputValues, key?: string) => {
  if (key !== undefined) {
    return values[key];
  }
  const keys = Object.keys(values);
  if (keys.length === 1) {
    return values[keys[0]];
  }
};

// from https://github.com/hwchase17/langchainjs/blob/c2980108f7cf4d7eeccc50e290c41ce14a025f79/langchain/src/memory/base.ts#L52 but can't import from langchain for some reason so replicated here.
export const getOutputValue = (
  outputValues: OutputValues,
  outputKey?: string
) => {
  const value = getValue(outputValues, outputKey);
  if (!value) {
    const keys = Object.keys(outputValues);
    throw new Error(
      `output values have ${keys.length} keys, you must specify an output key or pass only 1 key as output`
    );
  }
  return value;
};