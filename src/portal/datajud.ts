import { createHash } from "node:crypto";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const states = [
  "ac",
  "al",
  "ap",
  "am",
  "ba",
  "ce",
  "df",
  "es",
  "go",
  "ma",
  "mt",
  "ms",
  "mg",
  "pa",
  "pb",
  "pr",
  "pe",
  "pi",
  "rj",
  "rn",
  "rs",
  "ro",
  "rr",
  "sc",
  "se",
  "sp",
  "to",
];
export const tribunals = [
  ...states.map((s) => `tj${s}`),
  ...Array.from({ length: 6 }, (_, i) => `trf${i + 1}`),
  ...Array.from({ length: 24 }, (_, i) => `trt${i + 1}`),
  ...states.map((s) => `tre-${s}`),
  "stj",
  "tst",
  "tse",
  "stm",
  "tjmmg",
  "tjmrs",
  "tjmsp",
];
export function normalizeNumber(value: unknown): string {
  if (typeof value !== "string" || !/^[\d.\-\s]+$/.test(value))
    throw new ApiError(400, "Informe o número CNJ do processo.");
  const n = value.replace(/\D/g, "");
  if (n.length !== 20 || /^0+$/.test(n))
    throw new ApiError(400, "O número CNJ precisa ter 20 dígitos.");
  const check = 98n - (BigInt(n.slice(0, 7) + n.slice(9) + "00") % 97n);
  if (Number(n.slice(7, 9)) !== Number(check))
    throw new ApiError(400, "O dígito verificador do número CNJ é inválido.");
  return n;
}
export function inferTribunal(n: string): string | undefined {
  const justice = n[13],
    region = Number(n.slice(14, 16));
  if (justice === "8") return states[region - 1] && `tj${states[region - 1]}`;
  if (justice === "4" && region >= 1 && region <= 6) return `trf${region}`;
  if (justice === "5" && region >= 1 && region <= 24) return `trt${region}`;
  if (justice === "3") return "stj";
  return undefined;
}
export type PublicMovement = {
  key: string;
  date: string;
  title: string;
  description: string;
};
export type PublicCase = {
  number: string;
  tribunal: string;
  court: string;
  className: string;
  updatedAt: string | null;
  movements: PublicMovement[];
  source: string;
};
// CNJ publishes this public credential; it is NOT a private application secret.
const publicKey =
  "cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==";
export async function lookup(
  number: unknown,
  tribunal?: unknown,
  fetcher: typeof fetch = fetch,
): Promise<PublicCase> {
  const n = normalizeNumber(number);
  const alias = tribunal || inferTribunal(n);
  if (typeof alias !== "string" || !tribunals.includes(alias))
    throw new ApiError(400, "Selecione um tribunal válido.");
  let response: Response;
  try {
    response = await fetcher(
      `https://api-publica.datajud.cnj.jus.br/api_publica_${alias}/_search`,
      {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(15000),
        headers: {
          "Content-Type": "application/json",
          Authorization: `APIKey ${process.env.DATAJUD_API_KEY || publicKey}`,
        },
        body: JSON.stringify({
          size: 100,
          query: { match: { numeroProcesso: n } },
          sort: [{ dataHoraUltimaAtualizacao: "desc" }],
        }),
      },
    );
  } catch {
    throw new ApiError(
      502,
      "O DataJud não respondeu. Tente novamente mais tarde.",
    );
  }
  if (!response.ok)
    throw new ApiError(
      response.status === 429 ? 429 : 502,
      "Consulta ao DataJud indisponível no momento.",
    );
  let body: any;
  try {
    body = await response.json();
  } catch {
    throw new ApiError(502, "Resposta inválida do DataJud.");
  }
  if (!Array.isArray(body.hits?.hits))
    throw new ApiError(502, "Resposta inválida do DataJud.");
  const cases = body.hits.hits
    .map((h: any) => h._source)
    .filter((c: any) => c?.numeroProcesso === n);
  if (!cases.length)
    throw new ApiError(
      404,
      "Não encontrado na base pública. Isso não significa que o processo não exista.",
    );
  const movements = new Map<string, PublicMovement>();
  for (const c of cases)
    for (const m of c.movimentos || []) {
      if (!m.nome || !m.dataHora || !Number.isFinite(Date.parse(m.dataHora)))
        continue;
      const date = new Date(m.dataHora).toISOString();
      const description = (m.complementosTabelados || [])
        .map((v: any) => `${v.descricao || ""}: ${v.nome || v.valor || ""}`)
        .sort()
        .join("; ");
      const key = createHash("sha256")
        .update(
          JSON.stringify([alias, c.grau, m.codigo, date, m.nome, description]),
        )
        .digest("hex");
      movements.set(key, { key, date, title: String(m.nome), description });
    }
  const c = cases[0];
  return {
    number: n,
    tribunal: alias,
    court: c.orgaoJulgador?.nome || "",
    className: c.classe?.nome || "",
    updatedAt: c.dataHoraUltimaAtualizacao || null,
    movements: [...movements.values()].sort((a, b) =>
      b.date.localeCompare(a.date),
    ),
    source: "CNJ / DataJud",
  };
}
