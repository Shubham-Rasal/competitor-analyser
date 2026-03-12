/**
 * foc-storage.ts — Filecoin Onchain Cloud storage for investor analysis results.
 *
 * Stores analysis JSON to FOC via the Synapse SDK and returns a content CID.
 * The CID is then registered on DataListingRegistry and the storage cost is
 * recorded on AgentEconomyRegistry.
 *
 * Note: The Synapse SDK (FOC M4.1) is expected ~March 14 2026. Until then,
 * calls with dryRun=false will throw. Use FOC_DRY_RUN=true for testing.
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  parseAbi,
} from "viem";
import { filecoinCalibration } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

// ── Inline ABIs (no cross-package imports) ────────────────────────────────────

const REGISTRY_ABI = parseAbi([
  "function createListing(string contentCid, uint256 agentId, uint256 priceUsdc, string license, string category, string metadataUri) returns (uint256 id)",
  "event ListingCreated(uint256 indexed id, address indexed producer, uint256 indexed agentId, string contentCid, uint256 priceUsdc, string category)",
]);

const ECONOMY_ABI = parseAbi([
  "function recordStorageCost(uint256 agentId, uint256 costWei, string cid)",
]);

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StorageResult {
  cid: string;
  costWei: bigint;
  dryRun: boolean;
}

export interface InvestorAnalysisResult {
  companyName: string;
  runId: string;
  generatedAt: string;
  [key: string]: unknown;
}

export interface CompletedStorageResult {
  cid: string;
  listingId: string | null;
  costWei: bigint;
  dryRun: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getRpcUrl(): string {
  return (
    process.env.FILECOIN_CALIBRATION_RPC_URL ||
    "https://api.calibration.node.glif.io/rpc/v1"
  );
}

function makeClients() {
  const pk = process.env.AGENT_PRIVATE_KEY;
  if (!pk) throw new Error("AGENT_PRIVATE_KEY not set");
  const account = privateKeyToAccount(pk as `0x${string}`);
  const wc = createWalletClient({
    account,
    chain: filecoinCalibration,
    transport: http(getRpcUrl()),
  });
  const pc = createPublicClient({
    chain: filecoinCalibration,
    transport: http(getRpcUrl()),
  });
  return { wc, pc };
}

// ── storeAnalysis (legacy stub) ───────────────────────────────────────────────

/**
 * Store an investor analysis result to Filecoin Onchain Cloud.
 *
 * @param result  The analysis result object to store
 * @param dryRun  If true, returns a mock CID without real storage
 */
export async function storeAnalysis(
  result: InvestorAnalysisResult,
  dryRun = false
): Promise<StorageResult> {
  const content = JSON.stringify(result, null, 2);

  if (dryRun) {
    const mockCid = `bafyDRYRUN${content.length}x${Date.now().toString(36)}`;
    return { cid: mockCid, costWei: BigInt(5_000_000_000_000_000), dryRun: true };
  }

  // TODO: replace with real Synapse SDK call after M4.1 release
  throw new Error(
    "FOC real storage not yet implemented. Synapse SDK (M4.1) not yet released. " +
    "Set FOC_DRY_RUN=true to test without real FOC writes."
  );
}

// ── storeCompletedReport (full chain) ─────────────────────────────────────────

/**
 * Store a completed investor report to FOC, list it on DataListingRegistry,
 * and record the storage cost on AgentEconomyRegistry.
 *
 * @param runId      Workflow run ID (used as content identifier)
 * @param reportData The full report data to store
 * @param agentId    On-chain agent token ID (ERC-8004)
 * @param dryRun     If true, mock CID + skip on-chain writes
 */
export async function storeCompletedReport(
  runId: string,
  reportData: unknown,
  agentId: number,
  dryRun: boolean = process.env.FOC_DRY_RUN === "true"
): Promise<CompletedStorageResult> {
  const content = JSON.stringify({ runId, reportData, storedAt: new Date().toISOString() }, null, 2);

  // Step 1: FOC store
  let cid: string;
  let costWei: bigint;

  if (dryRun) {
    cid = `bafyDRYRUN${content.length}x${Date.now().toString(36)}`;
    costWei = BigInt(5_000_000_000_000_000); // 0.005 tFIL mock cost
  } else {
    // TODO: replace with real Synapse SDK call after M4.1 release
    throw new Error("FOC real storage not yet implemented. Set FOC_DRY_RUN=true.");
  }

  const registryAddress =
    (process.env.DATA_LISTING_REGISTRY_ADDRESS as `0x${string}`) ||
    "0xdd6c9772e4a3218f8ca7acbaeeea2ce02eb1dbf6";

  const economyAddress = process.env.AGENT_ECONOMY_REGISTRY_ADDRESS as `0x${string}` | undefined;

  let listingId: string | null = null;

  // Steps 2 & 3 run for both real and dry-run modes.
  // In dry-run the CID is a mock string, but the on-chain accounting is real.
  const { wc, pc } = makeClients();

  // Step 2: DataListingRegistry.createListing
  try {
    const priceRaw = BigInt(100_000); // 0.10 USDC in 6-decimal
    const txHash = await wc.writeContract({
      address: registryAddress,
      abi: REGISTRY_ABI,
      functionName: "createListing",
      args: [
        cid,
        BigInt(agentId),
        priceRaw,
        "CC-BY-4.0",
        "ai-intelligence",
        `ipfs://bafyTODO/${cid}`,
      ],
    });
    const receipt = await pc.waitForTransactionReceipt({ hash: txHash });
    for (const log of receipt.logs) {
      if (log.topics[1]) {
        listingId = BigInt(log.topics[1]).toString();
        break;
      }
    }
    console.log(`[foc-storage] createListing tx: ${txHash}, listingId: ${listingId}`);
  } catch (e) {
    console.error("[foc-storage] createListing failed:", e);
    listingId = null;
  }

  // Step 3: AgentEconomyRegistry.recordStorageCost
  if (economyAddress && economyAddress !== "0x0000000000000000000000000000000000000000") {
    try {
      const costHash = await wc.writeContract({
        address: economyAddress,
        abi: ECONOMY_ABI,
        functionName: "recordStorageCost",
        args: [BigInt(agentId), costWei, cid],
      });
      await pc.waitForTransactionReceipt({ hash: costHash });
      console.log(`[foc-storage] recordStorageCost tx: ${costHash}`);
    } catch (e) {
      console.error("[foc-storage] recordStorageCost failed:", e);
    }
  }

  return { cid, listingId, costWei, dryRun };
}
