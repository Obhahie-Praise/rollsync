import { generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

/**
 * Typed React helpers for UploadThing.
 *
 * Usage:
 *   const { startUpload, isUploading } = useUploadThing("orgLogo", { ... });
 */
export const { useUploadThing, uploadFiles } =
  generateReactHelpers<OurFileRouter>();
