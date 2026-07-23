"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Camera, FileUp, Link as LinkIcon, Wand2, Loader2, Globe } from "lucide-react";
import { AdSenseSlot } from "@/components/ads/AdSenseSlot";

type ParseStatus = {
  status?: "queued" | "processing" | "done" | "error";
  result?: {
    image_hash?: string;
    hash?: string;
  };
  error?: string;
};

type MenuAnalyzerProps = {
  targetLang: string;
  onTargetLangChange: (lang: string) => void;
};

function apiBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");
}

async function readError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null) as { detail?: string } | null;
  return body?.detail || fallback;
}

export default function MenuAnalyzer({ targetLang, onTargetLangChange }: MenuAnalyzerProps) {
  const [sourceLang, setSourceLang] = useState("auto");
  const [menuUrl, setMenuUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [showAnalyzeAd, setShowAnalyzeAd] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleTargetLangChange = (value: string | null) => {
    const nextLang = value || "en";
    onTargetLangChange(nextLang);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setMenuUrl("");
    setError("");
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMenuUrl(e.target.value);
    setSelectedFile(null);
    setError("");
  };

  const handleAnalyze = async () => {
    if (!selectedFile && !menuUrl) {
      setError("Please select a file, take a picture, or enter a URL.");
      return;
    }

    setIsAnalyzing(true);
    setShowAnalyzeAd(true);
    setError("");

    try {
      const apiUrl = apiBaseUrl();
      let taskId = "";

      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        const params = new URLSearchParams({
          source_lang: sourceLang,
          target_lang: targetLang,
        });

        const res = await fetch(`${apiUrl}/menus/parse/start?${params.toString()}`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error(await readError(res, "Failed to start parsing from file"));
        taskId = ((await res.json()) as { task_id?: string }).task_id || "";
      } else {
        const res = await fetch(`${apiUrl}/menus/parse/url/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: menuUrl,
            source_lang: sourceLang,
            target_lang: targetLang,
          }),
        });
        if (!res.ok) throw new Error(await readError(res, "Failed to start parsing from URL"));
        taskId = ((await res.json()) as { task_id?: string }).task_id || "";
      }

      if (!taskId) throw new Error("Server did not return a parse task.");

      let resultData: ParseStatus["result"];
      const startedAt = Date.now();
      while (!resultData) {
        if (Date.now() - startedAt > 120000) {
          throw new Error("Parsing is still running. Please try again in a moment.");
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
        const statusRes = await fetch(`${apiUrl}/menus/parse/status/${taskId}`);
        if (!statusRes.ok) throw new Error("Failed to check parse status");

        const statusData = (await statusRes.json()) as ParseStatus;
        if (statusData.status === "done") {
          resultData = statusData.result;
        } else if (statusData.status === "error") {
          throw new Error(statusData.error || "Parsing failed on server");
        }
      }

      const menuHash = resultData.image_hash || resultData.hash;
      if (!menuHash) throw new Error("Parsed data did not contain a menu hash.");
      window.location.assign(`/?menu_hash=${menuHash}&lang=${encodeURIComponent(targetLang)}`);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An error occurred during analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const isAnalyzeEnabled = Boolean(selectedFile || menuUrl);

  return (
    <Card className="w-full overflow-hidden rounded-2xl border-gray-100 bg-white shadow-xl">
      <CardContent className="space-y-6 p-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Source language</label>
            <Select value={sourceLang} onValueChange={(v) => setSourceLang(v || "auto")}>
              <SelectTrigger className="h-12 w-full border-gray-300 font-medium text-purple-700">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-purple-500" />
                  <SelectValue placeholder="Select Source" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto Detect</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="zh-cn">Simplified Chinese</SelectItem>
                <SelectItem value="zh-Hant">Traditional Chinese</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Target language</label>
            <Select value={targetLang} onValueChange={handleTargetLangChange}>
              <SelectTrigger className="h-12 w-full border-gray-300 font-medium text-purple-700">
                <SelectValue placeholder="Select Target" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="zh-cn">Simplified Chinese</SelectItem>
                <SelectItem value="zh-Hant">Traditional Chinese</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            ref={cameraInputRef}
            onChange={handleFileChange}
          />
          <Button
            variant="outline"
            className="h-14 w-full rounded-xl border-0 bg-purple-100 text-base font-medium text-purple-800 transition-colors hover:bg-purple-200"
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="mr-2 h-5 w-5" />
            {selectedFile?.type.startsWith("image/") ? "Change Picture" : "Take Picture"}
          </Button>

          <input
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <Button
            variant="outline"
            className="h-14 w-full rounded-xl border border-gray-300 bg-white text-base font-medium text-purple-800 transition-colors hover:bg-gray-50"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileUp className="mr-2 h-5 w-5" />
            {selectedFile && !selectedFile.type.startsWith("image/") ? "Change File" : "Select from File"}
          </Button>

          {selectedFile && (
            <p className="truncate px-4 text-center text-sm font-medium text-green-600">
              Selected: {selectedFile.name}
            </p>
          )}

          <div className="relative">
            <LinkIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Menu webpage or share link"
              className="h-14 rounded-xl border-gray-300 pl-12"
              value={menuUrl}
              onChange={handleUrlChange}
            />
          </div>
        </div>

        {error && <p className="px-4 text-center text-sm font-medium text-red-500">{error}</p>}

        <Button
          disabled={!isAnalyzeEnabled || isAnalyzing}
          onClick={handleAnalyze}
          className="h-14 w-full rounded-xl bg-[#E5E7EB] text-base font-bold text-gray-500 transition-colors hover:bg-[#D1D5DB] disabled:cursor-not-allowed disabled:opacity-70 data-[enabled=true]:bg-purple-600 data-[enabled=true]:text-white data-[enabled=true]:hover:bg-purple-700"
          data-enabled={isAnalyzeEnabled}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-5 w-5" />
              Analyze Menu
            </>
          )}
        </Button>

        {showAnalyzeAd && (
          <AdSenseSlot
            className="rounded-xl border border-purple-100 bg-purple-50/40 p-3"
            label="Advertisement"
          />
        )}
      </CardContent>
    </Card>
  );
}
