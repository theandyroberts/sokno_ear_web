// PM2 process definition for soknoear.com (Next.js standalone server).
// Secrets are NOT hard-coded here — values are read from the process env,
// which the deploy sources from /var/www/soknoear/.env before pm2 start.
module.exports = {
  apps: [
    {
      name: "soknoear",
      script: ".next/standalone/server.js",
      cwd: "/var/www/soknoear",
      env: {
        NODE_ENV: "production",
        PORT: "3007",
        HOSTNAME: "127.0.0.1",
        SQLITE_PATH: "/var/lib/soknoear/ear.db",
        RESEND_API_KEY: process.env.RESEND_API_KEY,
        SUBMIT_FROM: process.env.SUBMIT_FROM || "The SoKno Ear <ear@send.note15.com>",
        SUBMIT_TO: process.env.SUBMIT_TO || "andy@note15.com",
        AGENTPHONE_WEBHOOK_SECRET: process.env.AGENTPHONE_WEBHOOK_SECRET,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        OPENAI_EXTRACTION_MODEL: process.env.OPENAI_EXTRACTION_MODEL || "gpt-5.4-nano",
      },
    },
  ],
};
