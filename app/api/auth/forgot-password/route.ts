import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateRecoveryKey, hashSecret, verifySecret } from "@/lib/crypto";

const forgotPasswordSchema = z.object({
  username: z.string().min(1),
  recoveryKey: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({}));
  const parsed = forgotPasswordSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { username: parsed.data.username },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const validRecoveryKey = await verifySecret(user.recoveryKeyHash, parsed.data.recoveryKey);
  if (!validRecoveryKey) {
    return NextResponse.json({ error: "Recovery key is invalid." }, { status: 401 });
  }

  const newRecoveryKey = generateRecoveryKey();
  const newPasswordHash = await hashSecret(parsed.data.newPassword);
  const newRecoveryKeyHash = await hashSecret(newRecoveryKey);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newPasswordHash,
      recoveryKeyHash: newRecoveryKeyHash,
    },
  });

  return NextResponse.json({
    ok: true,
    message: "Password reset complete.",
    newRecoveryKey,
  });
}
