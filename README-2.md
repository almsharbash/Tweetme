# Tweet me - Phase 1

Contents:
- relay/server.js : message relay (store-and-forward, sees only ciphertext)
- app/index.html  : web client (identity, encrypted 1:1 text messages, multiple relays)

## Run locally
1. Start a relay:      node relay/server.js 8787
2. Start a second one: node relay/server.js 8788   (to test multi-relay)
3. Open app/index.html in Chrome (two different browsers or profiles to test two users).
4. In Settings, set the relay list (one per line), e.g. http://localhost:8787 and http://localhost:8788.
5. Copy your public key from Settings and paste it into the other user's "add contact" box.

## Known limits of Phase 1 (to fix in later phases)
- Sender signature is not verified yet; the sender identity inside the payload is trusted.
- Single encryption per message (no Double Ratchet), so no forward secrecy yet.
- Key recovery is a JSON backup, not a 12/24-word phrase.
- No groups, calls, media, or files yet.
- Keys live in browser localStorage; clearing site data deletes the identity unless backed up.
