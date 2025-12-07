"use client";

import { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useData, useMutation } from "@/types/hooks";
import {
  Suggestion,
  PenilaianFormData,
  StatusIde,
  UserProfile,
  Role,
} from "@/types/api";
import { formatEnumDisplay } from "@/types/utils";
import { ClipboardCheck, Eye, Search } from "lucide-react";
import { useRouter } from "next/navigation";

// Kriteria Penilaian dengan deskripsi
interface KriteriaPenilaian {
  id: number;
  nama: string;
  deskripsi: { [key: number]: string };
  maxScore: number;
}

const kriteriaPenilaian: KriteriaPenilaian[] = [
  {
    id: 1,
    nama: "Kualitas (Quality)",
    deskripsi: {
      0: "Tdk ada",
      1: "Peningkatan kualitas kerja di tempat kerja pengusul SS",
      2: "Adanya peningkatan kualitas kerja di tempat kerja pengusul SS dan kualitas kerja proses sesudahnya atau sebelumnya",
      3: "Peningkatan kualitas produk (hasil kerja) dan meningkatkan image perusahaan",
    },
    maxScore: 3,
  },
  {
    id: 2,
    nama: "Reduksi Biaya (Cost Reduction)",
    deskripsi: {
      0: "Tdk ada",
      1: "Terdapat Reduksi Biaya",
    },
    maxScore: 1,
  },
  {
    id: 3,
    nama: "Delivery",
    deskripsi: {
      0: "Tdk ada",
      1: "Memperlancar proses kerja pengusul SS",
      2: "Menjamin delivery hasil kerja yang tepat waktu pada proses berikutnya",
      3: "Menjamin delivery hasil kerja yang tepat waktu pada setiap proses",
    },
    maxScore: 3,
  },
  {
    id: 4,
    nama: "Safety, Health & Env.",
    deskripsi: {
      0: "Tdk ada",
      1: "Menjadi lebih aman dari sebelumnya",
      2: "Mencegah kecelakaan karena kecerobohan",
      3: "Mencegah kecelakaan sekalipun sudah berhati-hati / tidak ceroboh",
      4: "Dalam kondisi apapun kecelakaan bisa dicegah / tidak ada",
    },
    maxScore: 4,
  },
  {
    id: 5,
    nama: "Manfaat (Benefit)",
    deskripsi: {
      0: "Tdk ada",
      1: "Hanya dapat digunakan untuk dirinya / prosesnya sendiri",
      2: "Dapat dimanfaatkan oleh rekan kerja lain dalam satu bagian",
      3: "Dapat dimanfaatkan oleh semua bagian atau site",
    },
    maxScore: 3,
  },
  {
    id: 6,
    nama: "Keaslian Ide (Originality)",
    deskripsi: {
      0: "Tdk ada",
      1: "Ide sederhana dan hampir sama, dapat ditemukan di tempat lain",
      2: "Modifikasi dari alat atau methode yang sudah ada",
      3: "Kombinasi dari beberapa ide, tapi ada penyempurnaan dari idenya sendiri",
      4: "Merupakan ide yang baru, kreatif dan inovatif",
    },
    maxScore: 4,
  },
  {
    id: 7,
    nama: "Kepekaan (Sensitivity)",
    deskripsi: {
      0: "Tdk ada",
      1: "Memperbaiki atas saran / keluhan orang lain",
      2: "Inisiatif sendiri pada masalah sendiri yang sudah parah",
      3: "Memperbaiki hal-hal penting yang tidak diperhatikan orang lain",
    },
    maxScore: 3,
  },
  {
    id: 8,
    nama: "Perencanaan (Planning)",
    deskripsi: {
      0: "Tdk ada",
      1: "Perencanaan sederhana tanpa analisa data",
      2: "Perencanaan dengan analisa data",
    },
    maxScore: 2,
  },
  {
    id: 9,
    nama: "Pelaksanaan Ide (Implementation)",
    deskripsi: {
      0: "Tdk ada",
      1: "Dapat direalisir dengan mudah tanpa persiapan khusus",
      2: "Perlu persiapan khusus untuk merealisasikan perbaikan",
      3: "Perlu kesungguhan dan melibatkan bagian lain untuk merealisasikan perbaikan",
      4: "Perlu perhitungan teknis dan persetujuan pihak lain atau pemenuhan terhadap persyaratan standar",
    },
    maxScore: 4,
  },
  {
    id: 10,
    nama: "Sumber Daya (Resources)",
    deskripsi: {
      0: "Tdk ada",
      1: "Menggunakan sumber daya yang baru",
      2: "Sebagian menggunakan sumber daya yang ada",
      3: "Seluruhnya menggunakan sumber daya yang ada",
    },
    maxScore: 3,
  },
];

// Klasifikasi Penilaian
const klasifikasiPenilaian = [
  { nilai: "1~3", kelas: "J" },
  { nilai: "4~6", kelas: "I" },
  { nilai: "7~9", kelas: "H" },
  { nilai: "10~12", kelas: "G" },
  { nilai: "13~15", kelas: "F" },
  { nilai: "16~18", kelas: "E" },
  { nilai: "19~21", kelas: "D" },
  { nilai: "22~24", kelas: "C" },
  { nilai: "25~27", kelas: "B" },
  { nilai: "28~30", kelas: "A" },
];

export default function ScoringPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  // Always fetch suggestions with status APPROVE
  const endpoint = `/suggestions?statusIde=${StatusIde.APPROVE}`;

  const {
    data: suggestions,
    loading,
    error,
    refetch,
  } = useData<Suggestion[]>({
    endpoint,
  });

  const { data: currentUser, loading: currentUserLoading } = useData<UserProfile>({
    endpoint: "/users/profile",
  });

  const { mutate: submitPenilaian, loading: submittingPenilaian } =
    useMutation<PenilaianFormData, any>("post");

  // Check access
  useEffect(() => {
    if (currentUser?.role) {
      const userRole = currentUser.role as string;
      const allowedRoles = [
        Role.Super_Admin,
        Role.Dept_Head,
      ];
      if (!allowedRoles.includes(userRole as Role)) {
        router.replace("/dashboard");
      }
    }
  }, [currentUser, router]);

  const [isPenilaianDialogOpen, setIsPenilaianDialogOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<Suggestion | null>(null);
  const [penilaianData, setPenilaianData] = useState<{
    [key: number]: number;
  }>({});
  const [formError, setFormError] = useState("");

  const handleOpenPenilaian = (suggestion: Suggestion) => {
    setSelectedSuggestion(suggestion);
    // Initialize with existing scores if any
    const initialScores: { [key: number]: number } = {};
    if (suggestion.penilaian && suggestion.penilaian.length > 0) {
      suggestion.penilaian.forEach((pen) => {
        const kriteriaId = parseInt(pen.penilaianKriteria) || 0;
        if (kriteriaId > 0) {
          initialScores[kriteriaId] = pen.skorKriteria;
        }
      });
    }
    setPenilaianData(initialScores);
    setIsPenilaianDialogOpen(true);
  };

  const calculateTotalScore = () => {
    return Object.values(penilaianData).reduce((sum, score) => sum + score, 0);
  };

  const getKelasFromScore = (score: number): string => {
    const klasifikasi = klasifikasiPenilaian.find((k) => {
      const [min, max] = k.nilai.split("~").map(Number);
      return score >= min && score <= max;
    });
    return klasifikasi?.kelas || "-";
  };

  const handlePenilaianSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const totalScore = calculateTotalScore();
    if (totalScore === 0) {
      setFormError("Please fill at least one criteria score");
      return;
    }

    if (!selectedSuggestion) return;

    try {
      // Submit each criteria score separately
      const promises = Object.entries(penilaianData).map(([kriteriaId, score]) => {
        if (score > 0) {
          const kriteria = kriteriaPenilaian.find((k) => k.id === parseInt(kriteriaId));
          return submitPenilaian("/suggestions/penilaian", {
            suggestionId: selectedSuggestion.id,
            penilaianKriteria: kriteria?.nama || `Kriteria ${kriteriaId}`,
            skorKriteria: score,
            komentarPenilaian: "",
          });
        }
        return Promise.resolve(null);
      });

      await Promise.all(promises);
      setIsPenilaianDialogOpen(false);
      setSelectedSuggestion(null);
      setPenilaianData({});
      refetch();
      setTimeout(() => refetch(), 1000);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to submit penilaian"
      );
    }
  };

  // Filter suggestions by search query (NRP or Name)
  const filteredSuggestions = useMemo(() => {
    if (!suggestions) return [];
    if (!searchQuery.trim()) return suggestions;

    const query = searchQuery.toLowerCase().trim();
    return suggestions.filter((suggestion) => {
      if (!suggestion.user) return false;
      const fullName = `${suggestion.user.firstName} ${suggestion.user.lastName}`.toLowerCase();
      const nrp = suggestion.user.nrp?.toString().toLowerCase() || "";
      return fullName.includes(query) || nrp.includes(query);
    });
  }, [suggestions, searchQuery]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case StatusIde.DIAJUKAN:
        return "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200";
      case StatusIde.APPROVE:
        return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200";
      case StatusIde.DINILAI:
        return "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200";
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200";
    }
  };

  if (currentUserLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="animate-pulse">
          <div className="h-9 bg-slate-200 dark:bg-slate-700 rounded w-48 mb-2"></div>
          <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-64"></div>
        </div>
        
        {/* Search Card Skeleton */}
        <Card className="p-4">
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32 mb-2"></div>
            <div className="h-9 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
          </div>
        </Card>
        
        {/* Suggestions Skeleton */}
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
                    <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-full w-20"></div>
                  </div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                  <div className="flex items-center gap-4">
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
                  </div>
                </div>
                <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <p className="text-slate-500 dark:text-slate-400">Loading...</p>
      </div>
    );
  }

  const userRole = currentUser.role as string;
  const allowedRoles = [
    Role.Super_Admin,
    Role.Dept_Head,
  ];

  if (!allowedRoles.includes(userRole as Role)) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Card className="p-6">
          <p className="text-red-600 dark:text-red-400">
            You don't have permission to access this page.
          </p>
        </Card>
      </div>
    );
  }

  const totalScore = calculateTotalScore();
  const kelas = getKelasFromScore(totalScore);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Scoring</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Evaluate and score approved suggestions
          </p>
        </div>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="space-y-2">
          <Label htmlFor="search" className="text-sm font-medium">
            Search by NRP or Name
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              id="search"
              placeholder="Search by NRP or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </Card>

      {/* Loading State - Skeleton */}
      {loading && (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
                    <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-full w-20"></div>
                  </div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                  <div className="flex items-center gap-4">
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
                  </div>
                </div>
                <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="p-6 bg-red-50 dark:bg-red-950">
          <p className="text-red-600 dark:text-red-400 mb-4">{error.message}</p>
          <Button onClick={refetch} variant="destructive">
            Try Again
          </Button>
        </Card>
      )}

      {/* Suggestions List */}
      {!loading && filteredSuggestions && filteredSuggestions.length > 0 && (
        <div className="grid gap-4">
          {filteredSuggestions.map((suggestion) => {
            // Calculate existing total score
            const existingScores =
              suggestion.penilaian?.reduce(
                (sum, pen) => sum + pen.skorKriteria,
                0
              ) || 0;
            const existingKelas = getKelasFromScore(existingScores);

            return (
              <Card key={suggestion.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {suggestion.judulIde}
                      </h3>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          suggestion.statusIde
                        )}`}
                      >
                        {formatEnumDisplay(suggestion.statusIde)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                      {suggestion.masalahYangDihadapi.substring(0, 150)}
                      {suggestion.masalahYangDihadapi.length > 150 ? "..." : ""}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        <strong>Kriteria:</strong>{" "}
                        {formatEnumDisplay(suggestion.kriteriaSS)}
                      </span>
                      <span>
                        <strong>Sifat:</strong>{" "}
                        {formatEnumDisplay(suggestion.sifatPerbaikan)}
                      </span>
                      {suggestion.user && (
                        <span>
                          <strong>By:</strong> {suggestion.user.firstName}{" "}
                          {suggestion.user.lastName}
                        </span>
                      )}
                      <span>
                        {new Date(suggestion.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {suggestion.penilaian && suggestion.penilaian.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                              Total Score:
                            </p>
                            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                              {existingScores} (Kelas {existingKelas})
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {suggestion.penilaian.map((pen) => (
                              <span
                                key={pen.id}
                                className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs"
                              >
                                {pen.penilaianKriteria}: {pen.skorKriteria}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {suggestion.statusIde === StatusIde.APPROVE && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenPenilaian(suggestion)}
                        className="h-8 w-8 text-blue-600 hover:text-blue-700"
                        title="Submit Score"
                      >
                        <ClipboardCheck className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && (!filteredSuggestions || filteredSuggestions.length === 0) && (
        <Card className="p-12 flex items-center justify-center min-h-96">
          <div className="text-center">
            <p className="text-slate-500 dark:text-slate-400 text-lg">
              {searchQuery.trim()
                ? "No suggestions found matching your search"
                : "No suggestions found for scoring"}
            </p>
          </div>
        </Card>
      )}

      {/* Penilaian Dialog */}
      <Dialog
        open={isPenilaianDialogOpen}
        onOpenChange={setIsPenilaianDialogOpen}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center">
              KRITERIA PENILAIAN SS - PT BATARA DHARMA PERSADA
            </DialogTitle>
            <DialogDescription className="text-center">
              {selectedSuggestion?.judulIde || "Suggestion Evaluation"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePenilaianSubmit}>
            {formError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-700 dark:text-red-400 text-sm">
                  {formError}
                </p>
              </div>
            )}
            <div className="space-y-6 py-4">
              {/* Klasifikasi Penilaian */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4">
                  <h3 className="font-semibold mb-3">KLASIFIKASI PENILAIAN</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">NILAI</th>
                          <th className="text-left p-2">KELAS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {klasifikasiPenilaian.map((k) => (
                          <tr key={k.kelas} className="border-b">
                            <td className="p-2">{k.nilai}</td>
                            <td className="p-2">{k.kelas}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
                <Card className="p-4">
                  <h3 className="font-semibold mb-3">TOTAL</h3>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-sm">NILAI</Label>
                      <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                        {totalScore}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm">KELAS</Label>
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                        {kelas}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Kriteria Penilaian */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">HASIL IDE USAHA</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800">
                        <th className="border p-2 text-left">No</th>
                        <th className="border p-2 text-left">Kriteria</th>
                        <th className="border p-2 text-center">Nilai</th>
                        <th className="border p-2 text-left">Deskripsi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kriteriaPenilaian.map((kriteria, index) => (
                        <tr key={kriteria.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                          <td className="border p-2 text-center">{kriteria.id}</td>
                          <td className="border p-2 font-medium">
                            {kriteria.nama}
                          </td>
                          <td className="border p-2">
                            <select
                              value={penilaianData[kriteria.id] || 0}
                              onChange={(e) =>
                                setPenilaianData({
                                  ...penilaianData,
                                  [kriteria.id]: parseInt(e.target.value),
                                })
                              }
                              className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                            >
                              {Array.from({ length: kriteria.maxScore + 1 }, (_, i) => (
                                <option key={i} value={i}>
                                  {i === 0 ? "Tdk ada" : i}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="border p-2 text-xs text-slate-600 dark:text-slate-400">
                            {penilaianData[kriteria.id] !== undefined &&
                            penilaianData[kriteria.id] > 0
                              ? kriteria.deskripsi[penilaianData[kriteria.id]]
                              : kriteria.deskripsi[0]}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsPenilaianDialogOpen(false);
                  setPenilaianData({});
                }}
                disabled={submittingPenilaian}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submittingPenilaian}>
                {submittingPenilaian ? "Submitting..." : "Submit Score"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
