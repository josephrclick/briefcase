// Message types for extension communication

export interface ExtensionMessage {
  type: "ping" | "extractContent" | "summarize" | "error";
  payload?: unknown;
  error?: string;
}

export interface ExtensionResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

// Type guards
export function isExtensionMessage(msg: unknown): msg is ExtensionMessage {
  return (
    typeof msg === "object" &&
    msg !== null &&
    "type" in msg &&
    typeof (msg as ExtensionMessage).type === "string"
  );
}
