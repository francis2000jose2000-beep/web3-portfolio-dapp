import pinataSDK from "@pinata/sdk";
import { Readable } from "node:stream";

type PinataUploadResult = {
  ipfsHash: string;
  ipfsUri: string;
  gatewayUrl: string;
};

function getPinataClient(): any {
  const apiKey = process.env.PINATA_API_KEY;
  const secretKey = process.env.PINATA_SECRET_KEY;

  if (typeof apiKey !== "string" || apiKey.trim() === "") {
    throw new Error("Missing PINATA_API_KEY");
  }

  if (typeof secretKey !== "string" || secretKey.trim() === "") {
    throw new Error("Missing PINATA_SECRET_KEY");
  }

  return new (pinataSDK as any)(apiKey, secretKey);
}

export async function uploadFileBufferToPinata(params: {
  buffer: Buffer;
  filename: string;
  displayName?: string;
}): Promise<PinataUploadResult> {
  const pinata = getPinataClient();
  const stream = Readable.from(params.buffer) as Readable & { path?: string };
  stream.path = params.filename;

  const result = (await pinata.pinFileToIPFS(stream, {
    pinataMetadata: {
      name: params.displayName ?? params.filename
    },
    pinataOptions: {
      cidVersion: 1
    }
  })) as { IpfsHash: string };

  const ipfsHash = result.IpfsHash;
  return {
    ipfsHash,
    ipfsUri: `ipfs://${ipfsHash}`,
    gatewayUrl: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`
  };
}

export async function uploadJsonToPinata(
  json: Record<string, unknown>,
  params?: { displayName?: string }
): Promise<PinataUploadResult> {
  const pinata = getPinataClient();

  const result = (await pinata.pinJSONToIPFS(json, {
    pinataMetadata: {
      name: params?.displayName
    },
    pinataOptions: {
      cidVersion: 1
    }
  })) as { IpfsHash: string };

  const ipfsHash = result.IpfsHash;
  return {
    ipfsHash,
    ipfsUri: `ipfs://${ipfsHash}`,
    gatewayUrl: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`
  };
}

