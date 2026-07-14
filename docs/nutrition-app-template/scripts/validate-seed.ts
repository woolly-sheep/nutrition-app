import { validateSeed } from "../src/seed/validateSeed";

const result = validateSeed();

if (!result.ok) {
  console.error("Seed validation failed:");
  for (const error of result.errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Seed validation passed.");
