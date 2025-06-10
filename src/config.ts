import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import Web3 from 'web3';

dotenv.config();

export interface AppConfig {
  target: string;
  port: number;
  batchId: string;
  privateKey: bigint;
}

export async function getConfig(): Promise<AppConfig> {
  if (!process.env.BATCH_ID) {
    throw new Error('Missing required environment variable: BATCH_ID');
  }

  const keystorePath = process.env.KEYSTORE_PATH;
  const keystorePassword = process.env.KEYSTORE_PASSWORD;
  const privateKeyString = process.env.PRIVATE_KEY;

  let privateKey: bigint;
  if (privateKeyString) {
    privateKey = BigInt(privateKeyString!);
  } else if (keystorePath && keystorePassword) {
    const web3 = new Web3();
    const keystore = JSON.parse(readFileSync(keystorePath!, 'utf-8'));
    const account = await web3.eth.accounts.decrypt(keystore, keystorePassword!);
    privateKey = BigInt(account.privateKey);
  } else {
    throw new Error('Either KEYSTORE_PATH and KEYSTORE_PASSWORD or PRIVATE_KEY must be provided');
  }

  const config: AppConfig = {
    target: process.env.TARGET || 'http://localhost:1633',
    port: Number(process.env.PORT) || 3000,
    batchId: process.env.BATCH_ID,
    privateKey
  };

  return config;
}

