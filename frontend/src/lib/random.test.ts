import { describe, expect, it, vi } from "vitest";

import { createRandomUuid } from "./random";

describe("createRandomUuid", () => {
  it("uses the browser-native UUID implementation when available", () => {
    const value = "123e4567-e89b-42d3-a456-426614174000";
    const randomUUID = vi.fn(() => value);
    const source = {
      randomUUID,
    } as unknown as Crypto;

    expect(createRandomUuid(source)).toBe(value);
    expect(randomUUID).toHaveBeenCalledOnce();
  });

  it("creates a standards-compliant UUID v4 when randomUUID is unavailable", () => {
    const source = {
      getRandomValues: vi.fn((bytes: Uint8Array) => {
        bytes.set(Array.from({ length: 16 }, (_, index) => index));
        return bytes;
      }),
    } as unknown as Crypto;

    const value = createRandomUuid(source);

    expect(value).toBe("00010203-0405-4607-8809-0a0b0c0d0e0f");
    expect(value).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
    );
  });
});
