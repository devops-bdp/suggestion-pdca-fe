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
  SuggestionStatusUpdate,
  StatusIde,
  UserProfile,
  Role,
} from "@/types/api";
import { formatEnumDisplay } from "@/types/utils";
import { CheckCircle, XCircle, Search, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { SuggestionHistory } from "@/types/api";
import { showSuccess, showError } from "@/lib/toast";

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
          // Get user name from history item, with fallback to currentUser
          let userName: string | null = null;
          
          if (item.user) {
            userName = `${item.user.firstName} ${item.user.lastName}`.trim();
          } else if (item.changedBy && currentUser && currentUser.id === item.changedBy) {
            userName = `${currentUser.firstName} ${currentUser.lastName}`.trim();
          } else if (currentUser) {
            const changeTime = new Date(item.changedAt).getTime();
            const isRecent = changeTime > Date.now() - 300000; // Within last 5 minutes
            if (isRecent) {
              userName = `${currentUser.firstName} ${currentUser.lastName}`.trim();
            }
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

export default function ApprovalPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  // Always fetch suggestions with status DIAJUKAN
  const endpoint = `/suggestions?statusIde=${StatusIde.DIAJUKAN}`;

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

  const { mutate: updateStatus, loading: updatingStatus } = useMutation<
    SuggestionStatusUpdate,
    any
  >("put");

  // Check access
  useEffect(() => {
    if (currentUser?.role) {
      const userRole = currentUser.role as string;
      const allowedRoles = [
        Role.Super_Admin,
        Role.Supervisor,
        Role.Dept_Head,
        Role.Project_Manager,
      ];
      if (!allowedRoles.includes(userRole as Role)) {
        router.replace("/dashboard");
      }
    }
  }, [currentUser, router]);

  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<Suggestion | null>(null);
  const [statusFormData, setStatusFormData] = useState<SuggestionStatusUpdate>({
    statusIde: "",
    komentarAtasan: "",
  });

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
    Role.Supervisor,
    Role.Dept_Head,
    Role.Project_Manager,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Approval</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Review and approve suggestions
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
          <Button onClick={refetch} variant="destructive" className="cursor-pointer">
            Try Again
          </Button>
        </Card>
      )}

      {/* Suggestions List */}
      {!loading && filteredSuggestions && filteredSuggestions.length > 0 && (
        <div className="grid gap-4">
          {filteredSuggestions.map((suggestion) => (
            <Card 
              key={suggestion.id} 
              className="p-6 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              onClick={() => handleOpenView(suggestion)}
            >
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
                </div>
                <div 
                  className="flex items-center gap-2 ml-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenStatus(suggestion)}
                    className="h-8 w-8 text-green-600 hover:text-green-700 cursor-pointer"
                    title="Approve/Reject"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && (!filteredSuggestions || filteredSuggestions.length === 0) && (
        <Card className="p-12 flex items-center justify-center min-h-96">
          <div className="text-center">
            <p className="text-slate-500 dark:text-slate-400 text-lg">
              {searchQuery.trim()
                ? "No suggestions found matching your search"
                : "No suggestions found for approval"}
            </p>
          </div>
        </Card>
      )}

      {/* Status Update Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve/Reject Suggestion</DialogTitle>
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
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                >
                  <option value="">-- Select Status --</option>
                  <option value={StatusIde.DIAJUKAN}>Diajukan</option>
                  <option value={StatusIde.APPROVE}>Approve</option>
                  <option value={StatusIde.DINILAI}>Dinilai</option>
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

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0 rounded-xl border-2 border-slate-200 dark:border-slate-700 shadow-2xl">
          <DialogHeader className="px-3 md:px-6 pt-3 md:pt-6 pb-2 md:pb-4 border-b sticky top-0 bg-white dark:bg-slate-900 z-10">
            <div className="flex flex-col gap-2 md:gap-4">
              <DialogTitle className="text-base md:text-xl truncate">
                {selectedSuggestion?.judulIde || "Suggestion Details"}
              </DialogTitle>
              <DialogDescription className="text-xs md:text-sm">View complete suggestion details</DialogDescription>
            </div>
          </DialogHeader>
          {selectedSuggestion && (
            <div className="px-3 md:px-6 py-2.5 md:py-4 space-y-2.5 md:space-y-3">
              {/* Status and Basic Info */}
              <div className="grid grid-cols-2 md:flex md:flex-wrap items-start gap-2 md:gap-4 pb-2 md:pb-3 border-b">
                <div className="shrink-0">
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
                <div className="shrink-0">
                  <Label className="text-xs text-slate-500 dark:text-slate-400">Kriteria SS</Label>
                  <p className="mt-0.5 md:mt-1 text-xs md:text-sm font-medium text-slate-900 dark:text-slate-100">
                    {formatEnumDisplay(selectedSuggestion.kriteriaSS)}
                  </p>
                </div>
                <div className="shrink-0 col-span-2 md:col-span-1">
                  <Label className="text-xs text-slate-500 dark:text-slate-400">Sifat Perbaikan</Label>
                  <p className="mt-0.5 md:mt-1 text-xs md:text-sm font-medium text-slate-900 dark:text-slate-100">
                    {formatEnumDisplay(selectedSuggestion.sifatPerbaikan)}
                  </p>
                </div>
                {selectedSuggestion.user && (
                  <div className="col-span-2 md:col-span-1 md:ml-auto shrink-0 w-full md:w-auto">
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

              {/* Content Sections */}
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
    </div>
  );
}

