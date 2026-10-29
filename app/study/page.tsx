"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  BookOpen,
  Sparkles,
  Download,
  Trash2,
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Tag,
  Code,
  Layers,
  FileUp,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatAnkiCsv, DbFlashcard } from "@/lib/fsrs";

interface DocumentItem {
  id: string;
  title: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
  _count: {
    chunks: number;
    decks: number;
  };
}

interface DeckItem {
  id: string;
  title: string;
  cards: DbFlashcard[];
  _count: { cards: number };
}

export default function StudyPage() {
  const [documents, setDocuments] = React.useState<DocumentItem[]>([]);
  const [selectedDocId, setSelectedDocId] = React.useState<string>("");
  const [decks, setDecks] = React.useState<DeckItem[]>([]);
  const [activeDeck, setActiveDeck] = React.useState<DeckItem | null>(null);

  // Upload state
  const [uploading, setUploading] = React.useState(false);
  const [uploadStatus, setUploadStatus] = React.useState<string>("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Generation state
  const [cardCount, setCardCount] = React.useState(5);
  const [topicFocus, setTopicFocus] = React.useState("");
  const [generating, setGenerating] = React.useState(false);

  // Review mode state
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isFlipped, setIsFlipped] = React.useState(false);
  const [reviewCount, setReviewCount] = React.useState(0);

  // Load documents and decks
  const loadData = React.useCallback(async () => {
    try {
      const [docsRes, decksRes] = await Promise.all([
        fetch("/api/documents"),
        fetch("/api/ai/flashcards"),
      ]);

      if (docsRes.ok) {
        const d = await docsRes.json();
        setDocuments(d.documents || []);
        if (d.documents?.length && !selectedDocId) {
          setSelectedDocId(d.documents[0].id);
        }
      }

      if (decksRes.ok) {
        const dk = await decksRes.json();
        setDecks(dk.decks || []);
        if (dk.decks?.length && !activeDeck) {
          setActiveDeck(dk.decks[0]);
        }
      }
    } catch {
      // quiet
    }
  }, [selectedDocId, activeDeck]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle document upload
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadStatus("Extracting semantic text & computing SHA-256...");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", file.name);

    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setUploadStatus(
          data.isDuplicate
            ? "Notice: Document already indexed in workspace."
            : `Success: Indexed into ${data.document?._count?.chunks || "multiple"} semantic chunks.`
        );
        await loadData();
        if (data.document?.id) {
          setSelectedDocId(data.document.id);
        }
      } else {
        setUploadStatus(`Upload failed: ${data.error || "Unknown error"}`);
      }
    } catch (err: any) {
      setUploadStatus(`Upload error: ${err?.message || "Failed"}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // Handle Delete Document
  async function handleDeleteDocument(docId: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await fetch(`/api/documents?id=${docId}`, { method: "DELETE" });
      await loadData();
      if (selectedDocId === docId) setSelectedDocId("");
    } catch {
      // quiet
    }
  }

  // Generate flashcards from selected document
  async function handleGenerateFlashcards() {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: selectedDocId || undefined,
          topic: topicFocus || undefined,
          count: cardCount,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        await loadData();
        // Load the new deck
        const freshDeckRes = await fetch(`/api/ai/flashcards?deckId=${data.deckId}`);
        if (freshDeckRes.ok) {
          const freshData = await freshDeckRes.json();
          setActiveDeck(freshData.deck);
          setCurrentIndex(0);
          setIsFlipped(false);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  }

  // Handle FSRS review rating
  async function handleReviewRating(rating: "Again" | "Hard" | "Good" | "Easy") {
    if (!activeDeck || !activeDeck.cards[currentIndex]) return;
    const currentCard = activeDeck.cards[currentIndex];

    try {
      await fetch("/api/ai/flashcards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: currentCard.id,
          rating,
        }),
      });

      setReviewCount((prev) => prev + 1);
      setIsFlipped(false);

      if (currentIndex < activeDeck.cards.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        // finished deck
        setCurrentIndex(0);
      }
    } catch {
      // quiet
    }
  }

  // Handle Anki CSV Export
  function handleExportAnki() {
    if (!activeDeck || !activeDeck.cards.length) return;
    const csvContent = formatAnkiCsv(activeDeck.cards);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `anki-deck-${activeDeck.title.toLowerCase().replace(/\s+/g, "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const currentCard = activeDeck?.cards?.[currentIndex];
  const progressPercent = activeDeck?.cards?.length
    ? Math.round(((currentIndex + 1) / activeDeck.cards.length) * 100)
    : 0;

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-violet-400">
                FSRS v5 Engine
              </span>
              <Badge variant="outline" className="text-[10px] border-violet-500/30 text-violet-300">
                Spaced Repetition
              </Badge>
            </div>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white">
              Study Engine & Memory Vault
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              PDF text extraction, semantic chunking, 3D interactive flashcards, and Anki CSV export.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.txt,.md"
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="gap-2 bg-violet-600 hover:bg-violet-500"
            >
              <FileUp className="h-4 w-4" />
              {uploading ? "Indexing Document..." : "Upload Document (PDF/MD)"}
            </Button>
          </div>
        </div>

        {uploadStatus ? (
          <div className="rounded-xl border border-violet-500/30 bg-violet-950/20 p-3 text-xs text-violet-200">
            {uploadStatus}
          </div>
        ) : null}

        {/* Top Split: Document Intake & Generation */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Document Intake & Selection */}
          <Card className="border-zinc-800 bg-zinc-900/60 lg:col-span-5">
            <CardHeader>
              <CardTitle className="text-base text-white">1. Select Document Context</CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Choose an indexed document from your local MinIO/disk vault.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1">
                {documents.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-center text-xs text-zinc-500">
                    No documents indexed yet. Upload a PDF, Markdown, or TXT file to start.
                  </div>
                ) : (
                  documents.map((doc) => {
                    const selected = selectedDocId === doc.id;
                    return (
                      <div
                        key={doc.id}
                        onClick={() => setSelectedDocId(doc.id)}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition ${
                          selected
                            ? "border-violet-500 bg-violet-950/20 text-white"
                            : "border-zinc-800 bg-zinc-950/60 text-zinc-300 hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <FileText className={`h-4 w-4 shrink-0 ${selected ? "text-violet-400" : "text-zinc-500"}`} />
                          <div className="truncate">
                            <div className="text-xs font-semibold truncate">{doc.title}</div>
                            <div className="text-[10px] text-zinc-500">
                              {doc._count.chunks} chunks • {Math.round(doc.fileSize / 1024)} KB
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={(e) => handleDeleteDocument(doc.id, e)}
                          className="p-1 text-zinc-500 hover:text-rose-400 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Flashcard Generation Controls */}
          <Card className="border-zinc-800 bg-zinc-900/60 lg:col-span-7">
            <CardHeader>
              <CardTitle className="text-base text-white">2. Generate FSRS Flashcards</CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Configure topic prompt and card count for local model inference.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Topic / Focus (Optional)</label>
                  <input
                    type="text"
                    value={topicFocus}
                    onChange={(e) => setTopicFocus(e.target.value)}
                    placeholder="e.g. Memory consistency, cache lines"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Number of Cards</label>
                  <select
                    value={cardCount}
                    onChange={(e) => setCardCount(Number(e.target.value))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  >
                    <option value={3}>3 Flashcards</option>
                    <option value={5}>5 Flashcards</option>
                    <option value={8}>8 Flashcards</option>
                    <option value={12}>12 Flashcards</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Button
                  onClick={handleGenerateFlashcards}
                  disabled={generating}
                  className="gap-2 bg-violet-600 hover:bg-violet-500 text-xs h-9"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {generating ? "Generating Cards..." : "Generate Deck via Local AI"}
                </Button>

                {activeDeck && activeDeck.cards?.length > 0 ? (
                  <Button
                    variant="outline"
                    onClick={handleExportAnki}
                    className="gap-2 border-zinc-700 text-xs h-9 hover:bg-zinc-800"
                  >
                    <Download className="h-3.5 w-3.5 text-violet-400" />
                    Export Anki (.csv)
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section: 3D Interactive Flashcard Review Arena */}
        {activeDeck && activeDeck.cards?.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-violet-400" />
                  {activeDeck.title}
                </h2>
                <p className="text-xs text-zinc-400">
                  Card {currentIndex + 1} of {activeDeck.cards.length} • {reviewCount} reviewed today
                </p>
              </div>

              {/* Deck selector if multiple */}
              {decks.length > 1 ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">Deck:</span>
                  <select
                    value={activeDeck.id}
                    onChange={(e) => {
                      const d = decks.find((dk) => dk.id === e.target.value);
                      if (d) {
                        setActiveDeck(d);
                        setCurrentIndex(0);
                        setIsFlipped(false);
                      }
                    }}
                    className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-300"
                  >
                    {decks.map((dk) => (
                      <option key={dk.id} value={dk.id}>
                        {dk.title} ({dk.cards?.length || dk._count?.cards || 0})
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>

            <Progress value={progressPercent} className="h-1.5" />

            {/* 3D Flippable Card */}
            <div className="perspective-1000 mx-auto max-w-2xl py-4">
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="cursor-pointer transition-transform duration-500"
              >
                <div
                  className={`relative min-h-[340px] w-full rounded-2xl border p-8 shadow-2xl transition-all duration-500 ${
                    isFlipped
                      ? "border-violet-500/50 bg-gradient-to-br from-zinc-900 via-zinc-900 to-violet-950/30"
                      : "border-zinc-800 bg-zinc-900/90 hover:border-zinc-700"
                  }`}
                >
                  {/* Top card pill */}
                  <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
                    <Badge variant="secondary" className="text-[10px]">
                      {isFlipped ? "Answer & Explanation" : "Question / Concept"}
                    </Badge>
                    <span className="text-xs text-zinc-500">Click to flip</span>
                  </div>

                  {/* Card Content */}
                  <div className="py-6 flex flex-col justify-center min-h-[180px]">
                    {!isFlipped ? (
                      <div className="space-y-4">
                        <p className="text-xl font-semibold leading-relaxed text-white">
                          {currentCard?.front}
                        </p>
                        {currentCard?.tags?.length ? (
                          <div className="flex flex-wrap gap-1.5 pt-2">
                            {currentCard.tags.map((t, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2.5 py-0.5 text-[10px] text-zinc-400"
                              >
                                <Tag className="h-2.5 w-2.5" />
                                {t}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-base leading-relaxed text-zinc-200">
                          {currentCard?.back}
                        </p>
                        {currentCard?.codeSnippet ? (
                          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-violet-200 overflow-x-auto">
                            <div className="flex items-center gap-1.5 pb-1 text-[10px] text-zinc-500 uppercase">
                              <Code className="h-3 w-3" /> Code Example
                            </div>
                            <pre>{currentCard.codeSnippet}</pre>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {/* Bottom FSRS metadata */}
                  <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
                    <span>Stability: {currentCard?.stability?.toFixed(1) ?? "0.0"}</span>
                    <span>Reps: {currentCard?.reps ?? 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* FSRS Rating Buttons */}
            <div className="mx-auto max-w-lg space-y-2">
              <div className="text-center text-xs text-zinc-400">
                Rate your recall difficulty (FSRS v5 Spaced Repetition):
              </div>
              <div className="grid grid-cols-4 gap-2">
                <Button
                  onClick={() => handleReviewRating("Again")}
                  variant="outline"
                  className="border-rose-500/30 text-rose-300 hover:bg-rose-500/20 text-xs font-semibold py-5"
                >
                  Again
                  <span className="block text-[10px] font-normal text-zinc-500">1 min</span>
                </Button>

                <Button
                  onClick={() => handleReviewRating("Hard")}
                  variant="outline"
                  className="border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs font-semibold py-5"
                >
                  Hard
                  <span className="block text-[10px] font-normal text-zinc-500">1 day</span>
                </Button>

                <Button
                  onClick={() => handleReviewRating("Good")}
                  variant="outline"
                  className="border-sky-500/30 text-sky-300 hover:bg-sky-500/20 text-xs font-semibold py-5"
                >
                  Good
                  <span className="block text-[10px] font-normal text-zinc-500">3 days</span>
                </Button>

                <Button
                  onClick={() => handleReviewRating("Easy")}
                  variant="outline"
                  className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 text-xs font-semibold py-5"
                >
                  Easy
                  <span className="block text-[10px] font-normal text-zinc-500">7 days</span>
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
