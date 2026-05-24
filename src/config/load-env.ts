import { config } from "dotenv";

// quiet: true — dotenv v17 logs to stdout by default, which breaks MCP stdio JSON
config({ quiet: true });
