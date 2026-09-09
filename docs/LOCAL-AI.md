# Local dialogue: LM Studio

Use AI_PROVIDER=local, AI_RUNTIME=lmstudio, AI_MODEL=auto and AI_BASE_URL=http://127.0.0.1:1234/v1. These settings are configured on this workstation.

Start the LM Studio server and load a chat model. Everwick checks /api/v0/models before each conversation and uses a loaded chat model, excluding embeddings and downloaded but unloaded models. Changes take effect on the next conversation without restarting Everwick. When multiple chat models are loaded, the first listed loaded chat model is selected. The game never loads or downloads models itself.

Select a citizen and use Check dialogue connection. Replies identify the model. If no model is loaded or generation fails, explicitly labeled memory-based dialogue is used. Personality, needs, memories and recent conversation history inform replies; movement and economics remain game simulation.

Start with node --env-file-if-exists=.env server/index.mjs. Test with node --env-file-if-exists=.env scripts/check-local-ai.mjs (isolated memory database; live progress unchanged). Normal suite: node --test tests/*.test.mjs.

Keep LM Studio running. Hosting elsewhere requires a model runtime reachable from the game server. Container loopback is inside the container; configure a private host connection or runtime service as appropriate. No paid API key is required.
