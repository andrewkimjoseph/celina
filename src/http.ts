#!/usr/bin/env node
import { app } from "./server/create-http-app.js";

const PORT = parseInt(process.env.PORT || "10000", 10);

if (!process.env.WALLET_ENCRYPTION_PRIVATE_KEY) {
  console.warn(
    "WARNING: WALLET_ENCRYPTION_PRIVATE_KEY is not set. Write tools requiring encryptedPrivateKey will fail.",
  );
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Celina HTTP server listening on port ${PORT}`);
});

process.on("SIGINT", () => {
  console.log("Shutting down server...");
  process.exit(0);
});
