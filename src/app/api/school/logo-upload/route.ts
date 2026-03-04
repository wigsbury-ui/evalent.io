import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * POST /api/school/logo-upload
 * Upload a school logo to Supabase Storage and update the school record.
 * Accepts multipart/form-data with a "file" field and "school_id" field.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const schoolId =
    (formData.get("school_id") as string) || session.user.schoolId;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!schoolId) {
    return NextResponse.json({ error: "No school ID" }, { status: 400 });
  }

  // Validate file type
  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "File must be an image" },
      { status: 400 }
    );
  }

  // Validate file size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json(
      { error: "File must be smaller than 2MB" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Generate a clean filename
  const ext = file.name.split(".").pop() || "png";
  const filePath = `school-logos/${schoolId}/logo.${ext}`;

  // Upload to Supabase Storage
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("assets")
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: true, // Overwrite existing logo
    });

  if (uploadError) {
    console.error("[LOGO-UPLOAD] Storage error:", uploadError);
    return NextResponse.json(
      { error: "Failed to upload file: " + uploadError.message },
      { status: 500 }
    );
  }

  // Get the public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("assets").getPublicUrl(filePath);

  // Update the school record
  const { error: updateError } = await supabase
    .from("schools")
    .update({ logo_url: publicUrl })
    .eq("id", schoolId);

  if (updateError) {
    console.error("[LOGO-UPLOAD] DB update error:", updateError);
    return NextResponse.json(
      { error: "File uploaded but failed to save URL" },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: publicUrl });
}
