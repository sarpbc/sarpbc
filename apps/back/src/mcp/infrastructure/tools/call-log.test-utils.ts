type CallArgument = string | number | boolean | object | null | undefined;

export interface Call {
  method: string;
  args: CallArgument[];
}

export const callLog = () => {
  const calls: Call[] = [];

  return {
    calls,
    record: (method: string, ...args: CallArgument[]) => {
      calls.push({ args, method });
    },
  };
};
