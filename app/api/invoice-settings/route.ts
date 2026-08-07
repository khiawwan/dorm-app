import { NextRequest, NextResponse } from "next/server";
import { updateInvoiceSettings } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const settings = await updateInvoiceSettings({
    address: body.address ?? null,
    footer_note: body.footer_note ?? null,
  });
  return NextResponse.json(settings);
}
