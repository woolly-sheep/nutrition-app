import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  readJsonArray,
  writeJsonArray,
} from "../../../src/server/store/jsonArrayStore";

let dir: string;
let file: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "json-store-"));
  file = path.join(dir, "records.json");
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("readJsonArray", () => {
  it("returns [] for a missing file (a legitimate empty list)", async () => {
    expect(await readJsonArray(file)).toEqual([]);
  });

  it("returns [] for an empty / whitespace file", async () => {
    await writeFile(file, "   \n", "utf-8");
    expect(await readJsonArray(file)).toEqual([]);
  });

  it("parses a valid JSON array", async () => {
    await writeFile(file, JSON.stringify([{ a: 1 }, { a: 2 }]), "utf-8");
    expect(await readJsonArray(file)).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it("THROWS on a corrupt file instead of coercing to [] (prevents wipe)", async () => {
    await writeFile(file, '[{"a":1},', "utf-8"); // truncated JSON
    await expect(readJsonArray(file)).rejects.toThrow();
  });

  it("throws when the JSON is valid but not an array", async () => {
    await writeFile(file, JSON.stringify({ not: "an array" }), "utf-8");
    await expect(readJsonArray(file)).rejects.toThrow();
  });
});

describe("writeJsonArray", () => {
  it("round-trips and creates the directory", async () => {
    const nested = path.join(dir, "a", "b", "records.json");
    await writeJsonArray(nested, [{ x: 1 }]);
    expect(JSON.parse(await readFile(nested, "utf-8"))).toEqual([{ x: 1 }]);
  });

  it("leaves no temp files behind", async () => {
    await writeJsonArray(file, [{ x: 1 }]);
    const { readdir } = await import("node:fs/promises");
    const entries = await readdir(dir);
    expect(entries).toEqual(["records.json"]);
  });
});

describe("durability: a corrupt file is never silently overwritten", () => {
  it("a read-modify-write mutation aborts (throws) rather than wiping good-but-corrupt data", async () => {
    // Simulate a truncated file from an interrupted write.
    await writeFile(file, '[{"id":"keep"}', "utf-8");

    // The store pattern is: records = await readAll(); write([...records, new]).
    // With the old behaviour readAll() returned [] and the write wiped the file.
    // Now the read throws, so the mutation never reaches the write.
    const mutate = async () => {
      const records = await readJsonArray<{ id: string }>(file);
      await writeJsonArray(file, [...records, { id: "new" }]);
    };
    await expect(mutate()).rejects.toThrow();

    // The original bytes are still on disk — nothing was overwritten.
    expect(await readFile(file, "utf-8")).toBe('[{"id":"keep"}');
  });
});
