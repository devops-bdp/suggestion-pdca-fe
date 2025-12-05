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
import { CheckCircle, XCircle, Eye, Search } from "lucide-react";
import { useRouter } from "next/navigation";

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

  const { data: currentUser } = useData<UserProfile>({
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

  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<Suggestion | null>(null);
  const [statusFormData, setStatusFormData] = useState<SuggestionStatusUpdate>({
    statusIde: "",
    komentarAtasan: "",
  });
  const [formError, setFormError] = useState("");

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
    setFormError("");

    if (!selectedSuggestion) return;

    try {
      await updateStatus(
        `/suggestions/${selectedSuggestion.id}/status`,
        statusFormData
      );
      setIsStatusDialogOpen(false);
      setSelectedSuggestion(null);
      refetch();
      setTimeout(() => refetch(), 1000);
    } catch (err) {
      setFormError(
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

      {/* Loading State */}
      {loading && (
        <Card className="p-12 flex items-center justify-center min-h-96">
          <p className="text-slate-500 dark:text-slate-400">
            Loading suggestions...
          </p>
        </Card>
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
          {filteredSuggestions.map((suggestion) => (
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
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenStatus(suggestion)}
                    className="h-8 w-8 text-green-600 hover:text-green-700"
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
            {formError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-700 dark:text-red-400 text-sm">
                  {formError}
                </p>
              </div>
            )}
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
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updatingStatus}>
                {updatingStatus ? "Updating..." : "Update Status"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

