import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateRecoveryKey, hashSecret } from "@/lib/crypto";

const registerSchema = z.object({
  username: z.string().min(3),
  email: z.string().email().optional().or(z.literal("")),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => ({}));
    const parsed = registerSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username: parsed.data.username }, { email: parsed.data.email || null }],
      },
    });

    if (existing) {
      return NextResponse.json({ error: "User already exists." }, { status: 409 });
    }

    const recoveryKey = generateRecoveryKey();
    const passwordHash = await hashSecret(parsed.data.password);
    const recoveryKeyHash = await hashSecret(recoveryKey);

    const user = await prisma.user.create({
      data: {
        username: parsed.data.username,
        email: parsed.data.email || null,
        passwordHash,
        recoveryKeyHash,
        name: parsed.data.username,
      },
    });

    await prisma.userSettings.create({
      data: {
        userId: user.id,
      },
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      recoveryKey,
    });
  } catch (error) {
    console.error("Register route failed:", error);
    return NextResponse.json(
      {
        error:
          "Database is unavailable. Start the local Postgres/Redis/MinIO services first, then try registering again.",
      },
      { status: 503 },
    );
  }
}
