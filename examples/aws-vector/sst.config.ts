/// <reference path="./.sst/platform/config.d.ts" />

/**
 * ## Vector search
 *
 * Store and search for vector data using the Vector component. Includes a seeder API that
 * uses an LLM to generate embeddings for some movies and optionally their posters.
 *
 * Once seeded, you can call the search API to query the vector database.
 */
export default $config({
  app(input) {
    return {
      name: "aws-vector",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const vector = new sst.aws.Vector("MyVectorDB", {
      model: "text-embedding-ada-002",
      //model: "amazon.titan-embed-image-v1",
      openAiApiKey: new sst.Secret("OpenAiApiKey").value,
    });

    const seeder = new sst.aws.Function("Seeder", {
      handler: "index.seeder",
      link: [vector],
      copyFiles: [
        { from: "iron-man.jpg", to: "iron-man.jpg" },
        {
          from: "black-widow.jpg",
          to: "black-widow.jpg",
        },
        {
          from: "spider-man.jpg",
          to: "spider-man.jpg",
        },
        { from: "thor.jpg", to: "thor.jpg" },
        {
          from: "captain-america.jpg",
          to: "captain-america.jpg",
        },
      ],
      url: true,
    });

    const app = new sst.aws.Function("MyApp", {
      handler: "index.app",
      link: [vector],
      url: true,
    });

    return { seeder: seeder.url, app: app.url };
  },
});
