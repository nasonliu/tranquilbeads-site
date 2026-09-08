import {
  AmazonListingImageUploadError,
  uploadAmazonListingImage,
} from "@/src/lib/amazon-listing-image-upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const result = await uploadAmazonListingImage(request);
    return Response.json(result, {
      status: 200,
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    const status = error instanceof AmazonListingImageUploadError ? error.status : 500;
    const message = error instanceof AmazonListingImageUploadError ? error.message : "image upload failed";
    return Response.json(
      { error: message },
      { status, headers: { "cache-control": "no-store" } },
    );
  }
}
