import { createHash, createHmac } from "node:crypto";

/**
 * 原生 Fetch + TC3-HMAC-SHA256 签名的腾讯云内容安全 (TMS) 客户端
 */
export class EdgeTmsClient {
  private secretId: string;
  private secretKey: string;
  private region: string;
  private endpoint: string;

  constructor(options: {
    credential: { secretId: string; secretKey: string };
    region?: string;
    profile?: { httpProfile?: { endpoint?: string } };
  }) {
    this.secretId = options.credential.secretId;
    this.secretKey = options.credential.secretKey;
    this.region = options.region || "ap-shanghai";
    this.endpoint = options.profile?.httpProfile?.endpoint || "tms.tencentcloudapi.com";
  }

  async TextModeration(params: Record<string, unknown>): Promise<{
    Suggestion?: string;
    Label?: string;
    SubLabel?: string;
  }> {
    const service = "tms";
    const host = this.endpoint;
    const action = "TextModeration";
    const version = "2020-12-29";
    const timestamp = Math.floor(Date.now() / 1000);
    const date = new Date(timestamp * 1000).toISOString().split("T")[0];
    const payload = JSON.stringify(params);

    const hashedRequestPayload = createHash("sha256").update(payload).digest("hex");
    const httpRequestMethod = "POST";
    const canonicalUri = "/";
    const canonicalQueryString = "";
    const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${host}\nx-tc-action:${action.toLowerCase()}\n`;
    const signedHeaders = "content-type;host;x-tc-action";

    const canonicalRequest = `${httpRequestMethod}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${hashedRequestPayload}`;
    const algorithm = "TC3-HMAC-SHA256";
    const hashedCanonicalRequest = createHash("sha256").update(canonicalRequest).digest("hex");
    const credentialScope = `${date}/${service}/tc3_request`;
    const stringToSign = `${algorithm}\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`;

    const kDate = createHmac("sha256", "TC3" + this.secretKey).update(date).digest();
    const kService = createHmac("sha256", kDate).update(service).digest();
    const kSigning = createHmac("sha256", kService).update("tc3_request").digest();
    const signature = createHmac("sha256", kSigning).update(stringToSign).digest("hex");

    const authorization = `${algorithm} Credential=${this.secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const res = await fetch(`https://${host}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Host: host,
        Authorization: authorization,
        "X-TC-Action": action,
        "X-TC-Timestamp": String(timestamp),
        "X-TC-Version": version,
        "X-TC-Region": this.region,
      },
      body: payload,
    });

    const json = (await res.json()) as {
      Response?: {
        Suggestion?: string;
        Label?: string;
        SubLabel?: string;
        Error?: { Code: string; Message: string };
      };
    };
    if (json.Response?.Error) {
      throw new Error(`[TMS Error] ${json.Response.Error.Code}: ${json.Response.Error.Message}`);
    }
    return json.Response || {};
  }
}

export const EdgeTmsModule = {
  tms: {
    v20201229: {
      Client: EdgeTmsClient,
    },
  },
};
