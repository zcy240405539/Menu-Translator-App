"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Camera, FileUp, Link as LinkIcon, Wand2, Loader2, Globe } from "lucide-react";

export default function MenuAnalyzer() {
  const router = useRouter();
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("en");
  const [menuUrl, setMenuUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setMenuUrl(""); // Clear URL if file is selected
      setError("");
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMenuUrl(e.target.value);
    setSelectedFile(null); // Clear file if URL is typed
    setError("");
  };

  const handleAnalyze = async () => {
    if (!selectedFile && !menuUrl) {
      setError("Please select a file, take a picture, or enter a URL.");
      return;
    }

    setIsAnalyzing(true);
    setError("");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    try {
      let resultData;

      if (selectedFile) {
        // Handle File Upload
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("source_lang", sourceLang);
        formData.append("target_lang", targetLang);

        const res = await fetch(`${apiUrl}/menus/parse`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Failed to parse menu from file");
        resultData = await res.json();
      } else if (menuUrl) {
        // Handle URL
        const res = await fetch(`${apiUrl}/menus/parse/url`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: menuUrl,
            source_lang: sourceLang,
            target_lang: targetLang,
          }),
        });

        if (!res.ok) throw new Error("Failed to parse menu from URL");
        resultData = await res.json();
      }

      if (resultData && resultData.image_hash) {
        // Redirect to result page
        router.push(`/?menu_hash=${resultData.image_hash}&lang=${targetLang}`);
      } else {
        throw new Error("No parsed data received");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const isAnalyzeEnabled = !!(selectedFile || menuUrl);

  return (
    <Card className="w-full shadow-xl border-gray-100 rounded-2xl bg-white overflow-hidden">
      <CardContent className="p-8 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Source language</label>
            <Select value={sourceLang} onValueChange={(v) => setSourceLang(v || "auto")}>
              <SelectTrigger className="w-full text-purple-700 border-gray-300 font-medium h-12">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-purple-500" />
                  <SelectValue placeholder="Select Source" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto Detect</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="zh-cn">Simplified Chinese</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="ja">Japanese</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Target language</label>
            <Select value={targetLang} onValueChange={(v) => setTargetLang(v || "en")}>
              <SelectTrigger className="w-full text-purple-700 border-gray-300 font-medium h-12">
                <SelectValue placeholder="Select Target" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">us English</SelectItem>
                <SelectItem value="zh-cn">Simplified Chinese</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="ja">Japanese</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          {/* Take Picture (Mobile friendly) */}
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
            className="w-full h-14 bg-purple-100 hover:bg-purple-200 border-0 text-purple-800 font-medium text-base rounded-xl transition-colors"
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="mr-2 h-5 w-5" />
            {selectedFile && selectedFile.type.startsWith('image/') ? 'Change Picture' : 'Take Picture'}
          </Button>

          {/* Select from File */}
          <input 
            type="file" 
            accept="image/*,.pdf" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
          />
          <Button 
            variant="outline" 
            className="w-full h-14 bg-white hover:bg-gray-50 border border-gray-300 text-purple-800 font-medium text-base rounded-xl transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileUp className="mr-2 h-5 w-5" />
            {selectedFile && !selectedFile.type.startsWith('image/') ? 'Change File' : 'Select from File'}
          </Button>
          
          {selectedFile && (
            <p className="text-sm text-center text-green-600 font-medium truncate px-4">
              Selected: {selectedFile.name}
            </p>
          )}

          {/* URL Input */}
          <div className="relative">
            <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input 
              placeholder="Menu webpage or share link" 
              className="pl-12 h-14 border-gray-300 rounded-xl"
              value={menuUrl}
              onChange={handleUrlChange}
            />
          </div>
        </div>

        {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}

        <Button 
          disabled={!isAnalyzeEnabled || isAnalyzing}
          onClick={handleAnalyze}
          className="w-full h-14 rounded-xl text-base font-bold bg-[#E5E7EB] hover:bg-[#D1D5DB] text-gray-500 disabled:opacity-70 disabled:cursor-not-allowed transition-colors data-[enabled=true]:bg-purple-600 data-[enabled=true]:text-white data-[enabled=true]:hover:bg-purple-700"
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
      </CardContent>
    </Card>
  );
}
