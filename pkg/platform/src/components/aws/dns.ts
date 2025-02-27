/**
 * The AWS DNS Adapter lets you manage DNS records for domains hosted on [Route 53](https://aws.amazon.com/route53/).
 *
 * This component looks up the Route 53 hosted zone for the domain and creates the DNS records.
 *
 * @example
 *
 * ```ts
 * sst.aws.dns();
 * ```
 *
 * Specify the specific hosted zone ID if you have multiple hosted zones with the same domain.
 *
 * ```ts
 * sst.aws.dns({
 *   zone: "Z2FDTNDATAQYW2",
 * });
 * ```
 *
 * @packageDocumentation
 */

import * as aws from "@pulumi/aws";
import { AliasRecord, Dns, Record } from "../dns";
import { sanitizeToPascalCase } from "../naming";
import { HostedZoneLookup } from "./providers/hosted-zone-lookup";
import { ComponentResourceOptions, output } from "@pulumi/pulumi";
import { Transform, transform } from "../component";
import { Input } from "../input";

export interface DnsArgs {
  /**
   * The 14 letter ID of the [Route 53 hosted zone](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zones-working-with.html) that contains the `domainName`. You can find the hosted zone ID in the Route 53 part of the AWS Console.
   *
   * This option is useful for cases where you have multiple hosted zones that have the same
   * domain.
   *
   * @example
   * ```js
   * {
   *   zone: "Z2FDTNDATAQYW2"
   * }
   * ```
   */
  zone?: Input<string>;
  /**
   * [Transform](/docs/components#transform) how this component creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the AWS Route 53 record resource.
     */
    record?: Transform<aws.route53.RecordArgs>;
  };
}

/**
 * @param args The DNS arguments.
 */
export function dns(args: DnsArgs = {}) {
  return {
    provider: "aws",
    createRecord,
    createAliasRecords,
  } satisfies Dns;

  /**
   * Creates a DNS record in the hosted zone.
   *
   * @param namePrefix The prefix to use for the resource names.
   * @param record The DNS record to create.
   * @param opts The component resource options.
   */
  function createRecord(
    namePrefix: string,
    record: Record,
    opts: ComponentResourceOptions,
  ) {
    return _createRecord(
      namePrefix,
      {
        type: record.type,
        name: record.name,
        ttl: 60,
        records: [record.value],
      },
      opts,
    );
  }

  /**
   * Creates alias records in the hosted zone.
   *
   * @param namePrefix The prefix to use for the resource names.
   * @param record The alias record to create.
   * @param opts The component resource options.
   */
  function createAliasRecords(
    namePrefix: string,
    record: AliasRecord,
    opts: ComponentResourceOptions,
  ) {
    return ["A", "AAAA"].map((type) =>
      _createRecord(
        namePrefix,
        {
          type,
          name: record.name,
          aliases: [
            {
              name: record.aliasName,
              zoneId: record.aliasZone,
              evaluateTargetHealth: true,
            },
          ],
        },
        opts,
      ),
    );
  }

  function _createRecord(
    namePrefix: string,
    partial: Omit<aws.route53.RecordArgs, "zoneId">,
    opts: ComponentResourceOptions,
  ) {
    return output(partial).apply((partial) => {
      const nameSuffix = sanitizeToPascalCase(partial.name);
      const zoneId = lookupZone();
      const dnsRecord = createRecord();
      return dnsRecord;

      function lookupZone() {
        if (args.zone) return args.zone;

        return new HostedZoneLookup(
          `${namePrefix}${partial.type}ZoneLookup${nameSuffix}`,
          {
            domain: output(partial.name!).apply((name) =>
              name.replace(/\.$/, ""),
            ),
          },
          opts,
        ).zoneId;
      }

      function createRecord() {
        return new aws.route53.Record(
          `${namePrefix}${partial.type}Record${nameSuffix}`,
          transform(args.transform?.record, {
            zoneId,
            ...partial,
          }),
          opts,
        );
      }
    });
  }
}
