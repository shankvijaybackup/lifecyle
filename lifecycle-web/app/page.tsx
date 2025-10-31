'use client';
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import axios from "axios";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Select } from "../components/ui/select";
import { Skeleton } from "../components/ui/skeleton";
import { Table, Th, Td } from "../components/ui/table";
import { Switch } from "../components/ui/switch";
import { toast } from "sonner";
import { useTheme } from "next-themes";

type Asset = { vendor?: string; model: string };
type Row = Record<string, any>;

const API_BASE = "http://localhost:8000/api";

const COLUMN_DEFS = [
  { key: "input_vendor", label: "Input Vendor" },
  { key: "input_model", label: "Input Model" },
  { key: "vendor", label: "Matched Vendor" },
  { key: "model", label: "Matched Model" },
  { key: "category", label: "Category" },
  { key: "end_of_sale", label: "End of Sale" },
  { key: "end_of_support", label: "End of Support" },
  { key: "end_of_life", label: "End of Life" },
  { key: "risk_level", label: "Risk Level" },
  { key: "months_to_eol", label: "Months to EoL" },
  { key: "days_to_eol", label: "Days to EoL" },
  { key: "window_bucket", label: "Support Window" },
  { key: "recommended_refresh_date", label: "Suggested Refresh Date" },
  { key: "recommended_replacement", label: "Recommended Replacement" },
  { key: "advisory_url", label: "Advisory URL" },
  { key: "match_score", label: "Match Score" },
];

export default function Page() {
  const [minScore, setMinScore] = useState(85);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [results, setResults] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [riskFilter, setRiskFilter] = useState("all");
  const [q, setQ] = useState("");
  const { theme, setTheme } = useTheme();
  const ref = useRef<HTMLInputElement | null>(null);
  const pageSize = 200;

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const handleFile = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res: any) => {
        const rows: Asset[] = res.data
          .map((r: any) => ({
            vendor: r.vendor || r.Vendor || "",
            model: r.model || r.Model || "",
          }))
          .filter((r: Asset) => r.model);
        setAssets(rows);
        toast.success(`Loaded ${rows.length} rows from CSV`);
      },
    });
  };

  const handlePaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const rows = e.target.value
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((line) => {
        const p = line.split(",").map((s) => s.trim());
        return p.length >= 2
          ? { vendor: p[0], model: p.slice(1).join(",") }
          : { model: p[0] };
      });
    setAssets(rows);
  };

  const run = async () => {
    if (!assets.length) return toast.info("Add some assets first");
    setLoading(true);
    setResults([]);
    setPage(1);
    try {
      const chunk = 800;
      let out: Row[] = [];
      for (let i = 0; i < assets.length; i += chunk) {
        const part = assets.slice(i, i + chunk);
        const { data } = await axios.post(`${API_BASE}/check-eol`, {
          assets: part,
          min_score: minScore,
        });
        out = out.concat(data);
      }
      setResults(out);
      toast.success(`Matched ${out.filter((r) => !r.error).length}/${out.length}`);
    } catch (e: any) {
      console.error(e);
      toast.error("Lookup failed. Check API.");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let r = results;
    if (riskFilter !== "all") r = r.filter((x) => x.risk_level === riskFilter);
    if (q) {
      const ql = q.toLowerCase();
      r = r.filter(
        (x) =>
          (x.model || "").toLowerCase().includes(ql) ||
          (x.vendor || "").toLowerCase().includes(ql) ||
          (x.input_model || "").toLowerCase().includes(ql)
      );
    }
    return r;
  }, [results, riskFilter, q]);

  const paged = useMemo(() => {
    const s = (page - 1) * pageSize;
    return filtered.slice(s, s + pageSize);
  }, [filtered, page]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const buckets = useMemo(() => {
    const b: Record<string, number> = {};
    filtered.forEach((r) => {
      const k = r.window_bucket;
      if (!k || k === "expired") return;
      b[k] = (b[k] || 0) + 1;
    });
    const order = ["0-3", "3-6", "6-12", "12-24", "24+"];
    return order
      .filter((k) => b[k])
      .map((k) => ({ window: k, count: b[k] }));
  }, [filtered]);

  const exportCSV = () => {
    if (!results.length) return;
    const csv = Papa.unparse(results);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "eol_results.csv";
    a.click();
  };

  return (
    <div className="container space-y-6 py-6">
      <header className="flex items-center gap-3">
        <div className="text-xl font-extrabold">Lifecycle</div>
        <div className="text-muted-foreground">Free EoL/EoS Lookup</div>
        <div className="ml-auto flex items-center gap-4">
          <Link href="/settings" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            Settings
          </Link>
          <span className="text-sm">Dark</span>
          <Switch checked={theme === "dark"} onChange={(v) => setTheme(v ? "dark" : "light")} />
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-sm">Paste list (vendor, model)</label>
                <Textarea
                  rows={6}
                  placeholder={"Cisco, Catalyst 2960X-48FPS-L\nDell, PowerEdge R740\nFortinet 100E"}
                  onChange={handlePaste}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm">Upload CSV</label>
                <div
                  className="cursor-pointer rounded-xl border-2 border-dashed p-6 text-center"
                  onClick={() => ref.current?.click()}
                  onDrop={onDrop}
                  onDragOver={(e) => e.preventDefault()}
                >
                  Drag & drop or click to choose
                  <input
                    ref={ref}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => e.target.files && handleFile(e.target.files[0])}
                  />
                </div>
                <div className="text-xs text-muted-foreground">Headers: vendor, model</div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="grow">
                <label className="text-sm">Minimum match score: {minScore}</label>
                <input
                  type="range"
                  min={70}
                  max={100}
                  value={minScore}
                  onChange={(e) => setMinScore(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              <Button onClick={run} disabled={loading || assets.length === 0}>
                {loading ? "Checking…" : `Lookup ${assets.length || 0}`}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status & Cliff</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Assets" value={assets.length} />
              <Stat label="Results" value={results.length} />
              <Stat label="Matches" value={results.filter((r) => !r.error).length} />
            </div>
            <div className="h-[220px]">
              {loading ? (
                <Skeleton className="h-full w-full" />
              ) : buckets.length ? (
                <ResponsiveContainer>
                  <BarChart data={buckets}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="window" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Run a lookup to see your support cliff
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex items-center gap-3">
            <Input placeholder="Search vendor/model…" value={q} onChange={(e) => setQ(e.target.value)} />
            <Select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
              <option value="all">All risks</option>
              <option value="critical">Critical (0–3m)</option>
              <option value="high">High (3–6m)</option>
              <option value="medium">Medium (6–12m)</option>
              <option value="low">Low (12m+)</option>
            </Select>
            <Button variant="outline" onClick={exportCSV} disabled={!results.length}>
              Export CSV
            </Button>
            <div className="ml-auto text-sm text-muted-foreground">
              Page {page} / {pages}
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>{COLUMN_DEFS.map(({ key, label }) => <Th key={key}>{label}</Th>)}</tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 10 }).map((_, i) => (
                      <tr key={i}>
                        <Td colSpan={COLUMN_DEFS.length}>
                          <Skeleton className="h-6 w-full" />
                        </Td>
                      </tr>
                    ))
                  : paged.map((r, i) => (
                      <tr key={i} className="hover:bg-accent/40">
                        {COLUMN_DEFS.map(({ key }) => (
                          <Td key={key}>
                            {key === "advisory_url" && r[key] ? (
                              <a
                                className="underline"
                                href={String(r[key])}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {String(r[key])}
                              </a>
                            ) : (
                              String(r[key] ?? "")
                            )}
                          </Td>
                        ))}
                      </tr>
                    ))}
              </tbody>
            </Table>
          </div>

          <div className="mt-3 flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              Prev
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
