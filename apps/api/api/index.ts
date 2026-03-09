import { createApp } from "../src/app";
import { connectToDatabase } from "../src/config/db";

const app = createApp();

export default async function handler(req: any, res: any) {
  await connectToDatabase();
  return app(req, res);
}
