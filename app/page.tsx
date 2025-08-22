"use client";

import { useEffect, useState, KeyboardEvent } from "react";
import NextImage from "next/image";
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
  ChevronDown,
  MessagesSquare,
  Images,
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
const WA_GROUP_LINK =
  "https://chat.whatsapp.com/HuuSMFOf6TIFOAAcpnuIH9?mode=ac_t";
const PRIMARY = "bg-rose-700 hover:bg-rose-800";

// —————————————————————————————————————————————
// Fakultas & Jurusan (dependent)
// —————————————————————————————————————————————
const FACULTIES = [
  "Sains & Teknologi",
  "Sosial & Humaniora",
  "Bisnis",
] as const;
type Fakultas = (typeof FACULTIES)[number];

const MAJORS_SAINTEK = [
  "Teknik Informatika",
  "Sistem Informasi",
  "Teknik Industri",
  "Teknik Perangkat Lunak",
  "Teknik Elektro",
] as const;
const MAJORS_SOSHUM = [
  "Ilmu Komunikasi",
  "Sastra Inggris",
  "Bahasa Inggris",
] as const;
const MAJORS_BISNIS = [
  "Akuntansi",
  "Manajemen",
  "Administrasi Bisnis",
] as const;

const MAJORS_BY_FACULTY = {
  "Sains & Teknologi": MAJORS_SAINTEK,
  "Sosial & Humaniora": MAJORS_SOSHUM,
  Bisnis: MAJORS_BISNIS,
} as const;

type Jurusan =
  | (typeof MAJORS_SAINTEK)[number]
  | (typeof MAJORS_SOSHUM)[number]
  | (typeof MAJORS_BISNIS)[number];

const WAKTU_KULIAH = ["Pagi", "Malam"] as const;
type WaktuKuliah = (typeof WAKTU_KULIAH)[number];

// —————————————————————————————————————————————
// VALIDATION
// —————————————————————————————————————————————
const phoneRegex = /^(0|\+62)[0-9]{8,}$/;
const yyyymmdd = /^\d{4}-\d{2}-\d{2}$/; // HTML date input value

const FormSchema = z
  .object({
    nama: z.string().min(2, "Nama minimal 2 karakter"),
    no_hp: z
      .string()
      .regex(
        phoneRegex,
        "Nomor HP harus diawali 0 atau +62 dan minimal 9 digit"
      ),
    tanggal_lahir: z
      .string()
      .regex(yyyymmdd, "Tanggal lahir wajib diisi")
      .refine((v) => {
        const d = new Date(v);
        return !Number.isNaN(d.getTime());
      }, "Tanggal lahir tidak valid"),
    fakultas: z
      .string()
      .refine(
        (v): v is Fakultas => (FACULTIES as readonly string[]).includes(v),
        {
          message: "Pilih fakultas",
        }
      ),
    jurusan: z.string().min(1, "Pilih jurusan"),
    waktu_kuliah: z.enum(WAKTU_KULIAH).optional(),
  })
  .superRefine((val, ctx) => {
    const allowed = MAJORS_BY_FACULTY[val.fakultas as Fakultas] as
      | readonly string[]
      | undefined;
    if (!allowed || !val.jurusan || !allowed.includes(val.jurusan)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pilih jurusan sesuai fakultas",
        path: ["jurusan"],
      });
    }
  });

type FormValues = z.infer<typeof FormSchema>;

function normalizePhone(input: string) {
  const v = input.replace(/\s+/g, "");
  if (v.startsWith("0")) return "+62" + v.slice(1);
  return v;
}

function BrandChip() {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200">
      <div className="relative h-5 w-5 overflow-hidden rounded-full ring-1 ring-amber-300">
        <NextImage
          src="/kmb-logo.png"
          alt="Logo KMB Jaya Mangala"
          width={20}
          height={20}
          priority={false}
        />
      </div>
      <span className="text-amber-800 text-xs font-medium">{ORG_NAME}</span>
    </div>
  );
}

// —————————————————————————————————————————————
// GALLERY DATA (placeholders; replace later)
// Using <img> so you don’t need next/image remote config.
// —————————————————————————————————————————————
const GALLERY = [
  {
    src: "/1.jpg",
    caption: "",
  },
  {
    src: "/5.jpg",
    caption: "",
  },
  {
    src: "/2.jpg",
    caption: "Kebaktian Bersama",
  },
  {
    src: "/3.jpg",
    caption: "KMB SPORT",
  },
  {
    src: "/4.jpg",
    caption: "",
  },
  { src: "/6.jpg", caption: "" },
  { src: "/7.jpg", caption: "" },
];

// —————————————————————————————————————————————
// COMPONENT
// —————————————————————————————————————————————
type Step = "welcome" | "gallery" | "form" | "success";

export default function DaftarPage() {
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<Step>("welcome");
  const [createdName, setCreatedName] = useState<string>("");
  const [slide, setSlide] = useState(0); // tap-to-advance index

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
    setValue,
    watch,
    setFocus,
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      nama: "",
      no_hp: "",
      tanggal_lahir: "",
      fakultas: "",
      jurusan: "",
      waktu_kuliah: undefined,
    },
    mode: "onTouched",
  });

  // derive state for selects
  const rawFak = watch("fakultas");
  const selectedFakultas: Fakultas | undefined = (
    FACULTIES as readonly string[]
  ).includes(rawFak)
    ? (rawFak as Fakultas)
    : undefined;

  const jurusanOptions = selectedFakultas
    ? MAJORS_BY_FACULTY[selectedFakultas]
    : [];
  const rawJur = watch("jurusan");
  const selectedJurusan: Jurusan | undefined = (
    jurusanOptions as readonly string[]
  ).includes(rawJur)
    ? (rawJur as Jurusan)
    : undefined;

  useEffect(() => {
    if (step === "form") {
      const t = setTimeout(() => setFocus("nama"), 200);
      return () => clearTimeout(t);
    }
  }, [step, setFocus]);

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
            tanggal_lahir: values.tanggal_lahir,
          },
        ])
        .select("nama")
        .single();

      if (error) {
        if (error.code === "23505") {
          setError("no_hp", {
            type: "manual",
            message: "Nomor HP ini sudah terdaftar.",
          });
          toast.error("Nomor sudah terdaftar", {
            description: "Silakan gunakan nomor lain atau hubungi panitia.",
          });
          return;
        }
        if (error.code === "23514") {
          setError("no_hp", {
            type: "manual",
            message: "Format nomor HP tidak valid.",
          });
          toast.error("Format nomor tidak valid", {
            description: "Gunakan format 08… atau +62…",
          });
          return;
        }
        if (
          error.code === "42501" ||
          /row-level security/i.test(error.message)
        ) {
          toast.error("Akses ditolak", {
            description:
              "Aktifkan policy INSERT untuk anon pada tabel mahasiswa.",
          });
          return;
        }
        toast.error("Gagal menyimpan", {
          description: error.message || "Terjadi kesalahan.",
        });
        return;
      }

      setCreatedName(data?.nama ?? values.nama);
      setStep("success");
      toast.success("Pendaftaran berhasil 🎉", {
        description: `Selamat datang di ${ORG_NAME}!`,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleWelcomeKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") setStep("gallery");
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  // Progress bar: proportional through gallery slides
  const progressWidth =
    step === "gallery"
      ? `${Math.round(((slide + 1) / (GALLERY.length + 1)) * 100)}%`
      : step !== "welcome"
      ? "100%"
      : "0%";

  const fabBottomClass =
    step === "form" || step === "success" ? "bottom-25" : "bottom-5";

  // Tap to advance gallery
  const handleGalleryTap = () => {
    if (slide < GALLERY.length - 1) {
      setSlide((s) => s + 1);
    } else {
      setStep("form");
      // optional: reset index if user returns later
      // setSlide(0);
    }
  };

  // Simple image preloading for the next slide (performance)
  useEffect(() => {
    if (step !== "gallery") return;
    const next = slide + 1;
    if (next < GALLERY.length && typeof window !== "undefined") {
      const img = new window.Image();
      img.src = GALLERY[next].src;
    }
  }, [step, slide]);

  return (
    <>
      {/* LIGHT background */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-stone-50 via-slate-50 to-stone-100" />

      {/* Progress bar */}
      {step !== "welcome" && (
        <div className="fixed top-0 left-0 w-full h-1 bg-slate-200 z-40">
          <div
            className="h-1 bg-rose-700 transition-[width] duration-300 ease-out"
            style={{ width: progressWidth }}
          />
        </div>
      )}

      <div className="min-h-screen flex items-center justify-center">
        <div className="mx-auto max-w-md w-full px-4">
          <AnimatePresence mode="wait" initial={false}>
            {/* ——— WELCOME ——— */}
            {step === "welcome" && (
              <motion.div
                key="welcome"
                className="min-h-screen flex flex-col items-center justify-between text-center select-none pt-24 pb-28"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                onClick={() => setStep("gallery")}
                onKeyDown={handleWelcomeKey}
                role="button"
                tabIndex={0}
              >
                <div className="px-2">
                  <div className="flex flex-col items-center">
                    <NextImage
                      src="/kmb-logo.png"
                      alt={`${ORG_NAME} Logo`}
                      width={96}
                      height={96}
                      priority={false}
                      className="drop-shadow-sm"
                    />
                  </div>

                  <h1 className="text-[28px] leading-8 font-semibold mt-6 text-slate-900">
                    Selamat Datang di {ORG_NAME}
                  </h1>

                  <blockquote className="text-[15px] leading-relaxed text-slate-700 italic max-w-sm mx-auto mt-8 mb-16">
                    “Tidak berbuat kejahatan, menambah kebajikan, memurnikan
                    hati—itulah ajaran para Buddha.”
                    <span className="not-italic text-slate-500">
                      {" "}
                      — Dhammapada 183
                    </span>
                  </blockquote>

                  <div className="flex flex-col items-center">
                    <div className="text-slate-500 animate-bounce">
                      <ChevronDown className="w-6 h-6" />
                    </div>
                    <Button
                      className={`mt-3 rounded-xl h-11 px-5 ${PRIMARY}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setStep("gallery");
                      }}
                    >
                      Lihat Kegiatan
                    </Button>
                  </div>
                  <p className="text-[13px] text-slate-600 mt-3 mb-8">
                    *Tap di mana saja untuk melanjutkan
                  </p>
                </div>
              </motion.div>
            )}

            {/* ——— GALLERY (tap to advance) ——— */}
{step === "gallery" && (
  <motion.div
    key="gallery"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.2 }}
    className="pt-16 pb-28"
  >
    <header className="mb-4 text-center">
      <BrandChip />
      <h1 className="text-[22px] font-semibold tracking-tight text-rose-900 mt-3">
        Sekilas Kegiatan
      </h1>
      <p className="text-sm text-slate-600">Tap layar untuk lanjut ke foto berikutnya.</p>
    </header>

    {/* FULL-BLEED, NO WHITE CARD, SQUARE 1:1 */}
    <div
      onClick={handleGalleryTap}
      role="button"
      aria-label="Tap untuk lanjut"
      className="select-none"
    >
      {/* premium gradient border */}
      <div className="p-[1px] rounded-[28px] bg-[conic-gradient(from_180deg_at_50%_50%,#fda4af,#fde68a,#a7f3d0,#93c5fd,#fda4af)] shadow-[0_10px_30px_rgba(0,0,0,.07)]">
        {/* inner surface */}
        <div className="relative rounded-[27px] overflow-hidden bg-gradient-to-br from-rose-50 via-amber-50 to-pink-50">
          {/* top badges */}
          <div className="absolute z-20 top-3 left-3 right-3 flex items-center justify-between">
            <span >
            </span>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-600 text-white shadow">
              {slide + 1}/{GALLERY.length}
            </span>
          </div>

          {/* SQUARE VIEWPORT (1:1) */}
          <motion.div
            className="relative w-full"
            style={{ aspectRatio: "4 / 5" }}
            whileTap={{ scale: 0.985 }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={slide}
                className="absolute inset-0"
                initial={{ opacity: 0, y: 16, scale: 0.985, rotate: -0.3 }}
                animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, y: -16, scale: 0.99, rotate: 0.3 }}
                transition={{ duration: 0.26, ease: "easeOut" }}
              >
                {/* blurred filler (cover; boleh crop) */}
                <img
                  src={GALLERY[slide].src}
                  alt=""
                  aria-hidden
                  className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-40"
                  loading="eager"
                  decoding="async"
                  draggable={false}
                />

                {/* main image: NO CROP */}
                <img
                  src={GALLERY[slide].src}
                  alt={GALLERY[slide].caption}
                  loading={slide < 1 ? "eager" : "lazy"}
                  decoding="async"
                  draggable={false}
                  className="absolute inset-0 m-auto w-full h-full object-contain drop-shadow-md"
                />

                {/* bottom caption */}
                <div className="absolute z-20 bottom-3 left-3 right-3 flex items-end justify-between">
                </div>
              </motion.div>
            </AnimatePresence>

            {/* subtle decorative glows (lightweight) */}
            <div className="pointer-events-none absolute -top-20 -left-20 h-64 w-64 rounded-full bg-rose-200/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-amber-200/30 blur-3xl" />
          </motion.div>
        </div>
      </div>

      {/* playful dots indicator */}
      <div className="mt-3 flex items-center justify-center gap-1.5">
        {GALLERY.map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all ${
              i === slide
                ? "w-6 bg-rose-600 shadow-[0_0_0_3px_rgba(255,255,255,.8)]"
                : "w-2 bg-slate-300"
            }`}
            aria-hidden
          />
        ))}
      </div>
    </div>
  </motion.div>
)}


            {/* ——— FORM ——— */}
            {step === "form" && (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="pb-28"
              >
                <header className="mb-4 text-center">
                  <BrandChip />
                  <h1 className="text-[22px] font-semibold tracking-tight text-rose-900 mt-3">
                    Form Pendaftaran
                  </h1>
                </header>

                <Card className="shadow-xl rounded-2xl border border-slate-200 bg-white">
                  <CardContent className="space-y-5">
                    {/* Nama */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor="nama"
                          className="flex items-center gap-2"
                        >
                          <User className="w-4 h-4" />
                          Nama Lengkap
                        </Label>
                        <span className="text-[11px] text-rose-700">Wajib</span>
                      </div>
                      <Input
                        id="nama"
                        placeholder="Contoh: Budi Santoso"
                        autoComplete="name"
                        autoCapitalize="words"
                        inputMode="text"
                        aria-invalid={!!errors.nama}
                        {...register("nama")}
                      />
                      {errors.nama ? (
                        <p className="text-sm text-destructive">
                          {errors.nama.message}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-500">
                          Gunakan nama lengkap sesuai identitas.
                        </p>
                      )}
                    </div>

                    {/* No HP */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor="no_hp"
                          className="flex items-center gap-2"
                        >
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
                      />
                      {errors.no_hp ? (
                        <p className="text-sm text-destructive">
                          {errors.no_hp.message}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-500">
                          Awali dengan <span className="font-mono">08…</span>{" "}
                          atau <span className="font-mono">+62…</span>.
                        </p>
                      )}
                    </div>

                    {/* Tanggal Lahir */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor="tanggal_lahir"
                          className="flex items-center gap-2"
                        >
                          <Clock className="w-4 h-4" />
                          Tanggal Lahir
                        </Label>
                        <span className="text-[11px] text-rose-700">Wajib</span>
                      </div>
                      <Input
                        id="tanggal_lahir"
                        type="date"
                        max={todayStr}
                        aria-invalid={!!errors.tanggal_lahir}
                        {...register("tanggal_lahir")}
                        className="h-12 rounded-xl"
                      />
                      {errors.tanggal_lahir ? (
                        <p className="text-sm text-destructive">
                          {errors.tanggal_lahir.message}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-500">
                          Format: YYYY-MM-DD.
                        </p>
                      )}
                    </div>

                    {/* Fakultas */}
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
                          setValue("fakultas", v as Fakultas, {
                            shouldValidate: true,
                            shouldDirty: true,
                          });
                          setValue("jurusan", "", {
                            shouldValidate: true,
                            shouldDirty: true,
                          });
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
                      {errors.fakultas && (
                        <p className="text-sm text-destructive">
                          {errors.fakultas.message}
                        </p>
                      )}
                    </div>

                    {/* Jurusan */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Jurusan</Label>
                        <span className="text-[11px] text-rose-700">Wajib</span>
                      </div>
                      <Select
                        disabled={!selectedFakultas}
                        value={selectedJurusan || undefined}
                        onValueChange={(v) =>
                          setValue("jurusan", v as Jurusan, {
                            shouldValidate: true,
                          })
                        }
                      >
                        <SelectTrigger className="h-12 rounded-xl">
                          <SelectValue
                            placeholder={
                              selectedFakultas
                                ? "Pilih jurusan"
                                : "Pilih fakultas dulu"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {jurusanOptions.map((j) => (
                            <SelectItem key={j} value={j}>
                              {j}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.jurusan && (
                        <p className="text-sm text-destructive">
                          {errors.jurusan.message}
                        </p>
                      )}
                    </div>

                    {/* Waktu Kuliah (opsional) */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Waktu Kuliah (opsional)
                      </Label>
                      <Select
                        onValueChange={(v) =>
                          setValue("waktu_kuliah", v as WaktuKuliah, {
                            shouldValidate: true,
                          })
                        }
                      >
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
                      <p className="text-[11px] text-slate-500">
                        Boleh dikosongkan bila belum pasti.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* ——— SUCCESS ——— */}
            {step === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="pb-28"
              >
                <header className="mb-6 text-center">
                  <BrandChip />
                  <div className="mx-auto mt-4 w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-amber-900" />
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold text-rose-900">
                    Pendaftaran Berhasil
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    {createdName
                      ? `Terima kasih, ${createdName}! `
                      : "Terima kasih! "}
                    Selamat bergabung di {ORG_NAME}. Semoga damai dan sejahtera
                    🌿
                  </p>
                </header>

                <Card className="shadow-xl rounded-2xl border border-slate-200 bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2 text-rose-900">
                      <MessagesSquare className="w-5 h-5" />
                      Grup WhatsApp {ORG_NAME}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      className={`w-full h-12 rounded-xl ${PRIMARY}`}
                      asChild
                    >
                      <a
                        href={WA_GROUP_LINK}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Buka WhatsApp Group
                      </a>
                    </Button>
                    {/* Share button removed as requested */}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Sticky action bars */}
      {step === "form" && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white p-3"
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
          }}
        >
          <div className="mx-auto max-w-md flex items-center gap-3">
            <Button
              className={`flex-1 h-12 rounded-xl ${PRIMARY}`}
              onClick={handleSubmit(onSubmit)}
              disabled={submitting}
            >
              {submitting ? "Menyimpan..." : "Daftar Sekarang"}
            </Button>
          </div>
        </div>
      )}

      {step === "success" && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white p-3"
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
          }}
        >
          <div className="mx-auto max-w-md flex items-center gap-3">
            <Button className={`flex-1 h-12 rounded-xl ${PRIMARY}`} asChild>
              <a href={WA_GROUP_LINK} target="_blank" rel="noopener noreferrer">
                Join WhatsApp
              </a>
            </Button>
          </div>
        </div>
      )}

      {/* Always-on WhatsApp FAB */}
      <a
        href={WA_GROUP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Gabung Grup WhatsApp"
        className={`fixed right-5 z-50 inline-flex items-center justify-center w-14 h-14 rounded-full shadow-lg bg-green-500 hover:bg-green-600 active:scale-95 transition ${fabBottomClass}`}
      >
        <MessagesSquare className="w-7 h-7 text-white" />
      </a>

      <Toaster position="top-center" />
    </>
  );
}
