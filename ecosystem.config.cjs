module.exports = {
  apps: [
    {
      name: "api",
      cwd: "./api",
      script: "npx",
      args: "tsx index.ts",
      instances: 1,
      exec_mode: "fork",
      env_file: "./.env",

      error_file: "./logs/api-error.log",
      out_file: "./logs/api-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};