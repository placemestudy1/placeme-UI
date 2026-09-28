/**
 * Loads the public MCQ question bank (SPEC-0017 D1): a small `current.json`
 * pointer (cached 5 min by the CDN) and immutable `bank-<version>.json`
 * bundles, straight from the Supabase Storage public bucket -- no API call,
 * no DB read. Bundles are memoized per version for the life of the tab, and
 * the browser caches them across visits.
 *
 * An attempt always renders from the bundle version it was started with
 * (`bankVersion`), so a new release mid-attempt changes nothing for it.
 */
import type { Bank, BankQuestion } from "./mcq-types";

interface BankPointer {
  version: string;
  bundlePath: string;
}

type FetchLike = (url: string) => Promise<Pick<Response, "ok" | "status" | "json">>;

export function createBankClient({
  baseUrl,
  fetchImpl = (url) => fetch(url),
}: {
  baseUrl: string;
  fetchImpl?: FetchLike;
}) {
  const bundles = new Map<string, Promise<Bank>>();

  async function getJson<T>(path: string): Promise<T> {
    const res = await fetchImpl(`${baseUrl}/${path}`);
    if (!res.ok) throw new Error(`Couldn't load practice tests (status ${res.status})`);
    return (await res.json()) as T;
  }

  function getBankVersion(version: string): Promise<Bank> {
    let bundle = bundles.get(version);
    if (!bundle) {
      bundle = getJson<Bank>(`bank-${version}.json`);
      // A failed download must not stick: drop it so the next call retries.
      bundle.catch(() => bundles.delete(version));
      bundles.set(version, bundle);
    }
    return bundle;
  }

  return {
    /** The current release, for the test picker. */
    async getCurrentBank(): Promise<Bank> {
      const pointer = await getJson<BankPointer>("current.json");
      return getBankVersion(pointer.version);
    },
    /** A specific release, for rendering an attempt started on it. */
    getBankVersion,
  };
}

const supabaseUrl = (import.meta.env["VITE_SUPABASE_URL"] as string | undefined) ?? "";

export const bankClient = createBankClient({
  baseUrl: `${supabaseUrl}/storage/v1/object/public/mcq-bank`,
});

/** The attempt's questions, in the attempt's order. Throws if any id is missing. */
export function questionsForAttempt(bank: Bank, questionIds: string[]): BankQuestion[] {
  const byId = new Map(bank.questions.map((q) => [q.id, q]));
  return questionIds.map((id) => {
    const q = byId.get(id);
    if (!q) throw new Error(`Question ${id} is missing from bank ${bank.version}`);
    return q;
  });
}
