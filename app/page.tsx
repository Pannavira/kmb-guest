"use client";

import { useEffect, useRef, useState, KeyboardEvent } from "react";
import Image from "next/image";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/utils/supabase/client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  User,
  School,
  Clock,
  CheckCircle2,
  Copy,
  Share2,
  MessageSquare,
  ChevronDown,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Toaster, toast } from "sonner";

// —————————————————————————————————————————————
// CONFIG
// —————————————————————————————————————————————
const ORG_NAME = "KMB Jaya Mangala";
const WA_GROUP_LINK = "https://chat.whatsapp.com/REPLACE_ME";

// Palet dari logo (rose/red utama, amber sekunder)
const PRIMARY = "bg-rose-700 hover:bg-rose-800";

// —————————————————————————————————————————————
// Fakultas & Jurusan (dependent)
// —————————————————————————————————————————————
const FACULTIES = ["Sains & Teknologi", "Sosial & Humaniora", "Bisnis"] as const;
type Fakultas = typeof FACULTIES[number];

const MAJORS_SAINTEK = [
  "Teknik Informatika",
  "Sistem Informasi",
  "Teknik Industri",
  "Teknik Perangkat Lunak",
  "Teknik Elektro",
] as const;
const MAJORS_SOSHUM = ["Ilmu Komunikasi", "Sastra Inggris", "Bahasa Inggris"] as const;
const MAJORS_BISNIS = ["Akuntansi", "Manajemen", "Administrasi Bisnis"] as const;

const MAJORS_BY_FACULTY = {
  "Sains & Teknologi": MAJORS_SAINTEK,
  "Sosial & Humaniora": MAJORS_SOSHUM,
  "Bisnis": MAJORS_BISNIS,
} as const;

type Jurusan =
  | (typeof MAJORS_SAINTEK)[number]
  | (typeof MAJORS_SOSHUM)[number]
  | (typeof MAJORS_BISNIS)[number];

// Waktu Kuliah (opsional)
const WAKTU_KULIAH = ["Pagi", "Malam"] as const;
type WaktuKuliah = typeof WAKTU_KULIAH[number];

// —————————————————————————————————————————————
// VALIDATION
// —————————————————————————————————————————————
const phoneRegex = /^(0|\+62)[0-9]{8,}$/;

const FormSchema = z
  .object({
    nama: z.string().min(2, "Nama minimal 2 karakter"),
    no_hp: z
      .string()
      .regex(phoneRegex, "Nomor HP harus diawali 0 atau +62 dan minimal 9 digit"),
    fakultas: z.enum(FACULTIES, { required_error: "Pilih fakultas" }),
    jurusan: z.string({ required_error: "Pilih jurusan" }),
    waktu_kuliah: z.enum(WAKTU_KULIAH).optional(),
  })
  .superRefine((val, ctx) => {
    const allowed = MAJORS_BY_FACULTY[val.fakultas as Fakultas] as readonly string[];
    if (!val.jurusan || !allowed.includes(val.jurusan)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pilih jurusan sesuai fakultas",
        path: ["jurusan"],  
      });
    }
  });

type FormValues = z.infer<typeof FormSchema>;

// Normalize: "08xxxxxxxxx" -> "+628xxxxxxxxx"
function normalizePhone(input: string) {
  const v = input.replace(/\s+/g, "");
  if (v.startsWith("0")) return "+62" + v.slice(1);
  return v;
}

// WhatsApp icon (brand)
function WhatsAppIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M19.11 17.79c-.28-.14-1.67-.82-1.93-.92-.26-.1-.45-.14-.64.14s-.73.92-.9 1.1c-.17.18-.33.2-.61.07-.28-.14-1.2-.44-2.29-1.4-.85-.76-1.43-1.7-1.6-1.98-.17-.28-.02-.43.12-.57.12-.12.28-.32.42-.48.14-.16.18-.28.28-.47.09-.19.05-.35-.02-.49-.07-.14-.64-1.55-.88-2.13-.23-.56-.47-.49-.64-.49h-.55c-.19 0-.49.07-.75.35-.26.28-1 1-1 2.45s1.03 2.84 1.17 3.04c.14.2 2.03 3.1 4.92 4.34.69.3 1.23.48 1.65.62.69.22 1.32.19 1.82.12.56-.08 1.67-.68 1.9-1.34.23-.66.23-1.23.16-1.34-.06-.11-.25-.18-.53-.32z" />
      <path d="M26.7 5.3A14 14 0 0 0 5.26 26.7L4 28l1.43-.38A14 14 0 1 0 26.7 5.3zM16 27a11 11 0 0 1-5.61-1.54l-.4-.24-3 .8.8-2.93-.26-.43A11 11 0 1 1 27 16 11 11 0 0 1 16 27z" />
    </svg>
  );
}

// Brand chip
function BrandChip() {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200">
      <div className="relative h-5 w-5 overflow-hidden rounded-full ring-1 ring-amber-300">
        <Image src="/kmb-logo.png" alt="Logo KMB Jaya Mangala" fill sizes="20px" />
      </div>
      <span className="text-amber-800 text-xs font-medium">{ORG_NAME}</span>
    </div>
  );
}

export default function DaftarPage() {
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<"welcome" | "form" | "success">("welcome");
  const [createdName, setCreatedName] = useState<string>("");

  const nameRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      nama: "",
      no_hp: "",
      fakultas: undefined,
      jurusan: undefined,
      waktu_kuliah: undefined,
    },
    mode: "onTouched",
  });

  const selectedFakultas = watch("fakultas") as Fakultas | undefined;
  const selectedJurusan = watch("jurusan") as Jurusan | undefined;
  const jurusanOptions = selectedFakultas ? MAJORS_BY_FACULTY[selectedFakultas] : [];

  useEffect(() => {
    if (step === "form") {
      const t = setTimeout(() => nameRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [step]);

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const normalizedPhone = normalizePhone(values.no_hp);
      setValue("no_hp", normalizedPhone, { shouldValidate: true });

      const { data, error } = await supabase
        .from("mahasiswa")
        .insert([
          {
            nama: values.nama.trim(),
            no_hp: normalizedPhone,
            fakultas: values.fakultas,
            jurusan: values.jurusan,
            waktu_kuliah: values.waktu_kuliah ?? null,
          },
        ])
        .select("nama")
        .single();

      if (error) {
        if (error.code === "23505") {
          setError("no_hp", { type: "manual", message: "Nomor HP ini sudah terdaftar." });
          toast.error("Nomor sudah terdaftar", {
            description: "Silakan gunakan nomor lain atau hubungi panitia.",
          });
          return;
        }
        if (error.code === "23514") {
          setError("no_hp", { type: "manual", message: "Format nomor HP tidak valid." });
          toast.error("Format nomor tidak valid", {
            description: "Gunakan format 08… atau +62…",
          });
          return;
        }
        if (
          error.message?.toLowerCase().includes("row-level security") ||
          error.code === "42501" ||
          (error as any).status === 403
        ) {
          toast.error("Akses ditolak", {
            description: "Aktifkan policy INSERT untuk anon pada tabel mahasiswa.",
          });
          return;
        }
        toast.error("Gagal menyimpan", { description: error.message || "Terjadi kesalahan." });
        return;
      }

      setCreatedName(data?.nama ?? values.nama);
      setStep("success");
      toast.success("Pendaftaran berhasil 🎉", { description: `Selamat datang di ${ORG_NAME}!` });
    } finally {
      setSubmitting(false);
    }
  };

  const tryShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${ORG_NAME} – Grup WhatsApp`,
          text: `Yuk gabung ke grup WhatsApp ${ORG_NAME}!`,
          url: WA_GROUP_LINK,
        });
      } catch {}
    } else {
      await navigator.clipboard.writeText(WA_GROUP_LINK);
      toast("Tautan disalin", { description: "Link grup disalin ke clipboard." });
    }
  };

  const handleWelcomeKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") setStep("form");
  };

  // Tailwind: ensure both classes appear for JIT
  const fabBottomClass = step === "form" ? "bottom-20" : "bottom-5"; // bottom-5 | bottom-20

  return (
    <>
      {/* Background */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-stone-50 via-slate-50 to-stone-100" />
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(60rem_40rem_at_50%_-10%,rgba(245,158,11,0.08),transparent)]" />
      <motion.span
        aria-hidden
        className="pointer-events-none fixed -top-24 -left-24 w-72 h-72 rounded-full bg-rose-200/30 blur-3xl -z-10"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.span
        aria-hidden
        className="pointer-events-none fixed -bottom-24 -right-24 w-80 h-80 rounded-full bg-sky-200/30 blur-3xl -z-10"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Progress bar (hidden on welcome) */}
      {step !== "welcome" && (
        <div className="fixed top-0 left-0 w-full h-1 bg-muted/40 z-40">
          <motion.div
            className="h-1 bg-rose-700"
            initial={{ width: "0%" }}
            animate={{ width: step === "form" ? "50%" : "100%" }}
            transition={{ type: "spring", stiffness: 80, damping: 20 }}
          />
        </div>
      )}

      <div className="min-h-screen flex items-center justify-center">
        <div className="mx-auto max-w-md w-full px-4">
          <AnimatePresence mode="wait">
            {/* ——— WELCOME ——— */}
            {step === "welcome" && (
              <motion.div
                key="welcome"
                className="min-h-screen flex flex-col items-center justify-between text-center select-none pt-24 pb-28"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.45 }}
                onClick={() => setStep("form")}
                onKeyDown={handleWelcomeKey}
                role="button"
                tabIndex={0}
              >
                {/* Top branding */}
                <div className="flex flex-col items-center">
                  <div className="relative w-24 h-24 mb-4">
                    <Image
                      src="/kmb-logo.png"
                      alt={`${ORG_NAME} Logo`}
                      fill
                      sizes="96px"
                      className="drop-shadow-sm"
                    />
                  </div>
                  <BrandChip />
                </div>

                {/* Welcome text */}
                <div className="px-2">
                  <h1 className="text-[28px] leading-8 font-semibold mt-6 text-slate-900">
                    Selamat Datang di {ORG_NAME}
                  </h1>
                  <p className="text-[13px] text-slate-600 mt-2">
                    Ketuk di mana saja untuk melanjutkan
                  </p>

                  <blockquote className="mt-6 text-[15px] leading-relaxed text-slate-700 italic max-w-sm mx-auto">
                    “Tidak berbuat kejahatan, menambah kebajikan, memurnikan hati—itulah ajaran para Buddha.”
                    <span className="not-italic text-slate-500"> — Dhammapada 183</span>
                  </blockquote>
                </div>

                {/* Hint to continue */}
                <div className="flex flex-col items-center">
                  <motion.div
                    animate={{ y: [0, 6, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    className="text-slate-500"
                  >
                    <ChevronDown className="w-6 h-6" />
                  </motion.div>
                  <Button
                    className={`mt-3 rounded-xl h-11 px-5 ${PRIMARY}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setStep("form");
                    }}
                  >
                    Mulai Pendaftaran
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ——— FORM ——— */}
            {step === "form" && (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.25 }}
                className="pb-28"
              >
                <header className="mb-4 text-center">
                  <BrandChip />
                  <h1 className="text-[22px] font-semibold tracking-tight text-rose-900 mt-3">
                    Form Pendaftaran Anggota
                  </h1>
                  <p className="text-[13px] text-slate-600 mt-1">
                    Isi data berikut secara singkat. Data dipakai untuk keperluan internal {ORG_NAME}.
                  </p>
                </header>

                <Card className="shadow-xl rounded-2xl border-0 bg-white/90">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[16px] text-amber-800">Data Mahasiswa</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Nama */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="nama" className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Nama Lengkap
                        </Label>
                        <span className="text-[11px] text-rose-700">Wajib</span>
                      </div>
                      <Input
                        ref={nameRef}
                        id="nama"
                        placeholder="Contoh: Budi Santoso"
                        autoComplete="name"
                        autoCapitalize="words"
                        inputMode="text"
                        aria-invalid={!!errors.nama}
                        {...register("nama")}
                      />
                      {errors.nama ? (
                        <p className="text-sm text-destructive">{errors.nama.message}</p>
                      ) : (
                        <p className="text-[11px] text-slate-500">Gunakan nama lengkap sesuai identitas.</p>
                      )}
                    </div>

                    {/* No HP */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="no_hp" className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          Nomor WhatsApp
                        </Label>
                        <span className="text-[11px] text-rose-700">Wajib</span>
                      </div>
                        <Input
                          id="no_hp"
                          inputMode="tel"
                          placeholder="+62 812 3456 7890"
                          aria-invalid={!!errors.no_hp}
                          {...register("no_hp")}
                          className=""
                        />
                      {errors.no_hp ? (
                        <p className="text-sm text-destructive">{errors.no_hp.message}</p>
                      ) : (
                        <p className="text-[11px] text-slate-500">
                          Awali dengan <span className="font-mono">08…</span> atau <span className="font-mono">+62…</span>.
                        </p>
                      )}
                    </div>

                    {/* Fakultas (required) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <School className="w-4 h-4" />
                          Fakultas
                        </Label>
                        <span className="text-[11px] text-rose-700">Wajib</span>
                      </div>
                      <Select
                        value={selectedFakultas || undefined}
                        onValueChange={(v) => {
                          setValue("fakultas", v as Fakultas, { shouldValidate: true, shouldDirty: true });
                          setValue("jurusan", undefined as unknown as string, { shouldValidate: true, shouldDirty: true });
                        }}
                      >
                        <SelectTrigger className="h-12 rounded-xl">
                          <SelectValue placeholder="Pilih fakultas" />
                        </SelectTrigger>
                        <SelectContent>
                          {FACULTIES.map((f) => (
                            <SelectItem key={f} value={f}>
                              {f}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.fakultas && <p className="text-sm text-destructive">{errors.fakultas.message}</p>}
                    </div>

                    {/* Jurusan (required, depends on Fakultas) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Jurusan</Label>
                        <span className="text-[11px] text-rose-700">Wajib</span>
                      </div>
                      <Select
                        disabled={!selectedFakultas}
                        value={selectedJurusan || undefined}
                        onValueChange={(v) => setValue("jurusan", v as Jurusan, { shouldValidate: true })}
                      >
                        <SelectTrigger className="h-12 rounded-xl">
                          <SelectValue placeholder={selectedFakultas ? "Pilih jurusan" : "Pilih fakultas dulu"} />
                        </SelectTrigger>
                        <SelectContent>
                          {jurusanOptions.map((j) => (
                            <SelectItem key={j} value={j}>
                              {j}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.jurusan && <p className="text-sm text-destructive">{errors.jurusan.message}</p>}
                    </div>

                    {/* Waktu Kuliah (opsional) */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Waktu Kuliah (opsional)
                      </Label>
                      <Select onValueChange={(v) => setValue("waktu_kuliah", v as WaktuKuliah, { shouldValidate: true })}>
                        <SelectTrigger className="h-12 rounded-xl">
                          <SelectValue placeholder="Pilih waktu kuliah" />
                        </SelectTrigger>
                        <SelectContent>
                          {WAKTU_KULIAH.map((w) => (
                            <SelectItem key={w} value={w}>
                              {w}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-slate-500">Boleh dikosongkan bila belum pasti.</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* ——— SUCCESS ——— */}
            {step === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.25 }}
                className="pb-28"
              >
                <header className="mb-6 text-center">
                  <BrandChip />
                  <div className="mx-auto mt-4 w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-amber-900" />
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold text-rose-900">Pendaftaran Berhasil</h2>
                  <p className="text-sm text-slate-600 mt-1">
                    {createdName ? `Terima kasih, ${createdName}! ` : "Terima kasih! "}
                    Selamat bergabung di {ORG_NAME}. Semoga damai dan sejahtera 🌿
                  </p>
                </header>

                <Card className="shadow-xl rounded-2xl border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2 text-rose-900">
                      <MessageSquare className="w-5 h-5" />
                      Grup WhatsApp {ORG_NAME}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button className={`w-full h-12 rounded-xl ${PRIMARY}`} asChild>
                      <a href={WA_GROUP_LINK} target="_blank" rel="noopener noreferrer">
                        Buka WhatsApp Group
                      </a>
                    </Button>

                    <div className="grid grid-cols-2 gap-3">
                      <Button variant="outline" className="h-12 rounded-xl" onClick={tryShare}>
                        <Share2 className="w-4 h-4 mr-2" />
                        Bagikan Link
                      </Button>
                      <Button
                        variant="secondary"
                        className="h-12 rounded-xl"
                        onClick={async () => {
                          await navigator.clipboard.writeText(WA_GROUP_LINK);
                          toast("Tautan disalin");
                        }}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Salin Link
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Sticky action bar for mobile (Form & Success) */}
      {step === "form" && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white/95 backdrop-blur p-3"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
        >
          <div className="mx-auto max-w-md flex items-center gap-3">
            <Button
              className={`flex-1 h-12 rounded-xl ${PRIMARY}`}
              onClick={handleSubmit(onSubmit)}
              disabled={submitting}
            >
              {submitting ? "Menyimpan…" : "Daftar Sekarang"}
            </Button>
          </div>
        </div>
      )}

      {step === "success" && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white/95 backdrop-blur p-3"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
        >
          <div className="mx-auto max-w-md flex items-center gap-3">
            <Button className={`flex-1 h-12 rounded-xl ${PRIMARY}`} asChild>
              <a href={WA_GROUP_LINK} target="_blank" rel="noopener noreferrer">
                Join WhatsApp
              </a>
            </Button>
            <Button variant="secondary" className="h-12 rounded-xl" onClick={tryShare}>
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Always-on WhatsApp FAB (naik sedikit saat ada sticky bar) */}
      <a
        href={WA_GROUP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Gabung Grup WhatsApp"
        className={`fixed right-5 z-50 inline-flex items-center justify-center w-14 h-14 rounded-full shadow-lg
                    bg-green-500 hover:bg-green-600 active:scale-95 transition ${fabBottomClass}`}
      >
        <WhatsAppIcon className="w-7 h-7 text-white" />
      </a>

      <Toaster richColors position="top-center" />
    </>
  );
}