"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type FileUploadProps = {
  label: string;
  name: string;
  required?: boolean;
  accept?: string;
  value?: File | null;
  onChange: (file: File | null) => void;
};

export const FileUpload = React.forwardRef<HTMLInputElement, FileUploadProps>(
  ({ label, name, required = false, accept = ".xlsx,.xls", value, onChange }, ref) => {
    const [file, setFile] = React.useState<File | null>(value ?? null);
    const [isDragging, setIsDragging] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const easeInOut = [0.42, 0, 0.58, 1] as const;

    React.useImperativeHandle(ref, () => fileInputRef.current as HTMLInputElement);

    React.useEffect(() => {
      setFile(value ?? null);
    }, [value]);

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        setFile(droppedFile);
        onChange(droppedFile);
      }
    };

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };

    const handleDragLeave = () => {
      setIsDragging(false);
    };

    const handleRemoveFile = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (fileInputRef.current) fileInputRef.current.value = "";
      setFile(null);
      onChange(null);
    };

    const shakeAnimation = {
      rotate: [0, -8, 8, -8, 8, -4, 4, -4, 4, 0],
      x: [0, -2, 2, -2, 2, -1, 1, -1, 1, 0],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        repeatType: "reverse" as const,
        ease: easeInOut,
      },
    };

    return (
      <motion.div className="space-y-2" whileHover={{ scale: 1.01 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}>
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-foreground">{label}</label>

        </div>

        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "relative cursor-pointer rounded-2xl border border-dashed p-6 text-center transition-all duration-200",
            isDragging
              ? "border-primary/80 bg-primary/10 ring-4 ring-primary/10"
              : file
                ? "border-emerald-500/60 bg-emerald-500/10 hover:bg-emerald-500/15"
                : "border-border/70 bg-muted/30 hover:border-primary/60 hover:bg-muted/40",
            "shadow-sm hover:shadow-md"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            name={name}
            required={required}
            className="hidden"
            accept={accept}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              const selectedFile = e.target.files?.[0] ?? null;
              setFile(selectedFile);
              onChange(selectedFile);
            }}
          />

          <AnimatePresence mode="wait">
            {file ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-card/80 p-3 shadow-sm"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-500">
                    <motion.svg
                      className="h-6 w-6"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1, rotate: 360 }}
                      transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
                    </motion.svg>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ rotate: 180, scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  onClick={handleRemoveFile}
                  className="rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center gap-3 py-4"
              >
                <motion.div
                  whileHover={shakeAnimation}
                  animate={{ y: [0, -6, 0], scale: [1, 1.12, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: easeInOut }}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary"
                >
                  <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </motion.div>
                <div className="space-y-1 text-center">
                  <motion.p className="text-sm font-medium text-foreground" whileHover={{ scale: 1.03 }}>
                    Drop your file here, or <span className="text-primary">browse</span>
                  </motion.p>
                  <p className="text-xs text-muted-foreground">Supports: .xlsx, .xls</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    );
  },
);

FileUpload.displayName = "FileUpload";
