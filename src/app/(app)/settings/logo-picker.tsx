"use client";

import { useActionState, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { uploadLogoAction, removeLogoAction } from "@/lib/actions/settings";

export default function LogoPicker({ logoUrl }: { logoUrl: string | null }) {
  const [preview, setPreview] = useState(logoUrl);
  const [state, formAction, pending] = useActionState(uploadLogoAction, {} as { error?: string; ok?: boolean });
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  }

  async function handleRemove() {
    if (!confirm("Remove the company logo?")) return;
    await removeLogoAction();
    setPreview(null);
  }

  return (
    <div className="p-5">
      <div className="flex items-start gap-5">
        {/* Logo preview */}
        <div className="relative">
          <motion.div
            layout
            className="flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-dashed border-border bg-slate-50 overflow-hidden"
          >
            {preview ? (
              <img src={preview} alt="Company logo" className="h-full w-full object-contain" />
            ) : (
              <ImageIcon className="h-8 w-8 text-muted-light" />
            )}
          </motion.div>
          {preview && (
            <button
              onClick={handleRemove}
              className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-danger text-white shadow-md hover:bg-danger-dark transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Upload form */}
        <div className="flex-1">
          <form
            action={async (fd) => {
              formAction(fd);
              // Read the file to update preview after server action
              const file = fd.get("logo") as File | null;
              if (file && file.size > 0) {
                const reader = new FileReader();
                reader.onload = (ev) => setPreview(ev.target?.result as string);
                reader.readAsDataURL(file);
              }
            }}
            className="space-y-3"
          >
            <div>
              <input
                ref={fileRef}
                type="file"
                name="logo"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-surface-hover transition-colors"
              >
                <Upload className="h-4 w-4" />
                Choose Image
              </button>
              <p className="mt-1.5 text-xs text-muted">PNG, JPG, WebP, or SVG. Max 2 MB.</p>
            </div>

            {state?.error && <p className="text-sm font-medium text-danger">{state.error}</p>}
            {state?.ok && <p className="text-sm font-medium text-success">Logo updated!</p>}

            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              {pending ? "Uploading..." : "Upload Logo"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
