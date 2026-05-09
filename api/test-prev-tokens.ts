// Run: bun run test-prev-tokens.ts
// Tests the full token account fetch + split logic directly with your real .env

import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { readFileSync } from "fs";

// Read .env
try {
  const raw = readFileSync(".env", "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const eq = line.indexOf("=");
    if (eq > 0) {
      const k = line.slice(0, eq).trim();
      const v = line
        .slice(eq + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      if (k && !k.startsWith("#")) process.env[k] = v;
    }
  }
} catch {
  /* ok */
}

const HELIUS_API_KEY = process.env.HELIUS_API_KEY ?? "";
const HELIUS_RPC_URL = process.env.HELIUS_RPC_URL ?? "";

function getHeliusUrl(): string {
  if (HELIUS_API_KEY)
    return `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
  if (HELIUS_RPC_URL.includes("helius")) return HELIUS_RPC_URL;
  return "https://api.mainnet-beta.solana.com";
}

// Use your OWN wallet — wallet connected to the frontend
// Change this to your actual wallet address
const WALLET = process.argv[2] ?? "vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKpBb";
const RPC = getHeliusUrl();

console.log("RPC    :", RPC.slice(0, 80));
console.log("Wallet :", WALLET, "\n");

async function withTimeout<T>(
  p: Promise<T>,
  ms: number,
  label: string,
): Promise<T | null> {
  return Promise.race([
    p,
    new Promise<null>((r) =>
      setTimeout(() => {
        console.warn(`  ⚠ TIMEOUT: ${label}`);
        r(null);
      }, ms),
    ),
  ]);
}

async function fetchAllTokenAccounts(address: string) {
  const url = RPC;
  const t0 = Date.now();

  const [splResp, t22Resp] = await Promise.all([
    withTimeout(
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getTokenAccountsByOwner",
          params: [
            address,
            { programId: TOKEN_PROGRAM_ID.toBase58() },
            { encoding: "jsonParsed" },
          ],
        }),
      }).then((r) => r.json()),
      12_000,
      "SPL fetch",
    ),
    withTimeout(
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "getTokenAccountsByOwner",
          params: [
            address,
            { programId: TOKEN_2022_PROGRAM_ID.toBase58() },
            { encoding: "jsonParsed" },
          ],
        }),
      }).then((r) => r.json()),
      12_000,
      "T22 fetch",
    ),
  ]);

  console.log(`  Helius fetch took ${Date.now() - t0}ms`);

  if ((splResp as any)?.error)
    console.error("  SPL RPC error:", (splResp as any).error);
  if ((t22Resp as any)?.error)
    console.error("  T22 RPC error:", (t22Resp as any).error);

  const splAccs: any[] = (splResp as any)?.result?.value ?? [];
  const t22Accs: any[] = (t22Resp as any)?.result?.value ?? [];
  const all = [...splAccs, ...t22Accs];

  return all
    .map((acc: any) => {
      const info = acc.account?.data?.parsed?.info ?? {};
      return {
        mint: (info.mint ?? "") as string,
        amount: Number(info.tokenAmount?.uiAmount ?? 0),
        decimals: Number(info.tokenAmount?.decimals ?? 0),
        lamports: Number(acc.account?.lamports ?? 0),
        pubkey: (acc.pubkey ?? "") as string,
        program:
          acc.account?.owner === TOKEN_2022_PROGRAM_ID.toBase58()
            ? "Token-2022"
            : "SPL Token",
      };
    })
    .filter((a) => a.mint);
}

async function main() {
  console.log("=== Fetching all token accounts ===");
  const all = await fetchAllTokenAccounts(WALLET);

  const active = all.filter((a) => a.amount > 0);
  const zero = all.filter((a) => a.amount === 0);

  console.log(`  Total accounts : ${all.length}`);
  console.log(`  Active (>0)    : ${active.length}`);
  console.log(`  Zero-balance   : ${zero.length}`);

  if (zero.length === 0 && all.length === 0) {
    console.log(
      "\n  ❌ No accounts found at all — wallet may have no token history, or API key is wrong.",
    );
    return;
  }

  if (zero.length === 0) {
    console.log("\n  ℹ️  This wallet has NO zero-balance token accounts.");
    console.log(
      "     That means 'Previous Tokens' will correctly show nothing.",
    );
    console.log(
      "     Try a wallet that previously held tokens but closed/sold them.",
    );
    return;
  }

  console.log("\n=== Zero-balance (Previous) Tokens ===");
  // Group by mint
  const mintMap = new Map<
    string,
    { lamports: number; pubkeys: string[]; program: string }
  >();
  for (const acc of zero) {
    const ex = mintMap.get(acc.mint);
    if (ex) {
      ex.lamports += acc.lamports;
      ex.pubkeys.push(acc.pubkey);
    } else
      mintMap.set(acc.mint, {
        lamports: acc.lamports,
        pubkeys: [acc.pubkey],
        program: acc.program,
      });
  }

  console.log(`  Unique mints with zero-balance: ${mintMap.size}`);
  let i = 0;
  for (const [mint, info] of mintMap) {
    console.log(
      `  [${i++}] ${mint.slice(0, 16)}... | ${(info.lamports / 1e9).toFixed(6)} SOL reclaimable | ${info.program}`,
    );
    if (i >= 5) {
      console.log(`  ... and ${mintMap.size - 5} more`);
      break;
    }
  }

  // Test the summary endpoint
  console.log("\n=== Testing /api/v1/wallet/:address/summary endpoint ===");
  const resp = await withTimeout(
    fetch(`http://localhost:3000/api/v1/wallet/${WALLET}/summary`).then((r) =>
      r.json(),
    ),
    20_000,
    "summary endpoint",
  );
  if (!resp) {
    console.log(
      "  ❌ Endpoint timed out — is the backend running? Start it with: bun run dev",
    );
    return;
  }
  const data = resp as any;
  console.log(`  tokens         : ${data.tokens?.length ?? "?"}`);
  console.log(`  previousTokens : ${data.previousTokens?.length ?? "?"}`);
  if (data.previousTokens?.length > 0) {
    console.log("  ✅ previousTokens present! First entry:");
    console.log(
      "    ",
      JSON.stringify(data.previousTokens[0], null, 2).slice(0, 300),
    );
  } else {
    console.log("  ❌ previousTokens is empty in API response");
    console.log("  Full response:", JSON.stringify(data).slice(0, 500));
  }
}

main().catch(console.error);
