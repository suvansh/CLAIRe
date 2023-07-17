// from https://github.com/hwchase17/langchainjs/blob/main/langchain/src/memory/base.ts#L66 but can't import from langchain for some reason so replicated here.
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