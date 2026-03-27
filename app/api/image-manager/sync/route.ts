import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

const SCRIPT = '/Volumes/新加卷/Documents/ProjectNoor/scripts/sync-products.py';

export async function POST() {
  try {
    const result = execSync(`python3 "${SCRIPT}"`, {
      cwd: '/Volumes/新加卷/Documents/ProjectNoor',
      encoding: 'utf-8',
    });
    const parsed = JSON.parse(result.trim()) as {
      success: boolean;
      added: number;
      updated: number;
      total: number;
      message?: string;
    };

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    const error = err as { stderr?: string; message?: string };
    return NextResponse.json({
      error: 'Sync failed',
      detail: error?.stderr || error?.message || String(err),
    }, { status: 500 });
  }
}
