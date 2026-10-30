// AWS entry point: wires the logic to DynamoDB and SES. The AWS SDK v3 ships with the Lambda runtime.
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { createHandler } from "./core.mjs";

const env = {
  TABLE: process.env.TABLE,
  FROM: process.env.FROM,          // the SES-verified sender
  CONTACT: process.env.CONTACT,    // the email that gets revealed; lives only here, never in git
  ORIGIN: process.env.ORIGIN,      // your site, e.g. https://main.xxxx.amplifyapp.com
  PEPPER: process.env.PEPPER       // long random secret used to hash codes
};

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const ses = new SESv2Client({});
const now = () => Math.floor(Date.now() / 1000);

const store = {
  async get(pk) { return (await db.send(new GetCommand({ TableName: env.TABLE, Key: { pk } }))).Item; },
  async put(pk, item) { await db.send(new PutCommand({ TableName: env.TABLE, Item: { pk, ...item } })); },
  async del(pk) { await db.send(new DeleteCommand({ TableName: env.TABLE, Key: { pk } })); },
  async bump(pk) {
    await db.send(new UpdateCommand({ TableName: env.TABLE, Key: { pk }, UpdateExpression: "ADD attempts :one", ExpressionAttributeValues: { ":one": 1 } }));
  },
  async incr(pk, ttlSeconds) {
    const r = await db.send(new UpdateCommand({
      TableName: env.TABLE, Key: { pk },
      UpdateExpression: "ADD n :one SET #t = if_not_exists(#t, :ttl)",
      ExpressionAttributeNames: { "#t": "ttl" },
      ExpressionAttributeValues: { ":one": 1, ":ttl": now() + ttlSeconds },
      ReturnValues: "UPDATED_NEW"
    }));
    return r.Attributes.n;
  }
};

async function sendMail(to, code) {
  await ses.send(new SendEmailCommand({
    FromEmailAddress: env.FROM,
    Destination: { ToAddresses: [to] },
    Content: { Simple: {
      Subject: { Data: "Your code: " + code },
      Body: { Text: { Data: "Your code to see Aubs's email is " + code + ".\nIt lasts 10 minutes. If you didn't ask for it, ignore this message.\n" } }
    } }
  }));
}

async function sendMessage({ replyTo, name, text }) {
  await ses.send(new SendEmailCommand({
    FromEmailAddress: env.FROM,
    Destination: { ToAddresses: [env.CONTACT] },
    ReplyToAddresses: [replyTo],
    Content: { Simple: {
      Subject: { Data: "Portfolio message from " + name },
      Body: { Text: { Data: name + " (" + replyTo + ", verified by emailed code) wrote:\n\n" + text + "\n" } }
    } }
  }));
}

export const handler = createHandler({ store, sendMail, sendMessage, env, now });
