import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const IMPORTED_DIR = path.join(process.cwd(), 'public/images/imported');
const STATIC_DIR = path.join(process.cwd(), 'public/images');

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const slug = formData.get('slug') as string | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const destDir = slug ? path.join(IMPORTED_DIR, slug) : IMPORTED_DIR;
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    const fileName = `${Date.now()}-${safeName}`;
    const destPath = path.join(destDir, fileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(destPath, buffer);

    const relPath = slug ? `/images/imported/${slug}/${fileName}` : `/images/imported/${fileName}`;
    return NextResponse.json({ url: relPath, success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

export async function GET() {
  const folders: Record<string, string[]> = {};

  // Read imported folders
  if (fs.existsSync(IMPORTED_DIR)) {
    const entries = fs.readdirSync(IMPORTED_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const folderPath = path.join(IMPORTED_DIR, entry.name);
        const files = fs.readdirSync(folderPath).filter(f =>
          /^[^.].*\.(jpg|jpeg|png|gif|webp)$/i.test(f)
        );
        folders[entry.name] = files.map(f => `/images/imported/${entry.name}/${f}`);
      }
    }
  }

  // Read static images
  const staticFiles: string[] = [];
  if (fs.existsSync(STATIC_DIR)) {
    const entries = fs.readdirSync(STATIC_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && /^[^.].*\.(jpg|jpeg|png|gif|webp)$/i.test(entry.name)) {
        staticFiles.push(`/images/${entry.name}`);
      }
    }
  }

  return NextResponse.json({ folders, staticFiles });
}
