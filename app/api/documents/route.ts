import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { extractText } from "unpdf";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { uploadFileBuffer, deleteFileObject } from "@/lib/s3";
import { chunkDocumentText } from "@/lib/ai/rag";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const documents = await prisma.document.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { chunks: true, decks: true },
      },
    },
  });

  return NextResponse.json({ documents });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contentType = request.headers.get("content-type") || "";

    let fileBuffer: Buffer;
    let fileName = "Untitled Document";
    let mimeType = "text/plain";
    let rawText = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const customTitle = formData.get("title") as string | null;

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      fileName = customTitle || file.name;
      mimeType = file.type || "application/octet-stream";
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);

      if (mimeType.includes("pdf") || fileName.endsWith(".pdf")) {
        try {
          const parsed = await extractText(new Uint8Array(arrayBuffer));
          rawText = Array.isArray(parsed.text) ? parsed.text.join("\n\n") : String(parsed.text || "");
        } catch {
          rawText = fileBuffer.toString("utf8");
        }
      } else {
        rawText = fileBuffer.toString("utf8");
      }
    } else {
      const body = await request.json();
      if (!body.text) {
        return NextResponse.json({ error: "No text provided" }, { status: 400 });
      }
      fileName = body.title || "Note";
      rawText = body.text;
      mimeType = "text/markdown";
      fileBuffer = Buffer.from(rawText, "utf8");
    }

    if (!rawText.trim()) {
      return NextResponse.json({ error: "Extracted document text was empty." }, { status: 400 });
    }

    // SHA-256 deduplication
    const contentHash = createHash("sha256").update(fileBuffer).digest("hex");

    const existingDoc = await prisma.document.findFirst({
      where: {
        userId: session.user.id,
        contentHash,
      },
      include: {
        _count: {
          select: { chunks: true, decks: true },
        },
      },
    });

    if (existingDoc) {
      return NextResponse.json({
        document: existingDoc,
        isDuplicate: true,
        message: "Document already indexed.",
      });
    }

    const fileKey = `docs/${session.user.id}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    await uploadFileBuffer(fileBuffer, fileKey, mimeType);

    // Semantic chunking
    const chunks = chunkDocumentText(rawText, 800);

    const document = await prisma.document.create({
      data: {
        userId: session.user.id,
        title: fileName,
        fileKey,
        fileSize: fileBuffer.length,
        mimeType,
        contentHash,
        rawText,
        chunks: {
          create: chunks.map((chunk, index) => ({
            chunkIndex: index,
            heading: chunk.heading ?? null,
            content: chunk.content,
            tokenCount: chunk.tokenCount,
          })),
        },
      },
      include: {
        _count: {
          select: { chunks: true, decks: true },
        },
      },
    });

    return NextResponse.json({ document, isDuplicate: false }, { status: 201 });
  } catch (error: any) {
    console.error("Document upload error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process document" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get("id");

  if (!documentId) {
    return NextResponse.json({ error: "Missing document id" }, { status: 400 });
  }

  const doc = await prisma.document.findUnique({
    where: { id: documentId, userId: session.user.id },
  });

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  await deleteFileObject(doc.fileKey);
  await prisma.document.delete({ where: { id: documentId } });

  return NextResponse.json({ success: true });
}
