"use client";

import { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebounce } from "@/lib/use-debounce";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useData, useMutation } from "@/types/hooks";
import { apiClient } from "@/types/api-client";
import {
  Suggestion,
  SuggestionFormData,
  PenilaianFormData,
  SuggestionStatusUpdate,
  SuggestionStatistics,
  KriteriaSS,
  SifatPerbaikan,
  StatusIde,
  UserProfile,
  Role,
} from "@/types/api";
import { formatEnumDisplay } from "@/types/utils";
import { showSuccess, showError } from "@/lib/toast";
import { useConfirm } from "@/lib/use-confirm";
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  ClipboardCheck,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import { SuggestionHistory } from "@/types/api";

// History Section Component with Pagination
function HistorySection({ 
  history, 
  currentUser 
}: { 
  history: SuggestionHistory[];
  currentUser?: UserProfile | null;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  // Sort history by changedAt descending (newest first)
  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => 
      new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
    );
  }, [history]);
  
  const totalPages = Math.ceil(sortedHistory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentHistory = sortedHistory.slice(startIndex, endIndex);
  
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
  
  return (
    <div className="pt-4 border-t">
      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-3 block">
        History ({sortedHistory.length})
      </Label>
      
      {/* History Cards */}
      <div className="space-y-2 mb-4">
        {currentHistory.map((item) => {
          // Get user name from history item
          let userName: string | null = null;
          
          if (item.user) {
            // Use user info from history if available (preferred)
            userName = `${item.user.firstName} ${item.user.lastName}`.trim();
          } else if (item.changedBy && currentUser && currentUser.id === item.changedBy) {
            // Fallback: if changedBy matches current user and no user info in history
            userName = `${currentUser.firstName} ${currentUser.lastName}`.trim();
          }
          
          return (
            <Card key={item.id} className="p-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded shrink-0">
                  <Clock className="h-3 w-3 text-slate-600 dark:text-slate-400" />
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${getStatusColor(item.statusIde)}`}>
                    {formatEnumDisplay(item.statusIde)}
                  </span>
                  {userName && (
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-medium shrink-0">
                      by {userName}
                    </span>
                  )}
                  <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap overflow-hidden text-ellipsis">
                    {new Date(item.changedAt).toLocaleString('id-ID', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0 pt-3 border-t border-slate-200 dark:border-slate-700">
          <div className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
            Showing {startIndex + 1} to {Math.min(endIndex, sortedHistory.length)} of {sortedHistory.length} entries
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="h-8 px-2 md:px-3 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="h-8 px-2 md:px-3 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SubmissionsPage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const [filters, setFilters] = useState({
    statusIde: "",
    department: "",
    kriteriaSS: "",
    search: "", // Search by No. Regist SS, NRP or name
  });
  // Debounce search query dengan delay 0.5 detik (500ms)
  const debouncedSearch = useDebounce(filters.search, 500);
  
  // Calculate isSearching state directly (no useEffect needed)
  const isSearching = useMemo(() => {
    return filters.search.trim() !== debouncedSearch.trim() && filters.search.trim().length > 0;
  }, [filters.search, debouncedSearch]);

  const { data: currentUser, loading: currentUserLoading } = useData<UserProfile>({
    endpoint: "/users/profile",
  });

  // Check if user is Staff or Non_Staff (can only see their own submissions)
  const canViewAllSubmissions = useMemo(() => {
    if (!currentUser?.role) return true; // Default to true if role not loaded yet
    const role = currentUser.role as string;
    return role !== Role.Staff && role !== Role.Non_Staff;
  }, [currentUser]);

  // Build query string for filters
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    
    // For Staff/Non_Staff, only show their own submissions
    if (!canViewAllSubmissions && currentUser?.id) {
      params.append("userId", currentUser.id);
    }
    
    if (filters.statusIde) params.append("statusIde", filters.statusIde);
    if (filters.department) params.append("department", filters.department);
    if (filters.kriteriaSS) params.append("kriteriaSS", filters.kriteriaSS);
    
    return params.toString();
  }, [filters, canViewAllSubmissions, currentUser]);

  const endpoint = `/suggestions${queryParams ? `?${queryParams}` : ""}`;

  const {
    data: suggestionsData,
    loading,
    error,
    refetch,
  } = useData<Suggestion[]>({
    endpoint,
  });

  // Fetch next registration number from backend (global, sequential across all users)
  interface NextRegistNumberResponse {
    success: boolean;
    data: {
      nextRegistNumber: string;
      currentMonth: number;
      currentYear: number;
      monthRoman: string;
    };
  }
  const {
    data: nextRegistData,
    refetch: refetchNextRegist,
  } = useData<NextRegistNumberResponse>({
    endpoint: "/suggestions/next-regist-number",
    immediate: true,
  });

  // Filter suggestions by search (NRP or name) on client side AND by user role
  // Use debouncedSearch instead of filters.search untuk delay
  const suggestions = useMemo(() => {
    if (!suggestionsData || !Array.isArray(suggestionsData)) return suggestionsData;
    
    // First, filter by user role - Staff/Non_Staff can only see their own submissions
    let filteredData = suggestionsData;
    if (!canViewAllSubmissions && currentUser?.id) {
      const beforeFilter = filteredData.length;
      filteredData = suggestionsData.filter((suggestion) => {
        // Only show suggestions that belong to the current user
        const belongsToUser = suggestion.userId === currentUser.id || suggestion.user?.id === currentUser.id;
        return belongsToUser;
      });
      
    }
    
    // Then, apply search filter if debounced search term exists
    if (!debouncedSearch || debouncedSearch.trim() === "") {
      return filteredData;
    }

    const searchTerm = debouncedSearch.toLowerCase().trim();
    return filteredData.filter((suggestion) => {
      // Search by No. Regist SS
      if (suggestion.noRegistSS?.toLowerCase().includes(searchTerm)) {
        return true;
      }
      // Search by user NRP
      if (suggestion.user?.nrp?.toLowerCase().includes(searchTerm)) {
        return true;
      }
      // Search by user name
      const fullName = `${suggestion.user?.firstName || ""} ${suggestion.user?.lastName || ""}`.toLowerCase();
      if (fullName.includes(searchTerm)) {
        return true;
      }
      // Search by first name or last name separately
      if (suggestion.user?.firstName?.toLowerCase().includes(searchTerm)) {
        return true;
      }
      if (suggestion.user?.lastName?.toLowerCase().includes(searchTerm)) {
        return true;
      }
      return false;
    });
  }, [suggestionsData, debouncedSearch, canViewAllSubmissions, currentUser]);

  // Build statistics endpoint - filter by userId for Staff/Non_Staff
  const statisticsEndpoint = useMemo(() => {
    if (!canViewAllSubmissions && currentUser?.id) {
      return `/suggestions/statistics?userId=${currentUser.id}`;
    }
    return "/suggestions/statistics";
  }, [canViewAllSubmissions, currentUser]);

  // Helper function to convert month number to Roman numeral
  const monthToRoman = (month: number): string => {
    const romanNumerals = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    return romanNumerals[month] || '';
  };

  // Get registration number from backend (global, sequential across all users)
  // IMPORTANT: Registration numbers are GLOBAL - sequential across all users
  // Automatically resets to "01" at the start of each new month
  const generateRegistNumber = useMemo(() => {
    if (nextRegistData?.data?.nextRegistNumber) {
      return nextRegistData.data.nextRegistNumber;
    }
    // Fallback: generate locally if backend data not available
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const monthRoman = monthToRoman(currentMonth);
    return `01/SS-PDCA/${monthRoman}/${currentYear}`;
  }, [nextRegistData]);

  const { data: statisticsData, loading: statisticsLoading } = useData<{ success: boolean; data: SuggestionStatistics } | SuggestionStatistics>({
    endpoint: statisticsEndpoint,
  });

  const statistics = (statisticsData && 'data' in statisticsData) ? statisticsData.data : (statisticsData as SuggestionStatistics | null);

  const { mutate: createSuggestion, loading: creating } = useMutation<
    SuggestionFormData,
    Suggestion
  >("post");
  const { mutate: updateSuggestion, loading: updating } = useMutation<
    Partial<SuggestionFormData>,
    Suggestion
  >("put");
  const { mutate: deleteSuggestion, loading: deleting } = useMutation<
    { id: string },
    void
  >("delete");
  const { mutate: updateStatus, loading: updatingStatus } = useMutation<
    SuggestionStatusUpdate,
    Suggestion
  >("put");
  const { mutate: submitPenilaian, loading: submittingPenilaian } =
    useMutation<PenilaianFormData, Suggestion>("post");

  // Enum options
  const statusOptions = useMemo(() => Object.values(StatusIde), []);
  const kriteriaSSOptions = useMemo(() => Object.values(KriteriaSS), []);
  const sifatPerbaikanOptions = useMemo(
    () => Object.values(SifatPerbaikan),
    []
  );

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isPenilaianDialogOpen, setIsPenilaianDialogOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<Suggestion | null>(null);

  // Form states
  const [formData, setFormData] = useState<SuggestionFormData>({
    judulIde: "",
    masalahYangDihadapi: "",
    uraianIde: "",
    ideProsesPerbaikan: "",
    hasilUraianProses: "",
    evaluasiIde: "",
    fotoSebelum: "",
    fotoSesudah: "",
    kriteriaSS: "",
    sifatPerbaikan: "",
    userId: "",
    noRegistSS: "",
    tanggalUsulan: new Date().toISOString().split("T")[0],
    hubungan: "",
    tanggalEfektif: "",
  });

  const [statusFormData, setStatusFormData] = useState<SuggestionStatusUpdate>({
    statusIde: "",
    komentarAtasan: "",
  });

  const [penilaianFormData, setPenilaianFormData] =
    useState<PenilaianFormData>({
      suggestionId: "",
      penilaianKriteria: "",
      skorKriteria: 0,
      komentarPenilaian: "",
    });


  // Reset form
  const resetForm = () => {
    setFormData({
      judulIde: "",
      masalahYangDihadapi: "",
      uraianIde: "",
      ideProsesPerbaikan: "",
      hasilUraianProses: "",
      evaluasiIde: "",
      fotoSebelum: "",
      fotoSesudah: "",
      kriteriaSS: "",
      sifatPerbaikan: "",
      userId: currentUser?.id || "",
      noRegistSS: generateRegistNumber,
      tanggalUsulan: new Date().toISOString().split("T")[0],
      hubungan: "",
      tanggalEfektif: "",
    });
  };

  // Set current user ID when available
  useEffect(() => {
    if (currentUser?.id && !formData.userId) {
      // Use setTimeout to avoid cascading renders
      setTimeout(() => {
        setFormData((prev) => ({ ...prev, userId: currentUser.id }));
      }, 0);
    }
  }, [currentUser, formData.userId]);

  // Handlers
  const handleOpenCreate = async () => {
    resetForm();
    setIsCreateDialogOpen(true);
    // Always refetch next registration number to get latest global number
    // This ensures we get the most up-to-date number, even if another user just created a suggestion
    try {
      await refetchNextRegist();
      // Wait a bit for the data to be processed and state updated
      setTimeout(() => {
        // Use generateRegistNumber which will have the latest value after refetch
        setFormData((prev) => ({
          ...prev,
          noRegistSS: generateRegistNumber,
        }));
      }, 500);
    } catch (error) {
      // If refetch fails, use current generateRegistNumber
      setFormData((prev) => ({
        ...prev,
        noRegistSS: generateRegistNumber,
      }));
    }
  };

  const handleOpenEdit = (suggestion: Suggestion) => {
    setSelectedSuggestion(suggestion);
    setFormData({
      judulIde: suggestion.judulIde,
      masalahYangDihadapi: suggestion.masalahYangDihadapi,
      uraianIde: suggestion.uraianIde,
      ideProsesPerbaikan: suggestion.ideProsesPerbaikan,
      hasilUraianProses: suggestion.hasilUraianProses,
      evaluasiIde: suggestion.evaluasiIde,
      komentarAtasan: suggestion.komentarAtasan || "",
      fotoSebelum: suggestion.fotoSebelum || "",
      fotoSesudah: suggestion.fotoSesudah || "",
      kriteriaSS: suggestion.kriteriaSS,
      sifatPerbaikan: suggestion.sifatPerbaikan,
      userId: suggestion.userId,
    });
    setIsEditDialogOpen(true);
  };

  // Calculate total score for display
  const calculateTotalScore = (suggestion: Suggestion): number => {
    if (!suggestion.penilaian || suggestion.penilaian.length === 0) return 0;
    return suggestion.penilaian.reduce((sum, pen) => sum + pen.skorKriteria, 0);
  };

  // Get klasifikasi from score
  const getKelasFromScore = (score: number): string => {
    if (score >= 1 && score <= 3) return "J";
    if (score >= 4 && score <= 6) return "I";
    if (score >= 7 && score <= 9) return "H";
    if (score >= 10 && score <= 12) return "G";
    if (score >= 13 && score <= 15) return "F";
    if (score >= 16 && score <= 18) return "E";
    if (score >= 19 && score <= 21) return "D";
    if (score >= 22 && score <= 24) return "C";
    if (score >= 25 && score <= 27) return "B";
    if (score >= 28 && score <= 30) return "A";
    return "-";
  };

  const handleOpenView = (suggestion: Suggestion) => {
    setSelectedSuggestion(suggestion);
    setIsViewDialogOpen(true);
  };

  const handleOpenStatus = (suggestion: Suggestion) => {
    setSelectedSuggestion(suggestion);
    setStatusFormData({
      statusIde: suggestion.statusIde,
      komentarAtasan: suggestion.komentarAtasan || "",
    });
    setIsStatusDialogOpen(true);
  };

  const handleOpenPenilaian = (suggestion: Suggestion) => {
    setSelectedSuggestion(suggestion);
    setPenilaianFormData({
      suggestionId: suggestion.id,
      penilaianKriteria: "",
      skorKriteria: 0,
      komentarPenilaian: "",
    });
    setIsPenilaianDialogOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.userId) {
      showError("User ID is required");
      return;
    }

    try {
      // Remove komentarAtasan from create payload (should only be in scoring menu)
      const createPayload: Omit<SuggestionFormData, 'komentarAtasan'> = {
        judulIde: formData.judulIde,
        masalahYangDihadapi: formData.masalahYangDihadapi,
        uraianIde: formData.uraianIde,
        ideProsesPerbaikan: formData.ideProsesPerbaikan,
        hasilUraianProses: formData.hasilUraianProses,
        evaluasiIde: formData.evaluasiIde,
        fotoSebelum: formData.fotoSebelum,
        fotoSesudah: formData.fotoSesudah,
        kriteriaSS: formData.kriteriaSS,
        sifatPerbaikan: formData.sifatPerbaikan,
        userId: formData.userId,
        noRegistSS: formData.noRegistSS || generateRegistNumber,
        tanggalUsulan: formData.tanggalUsulan,
        hubungan: formData.hubungan,
        tanggalEfektif: formData.tanggalEfektif,
      };
      await createSuggestion("/suggestions", createPayload);
      showSuccess("Suggestion created successfully!");
      setIsCreateDialogOpen(false);
      resetForm();
      // Refetch suggestions and next registration number
      await refetch();
      await refetchNextRegist();
      // Wait a bit for data to be fully updated, then refetch again
      setTimeout(async () => {
        await refetch();
        await refetchNextRegist();
      }, 500);
      setTimeout(async () => {
        await refetch();
        await refetchNextRegist();
      }, 1500);
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Failed to create suggestion"
      );
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSuggestion) return;

    try {
      await updateSuggestion(`/suggestions/${selectedSuggestion.id}`, formData);
      showSuccess("Suggestion updated successfully!");
      setIsEditDialogOpen(false);
      setSelectedSuggestion(null);
      refetch();
      setTimeout(() => refetch(), 1000);
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Failed to update suggestion"
      );
    }
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSuggestion) return;

    try {
      await updateStatus(
        `/suggestions/${selectedSuggestion.id}/status`,
        statusFormData
      );
      showSuccess("Status updated successfully!");
      setIsStatusDialogOpen(false);
      setSelectedSuggestion(null);
      refetch();
      setTimeout(() => refetch(), 1000);
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Failed to update status"
      );
    }
  };

  const handlePenilaianSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!penilaianFormData.penilaianKriteria || penilaianFormData.skorKriteria === 0) {
      showError("Penilaian kriteria and skor kriteria are required");
      return;
    }

    try {
      await submitPenilaian("/suggestions/penilaian", penilaianFormData);
      showSuccess("Penilaian submitted successfully!");
      setIsPenilaianDialogOpen(false);
      setSelectedSuggestion(null);
      refetch();
      setTimeout(() => refetch(), 1000);
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Failed to submit penilaian"
      );
    }
  };

  const handleDelete = async (suggestion: Suggestion) => {
    const confirmed = await confirm({
      title: "Delete Suggestion?",
      description: `Are you sure you want to delete "${suggestion.judulIde}"? Once deleted, all associated data will be permanently lost.`,
      confirmText: "Yes, Delete",
      cancelText: "Cancel",
      variant: "destructive",
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteSuggestion(`/suggestions/${suggestion.id}`);
      showSuccess(`Suggestion "${suggestion.judulIde}" deleted successfully!`);
      refetch();
      setTimeout(() => refetch(), 1000);
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Failed to delete suggestion"
      );
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Suggestions</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage and view all suggestions
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button onClick={handleOpenCreate} className="gap-2 cursor-pointer">
            <Plus className="h-4 w-4" />
            New Suggestion
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {(loading || statisticsLoading) ? (
        <div className="grid gap-6 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-4"></div>
                  <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : statistics ? (
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                  Total
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {statistics.total || 0}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                  Diajukan
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {statistics.diajukan || 0}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                  Approved
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {statistics.approved || 0}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                  Dinilai
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {statistics.dinilai || 0}
                </p>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {/* Filters */}
      <Card className="p-4">
        {loading || currentUserLoading ? (
          <div className="space-y-4 animate-pulse">
            {/* Search skeleton - Only show if user can view all submissions */}
            {canViewAllSubmissions && (
              <div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32 mb-2"></div>
                <div className="h-9 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
              </div>
            )}
            
            {/* Filters skeleton */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
              </div>
              <div className="flex-1 min-w-[200px]">
                <div className="h-9 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
              </div>
              {/* Department filter skeleton - Only show if user can view all submissions */}
              {canViewAllSubmissions && (
                <div className="flex-1 min-w-[200px]">
                  <div className="h-9 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                </div>
              )}
              <div className="flex-1 min-w-[200px]">
                <div className="h-9 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
              </div>
              <div className="h-9 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Search by NRP or Name - Only show for users who can view all submissions */}
            {canViewAllSubmissions && (
              <div>
                <Label htmlFor="search" className="text-sm font-medium mb-2 block">
                  Search by NRP or Name
                </Label>
                <div className="relative">
                  <Input
                    id="search"
                    type="text"
                    placeholder="Search by No. Regist SS, NRP or name..."
                    value={filters.search}
                    onChange={(e) =>
                      setFilters({ ...filters, search: e.target.value })
                    }
                    className="w-full"
                  />
                  {isSearching && debouncedSearch.trim() !== filters.search.trim() && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 dark:border-blue-400"></div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Other Filters */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium">Filters:</span>
              </div>
              <div className="flex-1 min-w-[200px]">
                <select
                  value={filters.statusIde}
                  onChange={(e) =>
                    setFilters({ ...filters, statusIde: e.target.value })
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">All Status</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {formatEnumDisplay(status)}
                    </option>
                  ))}
                </select>
              </div>
              {/* Department filter - Only show for users who can view all submissions */}
              {canViewAllSubmissions && (
                <div className="flex-1 min-w-[200px]">
                  <select
                    value={filters.department}
                    onChange={(e) =>
                      setFilters({ ...filters, department: e.target.value })
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">All Departments</option>
                    <option value="IT">IT</option>
                    <option value="HRGA">HRGA</option>
                    <option value="PLANT">Plant</option>
                    <option value="HSE">HSE</option>
                    <option value="TC">TC</option>
                    <option value="PRODUKSI">Produksi</option>
                    <option value="LOGISTIK">Logistik</option>
                    <option value="ALL_DEPT">All Dept</option>
                  </select>
                </div>
              )}
              <div className="flex-1 min-w-[200px]">
                <select
                  value={filters.kriteriaSS}
                  onChange={(e) =>
                    setFilters({ ...filters, kriteriaSS: e.target.value })
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">All Criteria</option>
                  {kriteriaSSOptions.map((kriteria) => (
                    <option key={kriteria} value={kriteria}>
                      {formatEnumDisplay(kriteria)}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                variant="outline"
                onClick={() => setFilters({ statusIde: "", department: "", kriteriaSS: "", search: "" })}
                className="cursor-pointer"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        )}
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
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
                  <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
                  <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="p-6 bg-red-50 dark:bg-red-950">
          <p className="text-red-600 dark:text-red-400 mb-4">{error.message}</p>
          <Button onClick={refetch} variant="destructive" className="cursor-pointer">
            Try Again
          </Button>
        </Card>
      )}

      {/* Suggestions List */}
      {!loading && suggestions && suggestions.length > 0 && (
        <div className="grid gap-4">
          {suggestions.map((suggestion) => (
            <Card 
              key={suggestion.id} 
              className="p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              onClick={() => handleOpenView(suggestion)}
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                    <h3 className="text-base md:text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {suggestion.judulIde}
                    </h3>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium shrink-0 ${getStatusColor(
                        suggestion.statusIde
                      )}`}
                    >
                      {formatEnumDisplay(suggestion.statusIde)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">
                    {suggestion.masalahYangDihadapi}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <span className="whitespace-nowrap">
                      <strong>Kriteria:</strong>{" "}
                      {formatEnumDisplay(suggestion.kriteriaSS)}
                    </span>
                    <span className="whitespace-nowrap">
                      <strong>Sifat:</strong>{" "}
                      {formatEnumDisplay(suggestion.sifatPerbaikan)}
                    </span>
                    {suggestion.user && (
                      <span className="whitespace-nowrap truncate">
                        <strong>By:</strong> {suggestion.user.firstName}{" "}
                        {suggestion.user.lastName}
                      </span>
                    )}
                    <span className="whitespace-nowrap">
                      {new Date(suggestion.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div 
                  className="flex items-center gap-1 md:gap-2 shrink-0 md:ml-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenEdit(suggestion)}
                    className="h-8 w-8 cursor-pointer"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {suggestion.statusIde === StatusIde.DIAJUKAN && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenStatus(suggestion)}
                      className="h-8 w-8 text-green-600 hover:text-green-700 cursor-pointer"
                      title="Update Status"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  )}
                  {suggestion.statusIde === StatusIde.APPROVE && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenPenilaian(suggestion)}
                      className="h-8 w-8 text-blue-600 hover:text-blue-700 cursor-pointer"
                      title="Submit Penilaian"
                    >
                      <ClipboardCheck className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(suggestion)}
                    className="h-8 w-8 text-red-600 hover:text-red-700 cursor-pointer"
                    disabled={deleting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Loading State for Search */}
      {isSearching && debouncedSearch.trim() !== filters.search.trim() && (
        <Card className="p-12 flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mb-4"></div>
            <p className="text-slate-500 dark:text-slate-400 text-lg">
              Searching...
            </p>
          </div>
        </Card>
      )}

      {/* Empty State - No Results from Search */}
      {!loading && !isSearching && debouncedSearch.trim() && suggestions && Array.isArray(suggestions) && suggestions.length === 0 && (
        <Card className="p-12 flex items-center justify-center min-h-96">
          <div className="text-center">
            <p className="text-slate-500 dark:text-slate-400 text-lg mb-2">
              Not Found
            </p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mb-4">
              No search results for &quot;{debouncedSearch}&quot;
            </p>
            <Button 
              onClick={() => setFilters({ ...filters, search: "" })} 
              variant="outline"
              className="gap-2 cursor-pointer"
            >
              Clear Search
            </Button>
          </div>
        </Card>
      )}

      {/* Empty State - No Suggestions at All */}
      {!loading && !isSearching && !debouncedSearch.trim() && (!suggestions || (Array.isArray(suggestions) && suggestions.length === 0)) && (
        <Card className="p-12 flex items-center justify-center min-h-96">
          <div className="text-center">
            <p className="text-slate-500 dark:text-slate-400 text-lg mb-4">
              No suggestions found
            </p>
            <Button onClick={handleOpenCreate} className="gap-2 cursor-pointer">
              <Plus className="h-4 w-4" />
              Create First Suggestion
            </Button>
          </div>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog 
        open={isCreateDialogOpen} 
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (open) {
            // When dialog opens, always refetch next registration number to get latest global number
            // This ensures we get the most up-to-date number
            (async () => {
              try {
                // Get the data directly from the API
                const result = await apiClient.get<NextRegistNumberResponse>("/suggestions/next-regist-number");
                // Handle different response structures
                const responseData = (result as any)?.data || result;
                const nextRegist = responseData?.nextRegistNumber || (responseData as NextRegistNumberResponse)?.data?.nextRegistNumber;
                if (nextRegist) {
                  setFormData((prev) => ({
                    ...prev,
                    noRegistSS: nextRegist,
                  }));
                } else {
                  // Fallback to generateRegistNumber if API response structure is different
                  setTimeout(() => {
                    setFormData((prev) => ({
                      ...prev,
                      noRegistSS: generateRegistNumber,
                    }));
                  }, 300);
                }
                // Also refetch for useData hook to keep it in sync
                await refetchNextRegist();
              } catch (error) {
                // If refetch fails, use current generateRegistNumber
                setTimeout(() => {
                  setFormData((prev) => ({
                    ...prev,
                    noRegistSS: generateRegistNumber,
                  }));
                }, 300);
              }
            })();
          }
        }}
      >
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto p-6 md:p-8 gap-6 rounded-xl border-2 border-slate-200 dark:border-slate-700 shadow-2xl">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-center text-xl md:text-2xl font-bold">
              Continuous Improvement Suggestion System
            </DialogTitle>
            <DialogDescription className="text-center text-sm md:text-base mt-2">
              PT Batara Dharma Persada - Form SS-PDCA
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-6 md:space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {/* Left Column */}
              <div className="space-y-4 md:space-y-6">
                {/* No. Regist SS - Auto-generated */}
                <div className="space-y-2">
                  <Label htmlFor="noRegistSS" className="font-semibold">
                    No. Regist SS
                  </Label>
                  <Input
                    id="noRegistSS"
                    value={formData.noRegistSS || generateRegistNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, noRegistSS: e.target.value })
                    }
                    placeholder={generateRegistNumber}
                    readOnly
                    className="bg-slate-50 dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-400 cursor-not-allowed"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Nomor registrasi otomatis di-generate berdasarkan bulan dan tahun saat ini
                  </p>
                </div>

                {/* Kriteria SS */}
                <div className="space-y-2">
                  <Label className="font-semibold text-sm md:text-base">*Kriteria SS</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {kriteriaSSOptions.map((kriteria) => (
                      <label
                        key={kriteria}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="kriteriaSS"
                          value={kriteria}
                          checked={formData.kriteriaSS === kriteria}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              kriteriaSS: e.target.value,
                            })
                          }
                          required
                          className="w-4 h-4"
                        />
                        <span>{formatEnumDisplay(kriteria)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Sifat Perbaikan */}
                <div className="space-y-2">
                  <Label className="font-semibold text-sm md:text-base">*Sifat Perbaikan</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {sifatPerbaikanOptions.map((sifat) => (
                      <label
                        key={sifat}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="sifatPerbaikan"
                          value={sifat}
                          checked={formData.sifatPerbaikan === sifat}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              sifatPerbaikan: e.target.value,
                            })
                          }
                          required
                          className="w-4 h-4"
                        />
                        <span>{formatEnumDisplay(sifat)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Data Pembuat SS */}
                <div className="space-y-3 p-3 md:p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <Label className="font-semibold text-sm md:text-base">
                    Data Pembuat SS
                  </Label>
                  <div className="grid gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="namaPembuat" className="text-xs md:text-sm">
                        Nama Pembuat
                      </Label>
                      <Input
                        id="namaPembuat"
                        value={
                          currentUser
                            ? `${currentUser.firstName} ${currentUser.lastName}`
                            : ""
                        }
                        disabled
                        className="bg-slate-50 dark:bg-slate-800 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="jabatanDept" className="text-xs md:text-sm">
                          Jabatan/Dept
                        </Label>
                        <Input
                          id="jabatanDept"
                          value={
                            currentUser
                              ? `${currentUser.position ? formatEnumDisplay(currentUser.position) : ""} / ${currentUser.department ? formatEnumDisplay(currentUser.department) : ""}`
                              : ""
                          }
                          disabled
                          className="bg-slate-50 dark:bg-slate-800 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="noID" className="text-xs md:text-sm">
                          No ID
                        </Label>
                        <Input
                          id="noID"
                          value={currentUser?.nrp || ""}
                          disabled
                          className="bg-slate-50 dark:bg-slate-800 text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="tanggalUsulan" className="text-xs md:text-sm">
                          Tanggal Usulan
                        </Label>
                        <Input
                          id="tanggalUsulan"
                          type="date"
                          value={formData.tanggalUsulan}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              tanggalUsulan: e.target.value,
                            })
                          }
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="hubungan" className="text-xs md:text-sm">
                          *Hubungan
                        </Label>
                        <select
                          id="hubungan"
                          value={formData.hubungan}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              hubungan: e.target.value,
                            })
                          }
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                        >
                          <option value="">-- Pilih --</option>
                          <option value="Pekerjaannya">Pekerjaannya</option>
                          <option value="Bukan">Bukan</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Data Improvement */}
                <div className="space-y-3 p-3 md:p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <Label className="font-semibold text-sm md:text-base">
                    Data Improvement
                  </Label>
                  <div className="grid gap-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="judulIde" className="text-xs md:text-sm">
                          Judul Ide/SS *
                        </Label>
                        <Input
                          id="judulIde"
                          value={formData.judulIde}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              judulIde: e.target.value,
                            })
                          }
                          required
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="tanggalEfektif" className="text-xs md:text-sm">
                          Tanggal Efektif
                        </Label>
                        <Input
                          id="tanggalEfektif"
                          type="date"
                          value={formData.tanggalEfektif}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              tanggalEfektif: e.target.value,
                            })
                          }
                          className="text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="masalahYangDihadapi" className="text-xs md:text-sm">
                        Masalah Yang Dihadapi : *
                      </Label>
                      <textarea
                        id="masalahYangDihadapi"
                        value={formData.masalahYangDihadapi}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            masalahYangDihadapi: e.target.value,
                          })
                        }
                        required
                        className="flex min-h-[80px] md:min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
                      />
                    </div>
                  </div>
                </div>

                {/* Uraian Masalah / Kondisi */}
                <div className="space-y-2">
                  <Label htmlFor="uraianIde" className="font-semibold text-sm md:text-base">
                    Uraian Masalah / Kondisi *
                  </Label>
                  <textarea
                    id="uraianIde"
                    value={formData.uraianIde}
                    onChange={(e) =>
                      setFormData({ ...formData, uraianIde: e.target.value })
                    }
                    required
                    className="flex min-h-[100px] md:min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
                    placeholder="*Jika diperlukan detail penjelasan atau foto/sketsa dilampirkan di lampiran"
                  />
                </div>

                {/* Ide & Proses Perbaikan */}
                <div className="space-y-2">
                  <Label htmlFor="ideProsesPerbaikan" className="font-semibold text-sm md:text-base">
                    Ide & Proses Perbaikan *
                  </Label>
                  <textarea
                    id="ideProsesPerbaikan"
                    value={formData.ideProsesPerbaikan}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        ideProsesPerbaikan: e.target.value,
                      })
                    }
                    required
                    className="flex min-h-[100px] md:min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
                    placeholder="*Jika diperlukan detail penjelasan atau foto/sketsa dilampirkan di lampiran"
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4 md:space-y-6">
                {/* Hasil & Uraian Proses */}
                <div className="space-y-2">
                  <Label htmlFor="hasilUraianProses" className="font-semibold text-sm md:text-base">
                    Hasil & Uraian Proses *
                  </Label>
                  <textarea
                    id="hasilUraianProses"
                    value={formData.hasilUraianProses}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        hasilUraianProses: e.target.value,
                      })
                    }
                    required
                    className="flex min-h-[100px] md:min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
                    placeholder="*Jika diperlukan detail penjelasan atau foto/sketsa dilampirkan di lampiran"
                  />
                </div>

                {/* Evaluasi */}
                <div className="space-y-2">
                  <Label htmlFor="evaluasiIde" className="font-semibold text-sm md:text-base">
                    Evaluasi *
                  </Label>
                  <textarea
                    id="evaluasiIde"
                    value={formData.evaluasiIde}
                    onChange={(e) =>
                      setFormData({ ...formData, evaluasiIde: e.target.value })
                    }
                    required
                    className="flex min-h-[100px] md:min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
                    placeholder="*Jika diperlukan detail penjelasan atau foto/sketsa dilampirkan di lampiran"
                  />
                </div>


                {/* Foto Sebelum & Sesudah */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fotoSebelum" className="font-semibold text-sm md:text-base">
                      Foto Sebelum (URL)
                    </Label>
                    <Input
                      id="fotoSebelum"
                      type="url"
                      value={formData.fotoSebelum}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          fotoSebelum: e.target.value,
                        })
                      }
                      placeholder="https://..."
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fotoSesudah" className="font-semibold text-sm md:text-base">
                      Foto Sesudah (URL)
                    </Label>
                    <Input
                      id="fotoSesudah"
                      type="url"
                      value={formData.fotoSesudah}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          fotoSesudah: e.target.value,
                        })
                      }
                      placeholder="https://..."
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="mt-4 md:mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 sticky bottom-0 bg-white dark:bg-slate-900">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={creating}
                className="w-full md:w-auto cursor-pointer"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating} className="w-full md:w-auto cursor-pointer">
                {creating ? "Submitting..." : "Submit Suggestion"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog - Similar to Create but with update logic */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Suggestion</DialogTitle>
            <DialogDescription>
              Update the suggestion information below.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="grid gap-4 py-4">
              {/* Same form fields as create */}
              <div className="space-y-2">
                <Label htmlFor="edit-judulIde">Judul Ide *</Label>
                <Input
                  id="edit-judulIde"
                  value={formData.judulIde}
                  onChange={(e) =>
                    setFormData({ ...formData, judulIde: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-masalahYangDihadapi">
                  Masalah Yang Dihadapi *
                </Label>
                <textarea
                  id="edit-masalahYangDihadapi"
                  value={formData.masalahYangDihadapi}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      masalahYangDihadapi: e.target.value,
                    })
                  }
                  required
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-uraianIde">Uraian Ide *</Label>
                <textarea
                  id="edit-uraianIde"
                  value={formData.uraianIde}
                  onChange={(e) =>
                    setFormData({ ...formData, uraianIde: e.target.value })
                  }
                  required
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-ideProsesPerbaikan">
                  Ide Proses Perbaikan *
                </Label>
                <textarea
                  id="edit-ideProsesPerbaikan"
                  value={formData.ideProsesPerbaikan}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      ideProsesPerbaikan: e.target.value,
                    })
                  }
                  required
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-hasilUraianProses">
                  Hasil Uraian Proses *
                </Label>
                <textarea
                  id="edit-hasilUraianProses"
                  value={formData.hasilUraianProses}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      hasilUraianProses: e.target.value,
                    })
                  }
                  required
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-evaluasiIde">Evaluasi Ide *</Label>
                <textarea
                  id="edit-evaluasiIde"
                  value={formData.evaluasiIde}
                  onChange={(e) =>
                    setFormData({ ...formData, evaluasiIde: e.target.value })
                  }
                  required
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-kriteriaSS">Kriteria SS *</Label>
                  <select
                    id="edit-kriteriaSS"
                    value={formData.kriteriaSS}
                    onChange={(e) =>
                      setFormData({ ...formData, kriteriaSS: e.target.value })
                    }
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">-- Select Kriteria SS --</option>
                    {kriteriaSSOptions.map((kriteria) => (
                      <option key={kriteria} value={kriteria}>
                        {formatEnumDisplay(kriteria)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-sifatPerbaikan">Sifat Perbaikan *</Label>
                  <select
                    id="edit-sifatPerbaikan"
                    value={formData.sifatPerbaikan}
                    onChange={(e) =>
                      setFormData({ ...formData, sifatPerbaikan: e.target.value })
                    }
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">-- Select Sifat Perbaikan --</option>
                    {sifatPerbaikanOptions.map((sifat) => (
                      <option key={sifat} value={sifat}>
                        {formatEnumDisplay(sifat)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-fotoSebelum">Foto Sebelum (URL)</Label>
                  <Input
                    id="edit-fotoSebelum"
                    value={formData.fotoSebelum}
                    onChange={(e) =>
                      setFormData({ ...formData, fotoSebelum: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-fotoSesudah">Foto Sesudah (URL)</Label>
                  <Input
                    id="edit-fotoSesudah"
                    value={formData.fotoSesudah}
                    onChange={(e) =>
                      setFormData({ ...formData, fotoSesudah: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={updating}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updating} className="cursor-pointer">
                {updating ? "Updating..." : "Update Suggestion"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0 rounded-xl border-2 border-slate-200 dark:border-slate-700 shadow-2xl">
          <DialogHeader className="px-3 md:px-6 pt-3 md:pt-6 pb-2 md:pb-4 border-b sticky top-0 bg-white dark:bg-slate-900 z-10">
            <div className="flex flex-col gap-2 md:gap-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 md:gap-4">
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-base md:text-xl truncate">
                    {selectedSuggestion?.judulIde || "Suggestion Details"}
                  </DialogTitle>
                  <DialogDescription className="mt-0.5 md:mt-1 text-xs md:text-sm">View complete suggestion details</DialogDescription>
                </div>
                {/* Total Score Display in Dialog Header */}
                {selectedSuggestion && selectedSuggestion.penilaian && selectedSuggestion.penilaian.length > 0 && (
                  <Card className="px-2.5 md:px-4 py-1.5 md:py-2 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 shrink-0 w-full sm:w-auto">
                    <div className="text-left sm:text-right">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Total Score</p>
                      <p className="text-sm md:text-lg font-bold text-blue-700 dark:text-blue-300">
                        {calculateTotalScore(selectedSuggestion)} (Kelas {getKelasFromScore(calculateTotalScore(selectedSuggestion))})
                      </p>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </DialogHeader>
          {selectedSuggestion && (
            <div className="px-3 md:px-6 py-2.5 md:py-4 space-y-2.5 md:space-y-3">
              {/* Status and Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 pb-2 md:pb-3 border-b">
                {/* Left Section: No. Regist SS and Submitted By */}
                <div className="space-y-3">
                  {selectedSuggestion.noRegistSS && (
                    <div>
                      <Label className="text-xs text-slate-500 dark:text-slate-400">No. Regist SS</Label>
                      <p className="mt-0.5 md:mt-1 text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">
                        {selectedSuggestion.noRegistSS}
                      </p>
                    </div>
                  )}
                  {selectedSuggestion.user && (
                    <div>
                      <Label className="text-xs text-slate-500 dark:text-slate-400">Submitted By</Label>
                      <p className="mt-0.5 md:mt-1 text-xs md:text-sm font-medium text-slate-900 dark:text-slate-100">
                        {selectedSuggestion.user.firstName} {selectedSuggestion.user.lastName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        NRP: {selectedSuggestion.user.nrp}
                      </p>
                    </div>
                  )}
                </div>
                {/* Right Section: Status, Kriteria SS, Sifat Perbaikan */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-slate-500 dark:text-slate-400">Status</Label>
                    <div className="mt-0.5 md:mt-1">
                      <span
                        className={`inline-flex items-center px-2 md:px-3 py-0.5 md:py-1 rounded-full text-xs font-medium ${getStatusColor(
                          selectedSuggestion.statusIde
                        )}`}
                      >
                        {formatEnumDisplay(selectedSuggestion.statusIde)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 dark:text-slate-400">Kriteria SS</Label>
                    <p className="mt-0.5 md:mt-1 text-xs md:text-sm font-medium text-slate-900 dark:text-slate-100">
                      {formatEnumDisplay(selectedSuggestion.kriteriaSS)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 dark:text-slate-400">Sifat Perbaikan</Label>
                    <p className="mt-0.5 md:mt-1 text-xs md:text-sm font-medium text-slate-900 dark:text-slate-100">
                      {formatEnumDisplay(selectedSuggestion.sifatPerbaikan)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Content Sections - More Compact */}
              <div className="space-y-2.5 md:space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Masalah Yang Dihadapi</Label>
                  <p className="mt-1 text-xs md:text-sm text-slate-900 dark:text-slate-100 whitespace-pre-wrap leading-relaxed wrap-break-word">
                    {selectedSuggestion.masalahYangDihadapi}
                  </p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Uraian Ide</Label>
                  <p className="mt-1 text-xs md:text-sm text-slate-900 dark:text-slate-100 whitespace-pre-wrap leading-relaxed wrap-break-word">
                    {selectedSuggestion.uraianIde}
                  </p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Ide Proses Perbaikan</Label>
                  <p className="mt-1 text-xs md:text-sm text-slate-900 dark:text-slate-100 whitespace-pre-wrap leading-relaxed wrap-break-word">
                    {selectedSuggestion.ideProsesPerbaikan}
                  </p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Hasil Uraian Proses</Label>
                  <p className="mt-1 text-xs md:text-sm text-slate-900 dark:text-slate-100 whitespace-pre-wrap leading-relaxed wrap-break-word">
                    {selectedSuggestion.hasilUraianProses}
                  </p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Evaluasi Ide</Label>
                  <p className="mt-1 text-xs md:text-sm text-slate-900 dark:text-slate-100 whitespace-pre-wrap leading-relaxed wrap-break-word">
                    {selectedSuggestion.evaluasiIde}
                  </p>
                </div>
                {selectedSuggestion.komentarAtasan && (
                  <div>
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Komentar Atasan</Label>
                    <p className="mt-1 text-xs md:text-sm text-slate-900 dark:text-slate-100 whitespace-pre-wrap leading-relaxed wrap-break-word">
                      {selectedSuggestion.komentarAtasan}
                    </p>
                  </div>
                )}
              </div>

              {/* Penilaian Section */}
              {selectedSuggestion.penilaian && selectedSuggestion.penilaian.length > 0 && (
                <div className="pt-2 md:pt-3 border-t">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2 md:mb-3 block">Penilaian</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedSuggestion.penilaian.map((pen) => (
                      <div key={pen.id} className="p-2 md:p-2.5 bg-slate-50 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
                        <p className="text-xs font-medium text-slate-900 dark:text-slate-100 mb-1 wrap-break-word">{pen.penilaianKriteria}</p>
                        <p className="text-xs md:text-sm font-semibold text-blue-600 dark:text-blue-400">
                          Skor: {pen.skorKriteria}
                        </p>
                        {pen.komentarPenilaian && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 md:mt-1.5 leading-relaxed wrap-break-word">
                            {pen.komentarPenilaian}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* History Section */}
              {selectedSuggestion.history && selectedSuggestion.history.length > 0 && (
                <HistorySection history={selectedSuggestion.history} currentUser={currentUser} />
              )}
            </div>
          )}
          <DialogFooter className="px-3 md:px-6 py-2.5 md:py-4 border-t bg-slate-50 dark:bg-slate-900 sticky bottom-0">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)} className="w-full md:w-auto text-sm md:text-base cursor-pointer">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Status</DialogTitle>
            <DialogDescription>
              Update the status of this suggestion.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleStatusSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="statusIde">Status *</Label>
                <select
                  id="statusIde"
                  value={statusFormData.statusIde}
                  onChange={(e) =>
                    setStatusFormData({ ...statusFormData, statusIde: e.target.value })
                  }
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">-- Select Status --</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {formatEnumDisplay(status)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="komentarAtasan">Komentar Atasan</Label>
                <textarea
                  id="komentarAtasan"
                  value={statusFormData.komentarAtasan}
                  onChange={(e) =>
                    setStatusFormData({
                      ...statusFormData,
                      komentarAtasan: e.target.value,
                    })
                  }
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsStatusDialogOpen(false)}
                disabled={updatingStatus}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updatingStatus} className="cursor-pointer">
                {updatingStatus ? "Updating..." : "Update Status"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Penilaian Dialog */}
      <Dialog
        open={isPenilaianDialogOpen}
        onOpenChange={setIsPenilaianDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Penilaian</DialogTitle>
            <DialogDescription>
              Submit evaluation and scoring for this suggestion.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePenilaianSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="penilaianKriteria">Penilaian Kriteria *</Label>
                <Input
                  id="penilaianKriteria"
                  value={penilaianFormData.penilaianKriteria}
                  onChange={(e) =>
                    setPenilaianFormData({
                      ...penilaianFormData,
                      penilaianKriteria: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="skorKriteria">Skor Kriteria *</Label>
                <Input
                  id="skorKriteria"
                  type="number"
                  min="0"
                  max="100"
                  value={penilaianFormData.skorKriteria}
                  onChange={(e) =>
                    setPenilaianFormData({
                      ...penilaianFormData,
                      skorKriteria: parseInt(e.target.value) || 0,
                    })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="komentarPenilaian">Komentar Penilaian</Label>
                <textarea
                  id="komentarPenilaian"
                  value={penilaianFormData.komentarPenilaian}
                  onChange={(e) =>
                    setPenilaianFormData({
                      ...penilaianFormData,
                      komentarPenilaian: e.target.value,
                    })
                  }
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPenilaianDialogOpen(false)}
                disabled={submittingPenilaian}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submittingPenilaian} className="cursor-pointer">
                {submittingPenilaian ? "Submitting..." : "Submit Penilaian"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {ConfirmDialog}
    </div>
  );
}

