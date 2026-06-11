Publish packages in this order. Run commands from the relevant submodule directory.

1. Bump the version for the SDK (`celina-sdk/`) then ask me for the OTP to publish. Do not try to publish without asking for the OTP — you will get an EOTP error.

2. Bump the version of the MCP (`celina-mcp/`) then ask me for the OTP to publish. Do not try to publish without asking for the OTP — you will get an EOTP error.

3. Update dependencies for MCP HOST (`celina-mcp-host/`).

4. **Celeste AI** lives outside this meta-repo ([celeste-ai](https://github.com/andrewkimjoseph/celeste-ai)). Update its SDK dependency separately when needed.

5. With as many commits as you can, commit all changes and push — in each submodule repo, then bump submodule pointers in this parent repo if needed.
