"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Copy,
  ExternalLink,
  X,
} from "lucide-react";
import Link from "next/link";

// ─── Nationality / Country list (ISO 3166-1, common names) ──────
const NATIONALITIES = [
  "Afghan","Albanian","Algerian","American","Andorran","Angolan","Argentine",
  "Armenian","Australian","Austrian","Azerbaijani","Bahamian","Bahraini",
  "Bangladeshi","Barbadian","Belarusian","Belgian","Belizean","Beninese",
  "Bhutanese","Bolivian","Bosnian","Botswanan","Brazilian","British","Bruneian",
  "Bulgarian","Burkinabé","Burmese","Burundian","Cambodian","Cameroonian",
  "Canadian","Cape Verdean","Central African","Chadian","Chilean","Chinese",
  "Colombian","Comorian","Congolese","Costa Rican","Croatian","Cuban","Cypriot",
  "Czech","Danish","Djiboutian","Dominican","Dutch","East Timorese","Ecuadorian",
  "Egyptian","Emirati","Equatorial Guinean","Eritrean","Estonian","Ethiopian",
  "Fijian","Filipino","Finnish","French","Gabonese","Gambian","Georgian","German",
  "Ghanaian","Greek","Grenadian","Guatemalan","Guinean","Guyanese","Haitian",
  "Honduran","Hungarian","Icelandic","Indian","Indonesian","Iranian","Iraqi",
  "Irish","Israeli","Italian","Ivorian","Jamaican","Japanese","Jordanian",
  "Kazakh","Kenyan","Kuwaiti","Kyrgyz","Laotian","Latvian","Lebanese","Liberian",
  "Libyan","Lithuanian","Luxembourgish","Malagasy","Malawian","Malaysian",
  "Maldivian","Malian","Maltese","Mauritanian","Mauritian","Mexican","Moldovan",
  "Monégasque","Mongolian","Montenegrin","Moroccan","Mozambican","Namibian",
  "Nepalese","New Zealand","Nicaraguan","Nigerian","Nigerien","North Korean",
  "North Macedonian","Norwegian","Omani","Pakistani","Palestinian","Panamanian",
  "Papua New Guinean","Paraguayan","Peruvian","Polish","Portuguese","Qatari",
  "Romanian","Russian","Rwandan","Saint Lucian","Salvadoran","Samoan",
  "Saudi Arabian","Senegalese","Serbian","Seychellois","Sierra Leonean",
  "Singaporean","Slovak","Slovenian","Somali","South African","South Korean",
  "South Sudanese","Spanish","Sri Lankan","Sudanese","Surinamese","Swedish",
  "Swiss","Syrian","Taiwanese","Tajik","Tanzanian","Thai","Togolese","Tongan",
  "Trinidadian","Tunisian","Turkish","Turkmen","Ugandan","Ukrainian","Uruguayan",
  "Uzbek","Vanuatuan","Venezuelan","Vietnamese","Yemeni","Zambian","Zimbabwean",
];

// ─── Common languages (top ~120, alphabetical) ──────────────────
const LANGUAGES = [
  "Afrikaans","Albanian","Amharic","Arabic","Armenian","Azerbaijani","Bahasa Indonesia",
  "Bahasa Malay","Basque","Belarusian","Bengali","Bosnian","Bulgarian","Burmese",
  "Cantonese","Catalan","Cebuano","Chinese (Mandarin)","Chinese (Simplified)",
  "Chinese (Traditional)","Croatian","Czech","Danish","Dari","Dutch","English",
  "Estonian","Farsi","Filipino","Finnish","French","Galician","Georgian","German",
  "Greek","Guarani","Gujarati","Haitian Creole","Hausa","Hebrew","Hindi","Hmong",
  "Hungarian","Icelandic","Igbo","Irish","Italian","Japanese","Javanese","Kannada",
  "Kazakh","Khmer","Kinyarwanda","Korean","Kurdish","Kyrgyz","Lao","Latvian",
  "Lithuanian","Luxembourgish","Macedonian","Malagasy","Malayalam","Maltese",
  "Maori","Marathi","Mongolian","Nepali","Norwegian","Odia","Pashto","Polish",
  "Portuguese","Punjabi","Quechua","Romanian","Russian","Samoan","Sanskrit",
  "Scottish Gaelic","Serbian","Shona","Sindhi","Sinhala","Slovak","Slovenian",
  "Somali","Spanish","Sundanese","Swahili","Swedish","Tagalog","Tajik","Tamil",
  "Tatar","Telugu","Thai","Tibetan","Tigrinya","Tongan","Turkish","Turkmen",
  "Ukrainian","Urdu","Uzbek","Vietnamese","Welsh","Wolof","Xhosa","Yiddish",
  "Yoruba","Zulu",
];

// ─── Searchable Select (for nationality) ────────────────────────
function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  name,
}: {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder: string;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const filtered = search
    ? options.filter((o) =>
        o.toLowerCase().startsWith(search.toLowerCase())
      )
    : options;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input
        name={name}
        value={open ? search : value}
        onChange={(e) => {
          setSearch(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          setSearch("");
        }}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-evalent-500 focus:outline-none focus:ring-1 focus:ring-evalent-500"
      />
      {value && !open && (
        <button
          type="button"
          onClick={() => {
            onChange("");
            setSearch("");
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      {open && filtered.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {filtered.slice(0, 50).map((o) => (
            <li
              key={o}
              onClick={() => {
                onChange(o);
                setSearch("");
                setOpen(false);
              }}
              className={`cursor-pointer px-3 py-1.5 text-sm hover:bg-evalent-50 ${
                o === value ? "bg-evalent-50 font-medium text-evalent-700" : "text-gray-700"
              }`}
            >
              {o}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Language Multi-Select (type-ahead with chips) ──────────────
function LanguageMultiSelect({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (langs: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = search.length > 0
    ? LANGUAGES.filter(
        (l) =>
          l.toLowerCase().startsWith(search.toLowerCase()) &&
          !selected.includes(l)
      )
    : [];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const addLang = useCallback(
    (lang: string) => {
      if (!selected.includes(lang)) {
        onChange([...selected, lang]);
      }
      setSearch("");
      setOpen(false);
      inputRef.current?.focus();
    },
    [selected, onChange]
  );

  const removeLang = (lang: string) => {
    onChange(selected.filter((l) => l !== lang));
  };

  return (
    <div ref={ref} className="relative">
      <div
        className="flex flex-wrap items-center gap-1.5 rounded-lg border border-gray-300 px-2 py-1.5 focus-within:border-evalent-500 focus-within:ring-1 focus-within:ring-evalent-500 min-h-[38px] cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {selected.map((lang) => (
          <span
            key={lang}
            className="inline-flex items-center gap-1 rounded-full bg-evalent-100 px-2.5 py-0.5 text-xs font-medium text-evalent-700"
          >
            {lang}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeLang(lang);
              }}
              className="text-evalent-500 hover:text-evalent-800"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (
              e.key === "Backspace" &&
              search === "" &&
              selected.length > 0
            ) {
              removeLang(selected[selected.length - 1]);
            }
            if (e.key === "Enter" && filtered.length > 0) {
              e.preventDefault();
              addLang(filtered[0]);
            }
          }}
          placeholder={
            selected.length === 0 ? "Start typing to add languages…" : ""
          }
          autoComplete="off"
          className="flex-1 min-w-[120px] border-none bg-transparent text-sm outline-none placeholder:text-gray-400"
        />
      </div>
      {open && filtered.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {filtered.slice(0, 20).map((l) => (
            <li
              key={l}
              onClick={() => addLang(l)}
              className="cursor-pointer px-3 py-1.5 text-sm text-gray-700 hover:bg-evalent-50"
            >
              {l}
            </li>
          ))}
        </ul>
      )}
      {open && search.length > 0 && filtered.length === 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-500 shadow-lg">
          No matching language. Press Enter to add &ldquo;{search}&rdquo; as custom.
          <button
            type="button"
            onClick={() => addLang(search)}
            className="ml-2 text-evalent-600 underline hover:text-evalent-800"
          >
            Add it
          </button>
        </div>
      )}
    </div>
  );
}

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = [currentYear, currentYear + 1, currentYear + 2];

export default function RegisterStudentPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    student_ref: string;
    jotform_link: string;
    first_name: string;
    last_name: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [admissionTermOptions, setAdmissionTermOptions] = useState<string[]>([
    "Term 1 (September)",
    "Term 2 (January)",
    "Term 3 (April)",
    "Immediate",
  ]);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    grade_applied: 7,
    date_of_birth: "",
    gender: "",
    nationality: "",
    nationality_2: "",
    languages_spoken: [] as string[],
    admission_year: currentYear,
    admission_term: "",
  });

  // Fetch school config for admission term presets
  useEffect(() => {
    fetch("/api/school/dashboard")
      .then((r) => r.json())
      .then((data) => {
        const terms = data?.school?.admission_terms;
        if (terms && Array.isArray(terms) && terms.length > 0) {
          setAdmissionTermOptions(terms);
          setForm((prev) => ({ ...prev, admission_term: terms[0] }));
        } else {
          setForm((prev) => ({
            ...prev,
            admission_term: "Term 1 (September)",
          }));
        }
      })
      .catch(() => {});
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        name === "grade_applied" || name === "admission_year"
          ? parseInt(value)
          : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      // Send first_language as primary language (first in array) for backward compat
      const payload = {
        ...form,
        first_language:
          form.languages_spoken.length > 0
            ? form.languages_spoken[0]
            : "",
      };

      const res = await fetch("/api/school/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to register student");
      }

      const student = await res.json();
      setResult({
        student_ref: student.student_ref,
        jotform_link: student.jotform_link,
        first_name: student.first_name,
        last_name: student.last_name,
      });
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  const copyLink = () => {
    if (result?.jotform_link) {
      navigator.clipboard.writeText(result.jotform_link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Show success state
  if (result) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
              <h2 className="mt-4 text-xl font-semibold text-gray-900">
                Student Registered Successfully
              </h2>
              <p className="mt-2 text-gray-600">
                {result.first_name} {result.last_name} —{" "}
                {result.student_ref}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Assessment Link</CardTitle>
            <CardDescription>
              Share this link with the student to begin their assessment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <code className="flex-1 break-all text-sm text-gray-700">
                {result.jotform_link}
              </code>
              <button
                onClick={copyLink}
                className="flex-shrink-0 rounded-md p-2 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
              >
                {copied ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </button>
            </div>
            <div className="flex gap-3">
              <a
                href={result.jotform_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button variant="outline" className="w-full">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Assessment
                </Button>
              </a>
              <Button onClick={copyLink} className="flex-1">
                <Copy className="mr-2 h-4 w-4" />
                {copied ? "Copied!" : "Copy Link"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setResult(null);
              setForm({
                first_name: "",
                last_name: "",
                grade_applied: 7,
                date_of_birth: "",
                gender: "",
                nationality: "",
                nationality_2: "",
                languages_spoken: [],
                admission_year: currentYear,
                admission_term: admissionTermOptions[0] || "",
              });
              setSaving(false);
            }}
          >
            Register Another Student
          </Button>
          <Link href="/school">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/school">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Register Student
          </h1>
          <p className="mt-1 text-gray-500">
            Register a student to generate their assessment link.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Student Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  name="first_name"
                  value={form.first_name}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-evalent-500 focus:outline-none focus:ring-1 focus:ring-evalent-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  name="last_name"
                  value={form.last_name}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-evalent-500 focus:outline-none focus:ring-1 focus:ring-evalent-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grade Applied *
              </label>
              <select
                name="grade_applied"
                value={form.grade_applied}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-evalent-500 focus:outline-none focus:ring-1 focus:ring-evalent-500"
              >
                {[3, 4, 5, 6, 7, 8, 9, 10].map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Admission Period */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admission Year *
                </label>
                <select
                  name="admission_year"
                  value={form.admission_year}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-evalent-500 focus:outline-none focus:ring-1 focus:ring-evalent-500"
                >
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admission Term *
                </label>
                <select
                  name="admission_term"
                  value={form.admission_term}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-evalent-500 focus:outline-none focus:ring-1 focus:ring-evalent-500"
                >
                  {admissionTermOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-400">
                  Term options can be customised in School Settings.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth
                </label>
                <input
                  name="date_of_birth"
                  type="date"
                  value={form.date_of_birth}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-evalent-500 focus:outline-none focus:ring-1 focus:ring-evalent-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-evalent-500 focus:outline-none focus:ring-1 focus:ring-evalent-500"
                >
                  <option value="">—</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Nationality — searchable dropdowns */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nationality
                </label>
                <SearchableSelect
                  name="nationality"
                  value={form.nationality}
                  onChange={(val) =>
                    setForm((prev) => ({ ...prev, nationality: val }))
                  }
                  options={NATIONALITIES}
                  placeholder="Start typing…"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Second Nationality
                </label>
                <SearchableSelect
                  name="nationality_2"
                  value={form.nationality_2}
                  onChange={(val) =>
                    setForm((prev) => ({ ...prev, nationality_2: val }))
                  }
                  options={NATIONALITIES}
                  placeholder="Optional"
                />
              </div>
            </div>

            {/* Languages spoken — type-ahead multi-select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Languages Spoken
              </label>
              <LanguageMultiSelect
                selected={form.languages_spoken}
                onChange={(langs) =>
                  setForm((prev) => ({ ...prev, languages_spoken: langs }))
                }
              />
              <p className="mt-1 text-xs text-gray-400">
                Start typing to search. The first language listed is treated as the primary language.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/school">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Register &amp; Generate Link
          </Button>
        </div>
      </form>
    </div>
  );
}
