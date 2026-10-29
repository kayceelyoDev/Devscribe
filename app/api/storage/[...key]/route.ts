import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getFileStream } from "@/lib/s3";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { key } = await params;
  const objectKey = key?.join("/") ?? "";

  if (!objectKey) {
    return NextResponse.json({ error: "Missing object key" }, { status: 400 });
  }

  try {
    const stream = await getFileStream(objectKey);
    const headers = new Headers();
    headers.set("Content-Type", stream.contentType ?? "application/octet-stream");
    headers.set("Cache-Control", "private, no-store");

    const fileName = objectKey.split("/").pop() ?? "download";
    headers.set("Content-Disposition", `inline; filename="${fileName}"`);

    return new NextResponse(stream.body as any, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Storage stream error:", error);
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
