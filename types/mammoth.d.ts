declare module 'mammoth' {
  type Result = { value: string; messages: { type: string; message: string }[] };
  export function extractRawText(input: { arrayBuffer: ArrayBuffer } | { buffer: Uint8Array }): Promise<Result>;
  export function convertToHtml(input: { arrayBuffer: ArrayBuffer } | { buffer: Uint8Array }): Promise<Result>;
}
