require('dotenv').config({ path: './.env.local' });
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = 'feisman-power'; // 注意没有 -private
const KEY = `test-${Date.now()}.txt`;

async function main() {
  try {
    await client.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: KEY,
      Body: 'Hello R2',
    }));
    console.log(`✅ 成功写入 ${BUCKET}/${KEY}`);
    // 尝试读取
    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    const get = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: KEY }));
    console.log(`✅ 读取内容:`, await get.Body.transformToString());
  } catch (err) {
    console.error(`❌ 失败:`, err.message);
    if (err.Code) console.error(`代码: ${err.Code}`);
  }
}
main();