import { CustomResourceOptions, Input, dynamic } from "@pulumi/pulumi";
import {
  RDSDataClient,
  ExecuteStatementCommand,
} from "@aws-sdk/client-rds-data";
import { useClient } from "../helpers/aws/client.js";

export interface PostgresTableInputs {
  clusterArn: Input<string>;
  secretArn: Input<string>;
  databaseName: Input<string>;
  tableName: Input<string>;
  vectorSize: Input<number>;
}

interface Inputs {
  clusterArn: string;
  secretArn: string;
  databaseName: string;
  tableName: string;
  vectorSize: number;
}

class Provider implements dynamic.ResourceProvider {
  async create(inputs: Inputs): Promise<dynamic.CreateResult> {
    await this.createDatabase(inputs);
    await this.enablePgvectorExtension(inputs);
    await this.enablePgtrgmExtension(inputs);
    await this.createTable(inputs);
    await this.createEmbeddingIndex(inputs);
    await this.createMetadataIndex(inputs);
    await this.createExternalIdIndex(inputs);
    return {
      id: inputs.tableName,
      outs: {},
    };
  }

  async update(
    id: string,
    olds: Inputs,
    news: Inputs
  ): Promise<dynamic.UpdateResult> {
    await this.createDatabase(news);
    await this.enablePgvectorExtension(news);
    await this.enablePgtrgmExtension(news);
    await this.createTable(news);
    await this.createEmbeddingIndex(news);
    await this.createMetadataIndex(news);
    await this.createExternalIdIndex(news);
    return {
      outs: {},
    };
  }

  async createDatabase(inputs: Inputs) {
    const client = useClient(RDSDataClient);
    try {
      await client.send(
        new ExecuteStatementCommand({
          resourceArn: inputs.clusterArn,
          secretArn: inputs.secretArn,
          sql: `create database ${inputs.databaseName}`,
        })
      );
    } catch (error: any) {
      // ERROR: database "playground_frank" already exists; SQLState: 42P04
      if (error.message.endsWith("SQLState: 42P04")) return;
      throw error;
    }
  }

  async enablePgvectorExtension(inputs: Inputs) {
    const client = useClient(RDSDataClient);
    try {
      await client.send(
        new ExecuteStatementCommand({
          resourceArn: inputs.clusterArn,
          secretArn: inputs.secretArn,
          database: inputs.databaseName,
          sql: `create extension vector;`,
        })
      );
    } catch (error: any) {
      // ERROR: extension "vector" already exists; SQLState: 42710
      if (error.message.endsWith("SQLState: 42710")) return;
      throw error;
    }
  }

  async enablePgtrgmExtension(inputs: Inputs) {
    const client = useClient(RDSDataClient);
    try {
      await client.send(
        new ExecuteStatementCommand({
          resourceArn: inputs.clusterArn,
          secretArn: inputs.secretArn,
          database: inputs.databaseName,
          sql: `create extension pg_trgm;`,
        })
      );
    } catch (error: any) {
      // ERROR: extension "vector" already exists; SQLState: 42710
      if (error.message.endsWith("SQLState: 42710")) return;
      throw error;
    }
  }

  async createTable(inputs: Inputs) {
    const client = useClient(RDSDataClient);
    try {
      await client.send(
        new ExecuteStatementCommand({
          resourceArn: inputs.clusterArn,
          secretArn: inputs.secretArn,
          database: inputs.databaseName,
          sql: `create table ${inputs.tableName} (
            id bigserial primary key,
            embedding vector(${inputs.vectorSize}),
            metadata jsonb,
            external_id varchar(255) unique
          );`,
        })
      );
    } catch (error: any) {
      // ERROR: relation "embeddings" already exists; SQLState: 42P07
      if (error.message.endsWith("SQLState: 42P07")) return;
      throw error;
    }
  }

  async createEmbeddingIndex(inputs: Inputs) {
    const client = useClient(RDSDataClient);
    try {
      await client.send(
        new ExecuteStatementCommand({
          resourceArn: inputs.clusterArn,
          secretArn: inputs.secretArn,
          database: inputs.databaseName,
          sql: `create index on ${inputs.tableName} using ivfflat (embedding vector_cosine_ops)
            with (lists = 100);`,
        })
      );
    } catch (error: any) {
      // ERROR: relation "embeddings" already exists; SQLState: 42P07
      if (error.message.endsWith("SQLState: 42P07")) return;
      throw error;
    }
  }

  async createMetadataIndex(inputs: Inputs) {
    const client = useClient(RDSDataClient);
    try {
      await client.send(
        new ExecuteStatementCommand({
          resourceArn: inputs.clusterArn,
          secretArn: inputs.secretArn,
          database: inputs.databaseName,
          sql: `create index on ${inputs.tableName} using gin (metadata);`,
        })
      );
    } catch (error: any) {
      // ERROR: relation "embeddings" already exists; SQLState: 42P07
      if (error.message.endsWith("SQLState: 42P07")) return;
      throw error;
    }
  }

  async createExternalIdIndex(inputs: Inputs) {
    const client = useClient(RDSDataClient);
    try {
      await client.send(
        new ExecuteStatementCommand({
          resourceArn: inputs.clusterArn,
          secretArn: inputs.secretArn,
          database: inputs.databaseName,
          sql: `create unique index on ${inputs.tableName} (external_id);`,
        })
      );
    } catch (error: any) {
      // ERROR: relation "embeddings" already exists; SQLState: 42P07
      if (error.message.endsWith("SQLState: 42P07")) return;
      throw error;
    }
  }
}

export class EmbeddingsTable extends dynamic.Resource {
  constructor(
    name: string,
    args: PostgresTableInputs,
    opts?: CustomResourceOptions
  ) {
    super(new Provider(), `${name}.sst.EmbeddingsTable`, args, opts);
  }
}
