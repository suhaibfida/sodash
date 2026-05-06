import { Buffer } from "buffer";

const browserGlobal = globalThis as typeof globalThis & {
  Buffer?: typeof Buffer;
  global?: typeof globalThis;
  process?: { env: Record<string, string | undefined> };
};

browserGlobal.Buffer ??= Buffer;
browserGlobal.global ??= globalThis;
browserGlobal.process ??= { env: {} };
