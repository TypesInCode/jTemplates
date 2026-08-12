import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    projects: [
      {
        test: {
          environment: "jsdom",
          name: "async",
          include: ["test/**/*-test-async.ts"]
        }
      },
      {
        test: {
          environment: "jsdom",
          name: "default",
          include: ["test/**/*-test.ts"],
          env: { SYNC_SCHEDULING: "true" }
        }
      },
    ]
  },
});
