"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useDebounce } from "@/lib/use-debounce";
import { useRouter } from "next/navigation";
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
import { User, UserFormData, Role, Department, Position, PermissionLevel, UserProfile } from "@/types/api";
import { formatEnumDisplay, canManageUsers } from "@/types/utils";
import { Plus, Pencil, Trash2, Filter, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { showSuccess, showError } from "@/lib/toast";
import { useConfirm } from "@/lib/use-confirm";

export default function UsersPage() {
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();
  const [filters, setFilters] = useState({
    role: "",
    department: "",
    position: "",
    search: "", // Search by NRP
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Debounce search query dengan delay 0.5 detik (500ms)
  const debouncedSearch = useDebounce(filters.search, 500);
  
  // Calculate isSearching state
  const isSearching = useMemo(() => {
    return filters.search.trim() !== debouncedSearch.trim() && filters.search.trim().length > 0;
  }, [filters.search, debouncedSearch]);

  const {
    data: users,
    loading,
    error,
    refetch,
  } = useData<User[]>({
    endpoint: "/users/all",
  });

  const { data: currentUser, loading: currentUserLoading } = useData<UserProfile>({
    endpoint: "/users/profile",
  });

  // Route protection: Only users with FULL_ACCESS can manage users
  useEffect(() => {
    if (currentUser?.permissionLevel) {
      if (!canManageUsers(currentUser.permissionLevel)) {
        router.replace("/dashboard");
      }
    }
  }, [currentUser, router]);

  const { mutate: createUser, loading: creating } = useMutation<UserFormData, User>("post");
  const { mutate: updateUser, loading: updating } = useMutation<UserFormData, User>("put");
  const { mutate: deleteUser, loading: deleting } = useMutation<{ id: string }, void>("delete");

  // Get enum values from types (from Prisma schema)
  const roleOptions = useMemo(() => Object.values(Role), []);
  const departmentOptions = useMemo(() => Object.values(Department), []);
  const positionOptions = useMemo(() => Object.values(Position), []);
  const permissionLevelOptions = useMemo(() => Object.values(PermissionLevel), []);

  // Filter users based on filters
  const filteredUsers = useMemo(() => {
    if (!users || !Array.isArray(users)) return [];
    
    return users.filter((user) => {
      // Filter by role
      if (filters.role && user.role !== filters.role) {
        return false;
      }
      
      // Filter by department
      if (filters.department && user.department !== filters.department) {
        return false;
      }
      
      // Filter by position
      if (filters.position && user.position !== filters.position) {
        return false;
      }
      
      // Search by NRP - use debouncedSearch
      if (debouncedSearch && debouncedSearch.trim()) {
        const searchTerm = debouncedSearch.toLowerCase().trim();
        const userNrp = user.nrp?.toString().toLowerCase() || "";
        if (!userNrp.includes(searchTerm)) {
          return false;
        }
      }
      
      return true;
    });
  }, [users, filters.role, filters.department, filters.position, debouncedSearch]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Track previous filter values to detect changes
  const prevFiltersRef = useRef(filters);
  
  // Reset page when filters change - using ref to avoid cascading renders
  useEffect(() => {
    const filtersChanged = 
      prevFiltersRef.current.role !== filters.role ||
      prevFiltersRef.current.department !== filters.department ||
      prevFiltersRef.current.position !== filters.position ||
      prevFiltersRef.current.search !== filters.search;
    
    if (filtersChanged) {
      prevFiltersRef.current = filters;
      // Use setTimeout to avoid cascading renders
      setTimeout(() => {
    setCurrentPage(1);
      }, 0);
    } else {
      prevFiltersRef.current = filters;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.role, filters.department, filters.position, filters.search]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Update selectedUser when users data is refetched and view dialog is open
  useEffect(() => {
    if (isViewDialogOpen && selectedUser && users && Array.isArray(users)) {
      const updatedUser = users.find((u: User) => u.id === selectedUser.id);
      if (updatedUser) {
        setSelectedUser(updatedUser);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, isViewDialogOpen]);

  const [formData, setFormData] = useState<UserFormData>({
    firstName: "",
    lastName: "",
    nrp: "",
    password: "",
    role: "",
    department: "",
    position: "",
    permissionLevel: "",
  });
  // Internal state for multi-select permission levels
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  
  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      nrp: "",
      password: "",
      role: "",
      department: "",
      position: "",
      permissionLevel: "",
    });
    setSelectedPermissions([]);
    setEditingUser(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setSelectedPermissions([]);
    setIsDialogOpen(true);
  };

  const handleOpenView = (user: User) => {
    setSelectedUser(user);
    setIsViewDialogOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    
    // Parse permissionLevel to array for multi-select
    let permissions: string[] = [];
    if (user.role === Role.Super_Admin) {
      // Super Admin always has FULL_ACCESS
      permissions = [PermissionLevel.FULL_ACCESS];
    } else if (user.role === Role.Staff || user.role === Role.Non_Staff) {
      // Staff and Non_Staff always have SUBMITTER
      permissions = [PermissionLevel.SUBMITTER];
    } else if (user.permissionLevel) {
      // Parse existing permissionLevel
      if (user.permissionLevel === PermissionLevel.APPROVAL_SCORING) {
        // Split APPROVAL_SCORING into APPROVAL_ONLY and SCORING_ONLY
        // Also add SUBMITTER since it's the default permission
        permissions = [PermissionLevel.SUBMITTER, PermissionLevel.APPROVAL_ONLY, PermissionLevel.SCORING_ONLY];
      } else if (user.permissionLevel === PermissionLevel.APPROVAL_ONLY) {
        // APPROVAL_ONLY means user can approve, and can also submit (default)
        permissions = [PermissionLevel.SUBMITTER, PermissionLevel.APPROVAL_ONLY];
      } else if (user.permissionLevel === PermissionLevel.SCORING_ONLY) {
        // SCORING_ONLY means user can score, and can also submit (default)
        permissions = [PermissionLevel.SUBMITTER, PermissionLevel.SCORING_ONLY];
      } else if (user.permissionLevel === PermissionLevel.SUBMITTER) {
        // Only SUBMITTER
        permissions = [PermissionLevel.SUBMITTER];
      } else {
        permissions = [user.permissionLevel];
      }
    } else {
      // If no permissionLevel, default to SUBMITTER
      permissions = [PermissionLevel.SUBMITTER];
    }
    
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      nrp: user.nrp,
      password: "", // Don't pre-fill password for security
      role: user.role,
      department: user.department || "",
      position: user.position || "",
      permissionLevel: user.permissionLevel || "",
    });
    setSelectedPermissions(permissions);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  // Convert selected permissions array to single permissionLevel string for backend
  const convertPermissionsToBackendFormat = (permissions: string[], role: string): string => {
    // Super Admin always has FULL_ACCESS
    if (role === Role.Super_Admin) {
      return PermissionLevel.FULL_ACCESS;
    }
    
    // Staff and Non_Staff always have SUBMITTER
    if (role === Role.Staff || role === Role.Non_Staff) {
      return PermissionLevel.SUBMITTER;
    }
    
    // Filter out SUBMITTER since it's the default permission for all users
    const nonDefaultPermissions = permissions.filter(p => p !== PermissionLevel.SUBMITTER);
    
    // If no non-default permissions selected, return SUBMITTER
    if (nonDefaultPermissions.length === 0) {
      return PermissionLevel.SUBMITTER;
    }
    
    // If FULL_ACCESS is selected, return it
    if (permissions.includes(PermissionLevel.FULL_ACCESS)) {
      return PermissionLevel.FULL_ACCESS;
    }
    
    // If both APPROVAL_ONLY and SCORING_ONLY are selected (with or without SUBMITTER), return APPROVAL_SCORING
    if (permissions.includes(PermissionLevel.APPROVAL_ONLY) && permissions.includes(PermissionLevel.SCORING_ONLY)) {
      return PermissionLevel.APPROVAL_SCORING;
    }
    
    // If only one non-default permission is selected, return it
    if (nonDefaultPermissions.length === 1) {
      return nonDefaultPermissions[0];
    }
    
    // If multiple non-default permissions, prioritize
    if (nonDefaultPermissions.includes(PermissionLevel.APPROVAL_ONLY)) {
      return PermissionLevel.APPROVAL_ONLY;
    }
    if (nonDefaultPermissions.includes(PermissionLevel.SCORING_ONLY)) {
      return PermissionLevel.SCORING_ONLY;
    }
    
    // Default fallback
    return PermissionLevel.SUBMITTER;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingUser) {
        // Update user - use /users/:id endpoint
        const payload: UserFormData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          nrp: formData.nrp,
          role: formData.role,
        };

        // Only add fields that have values
        if (formData.department && formData.department.trim()) {
          payload.department = formData.department;
        }
        if (formData.position && formData.position.trim()) {
          payload.position = formData.position;
        }
        
        // Convert multi-select permissions to backend format
        // Always include permissionLevel in payload for updates
        const backendPermissionLevel = convertPermissionsToBackendFormat(selectedPermissions, formData.role);
        payload.permissionLevel = backendPermissionLevel;
        
        // Only include password if it's provided (for update)
        if (formData.password && formData.password.trim()) {
          payload.password = formData.password;
        }

        const response = await updateUser(`/users/${editingUser.id}`, payload);
        
        // Update editingUser with the response data if available
        let updatedUserData: User | null = null;
        if (response && typeof response === 'object' && 'data' in response) {
          updatedUserData = response.data as User;
          // Update the editingUser state with the new data
          setEditingUser({
            ...editingUser,
            ...updatedUserData,
          });
          
          // Update selectedUser if view dialog is open and showing the same user
          if (isViewDialogOpen && selectedUser && selectedUser.id === editingUser.id) {
            setSelectedUser(updatedUserData);
          }
        }
        
        showSuccess(`User ${formData.firstName} ${formData.lastName} updated successfully!`);
      } else {
        // Create user - use /auth/register endpoint
        // Required fields: firstName, lastName, nrp, password, role, department, position
        if (!formData.password || !formData.password.trim()) {
          showError("Password is required for new users.");
          return;
        }

        const payload: UserFormData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          nrp: formData.nrp,
          password: formData.password,
          role: formData.role,
        };

        // Department and position are required for registration
        if (formData.department && formData.department.trim()) {
          payload.department = formData.department;
        }
        if (formData.position && formData.position.trim()) {
          payload.position = formData.position;
        }
        
        // Convert multi-select permissions to backend format
        const backendPermissionLevel = convertPermissionsToBackendFormat(selectedPermissions, formData.role);
        payload.permissionLevel = backendPermissionLevel;

        await createUser("/auth/register", payload);
        showSuccess(`User ${formData.firstName} ${formData.lastName} created successfully!`);
      }
      
      // Close dialog and reset form first
      handleCloseDialog();
      
      // Refetch immediately and also after delays to ensure data is updated
      refetch();
      setTimeout(() => {
        refetch();
      }, 500);
      setTimeout(() => {
        refetch();
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save user";
      showError(message);
    }
  };

  const handleDelete = async (user: User) => {
    const confirmed = await confirm({
      title: "Delete User?",
      description: `Are you sure you want to delete ${user.firstName} ${user.lastName}? Once deleted, all associated data will be permanently lost.`,
      confirmText: "Yes, Delete",
      cancelText: "Cancel",
      variant: "destructive",
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteUser(`/users/${user.id}`);
      showSuccess(`User ${user.firstName} ${user.lastName} deleted successfully!`);
      
      // Refetch immediately and also after a delay to ensure data is updated
      refetch();
      setTimeout(() => {
        refetch();
      }, 1000);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to delete user");
    }
  };

  // Check access - using permissionLevel (handled by useEffect above with canManageUsers)
  // No need for hardcoded role check since permissionLevel is the source of truth

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold">Users</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Manage and view all users
        </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2 cursor-pointer">
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        {loading || currentUserLoading ? (
          <div className="space-y-4 animate-pulse">
            {/* Search skeleton */}
            <div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32 mb-2"></div>
              <div className="h-9 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
            </div>
            
            {/* Filters skeleton */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
              </div>
              <div className="flex-1 min-w-[200px]">
                <div className="h-9 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
              </div>
              <div className="flex-1 min-w-[200px]">
                <div className="h-9 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
              </div>
              <div className="flex-1 min-w-[200px]">
                <div className="h-9 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
              </div>
              <div className="h-9 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Search by NRP */}
            <div>
              <Label htmlFor="search" className="text-sm font-medium mb-2 block">
                Search by NRP
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  id="search"
                  type="text"
                  placeholder="Search by NRP..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                  className="pl-10 w-full"
                />
              </div>
            </div>
            
            {/* Other Filters */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium">Filters:</span>
              </div>
              <div className="flex-1 min-w-[200px]">
                <select
                  value={filters.role}
                  onChange={(e) =>
                    setFilters({ ...filters, role: e.target.value })
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">All Roles</option>
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {formatEnumDisplay(role)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <select
                  value={filters.department}
                  onChange={(e) =>
                    setFilters({ ...filters, department: e.target.value })
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">All Departments</option>
                  {departmentOptions.map((dept) => (
                    <option key={dept} value={dept}>
                      {formatEnumDisplay(dept)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <select
                  value={filters.position}
                  onChange={(e) =>
                    setFilters({ ...filters, position: e.target.value })
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">All Positions</option>
                  {positionOptions.map((pos) => (
                    <option key={pos} value={pos}>
                      {formatEnumDisplay(pos)}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                variant="outline"
                onClick={() => setFilters({ role: "", department: "", position: "", search: "" })}
                className="cursor-pointer"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Loading State - Skeleton */}
      {(loading || currentUserLoading) && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-900 dark:text-slate-100">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-900 dark:text-slate-100">
                    NRP
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-900 dark:text-slate-100">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-900 dark:text-slate-100">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-900 dark:text-slate-100">
                    Position
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-900 dark:text-slate-100">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-900 dark:text-slate-100">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-full w-20"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
                        <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="p-6 bg-red-50 dark:bg-red-950">
          <p className="text-red-600 dark:text-red-400 mb-4">{error.message}</p>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Try Again
          </button>
        </Card>
      )}

      {/* Users Table */}
      {!loading && !currentUserLoading && filteredUsers && filteredUsers.length > 0 && (
        <>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-900 dark:text-slate-100">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-900 dark:text-slate-100">
                    NRP
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-900 dark:text-slate-100">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-900 dark:text-slate-100">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-900 dark:text-slate-100">
                    Position
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-900 dark:text-slate-100">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-900 dark:text-slate-100">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {paginatedUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                    onClick={() => handleOpenView(user)}
                  >
                    <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-100">
                      {user.firstName} {user.lastName}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {user.nrp}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                        {formatEnumDisplay(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {user.department ? formatEnumDisplay(user.department) : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {user.position ? formatEnumDisplay(user.position) : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div 
                        className="flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(user)}
                          className="h-8 w-8 cursor-pointer"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(user)}
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 cursor-pointer"
                          disabled={deleting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0 pt-3">
              <div className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} entries
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
        </>
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
      {!loading && !currentUserLoading && !isSearching && debouncedSearch.trim() && filteredUsers && filteredUsers.length === 0 && (
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

      {/* Empty State - No Users at All */}
      {!loading && !currentUserLoading && !isSearching && !debouncedSearch.trim() && (!filteredUsers || filteredUsers.length === 0) && (
        <Card className="p-12 flex items-center justify-center min-h-96">
          <div className="text-center">
            <p className="text-slate-500 dark:text-slate-400 text-lg mb-4">
            No users found
          </p>
            <Button onClick={handleOpenCreate} className="gap-2 cursor-pointer">
              <Plus className="h-4 w-4" />
              Add First User
            </Button>
          </div>
        </Card>
      )}

      {/* View User Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0 rounded-xl border-2 border-slate-200 dark:border-slate-700 shadow-2xl">
          <DialogHeader className="px-3 md:px-6 pt-3 md:pt-6 pb-2 md:pb-4 border-b sticky top-0 bg-white dark:bg-slate-900 z-10">
            <div className="flex flex-col gap-2 md:gap-4">
              <DialogTitle className="text-base md:text-xl truncate">
                {selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : "User Details"}
              </DialogTitle>
              <DialogDescription className="text-xs md:text-sm">View complete user information</DialogDescription>
            </div>
          </DialogHeader>
          {selectedUser && (
            <div className="px-3 md:px-6 py-2.5 md:py-4 space-y-2.5 md:space-y-3">
              {/* User Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 pb-2 md:pb-3 border-b">
                <div className="space-y-2 md:space-y-3">
                  <div>
                    <Label className="text-xs text-slate-500 dark:text-slate-400">Name</Label>
                    <p className="mt-0.5 md:mt-1 text-xs md:text-sm font-medium text-slate-900 dark:text-slate-100">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 dark:text-slate-400">NRP</Label>
                    <p className="mt-0.5 md:mt-1 text-xs md:text-sm font-medium text-slate-900 dark:text-slate-100">
                      {selectedUser.nrp}
                    </p>
                  </div>
                  {(selectedUser as UserProfile).email && (
                    <div>
                      <Label className="text-xs text-slate-500 dark:text-slate-400">Email</Label>
                      <p className="mt-0.5 md:mt-1 text-xs md:text-sm font-medium text-slate-900 dark:text-slate-100">
                        {(selectedUser as UserProfile).email}
                      </p>
                    </div>
                  )}
                </div>
                <div className="space-y-2 md:space-y-3">
                  <div>
                    <Label className="text-xs text-slate-500 dark:text-slate-400">Role</Label>
                    <div className="mt-0.5 md:mt-1">
                      <span className="inline-flex items-center px-2 md:px-3 py-0.5 md:py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                        {formatEnumDisplay(selectedUser.role)}
                      </span>
                    </div>
                  </div>
                  {selectedUser.department && (
                    <div>
                      <Label className="text-xs text-slate-500 dark:text-slate-400">Department</Label>
                      <p className="mt-0.5 md:mt-1 text-xs md:text-sm font-medium text-slate-900 dark:text-slate-100">
                        {formatEnumDisplay(selectedUser.department)}
                      </p>
                    </div>
                  )}
                  {selectedUser.position && (
                    <div>
                      <Label className="text-xs text-slate-500 dark:text-slate-400">Position</Label>
                      <p className="mt-0.5 md:mt-1 text-xs md:text-sm font-medium text-slate-900 dark:text-slate-100">
                        {formatEnumDisplay(selectedUser.position)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 pt-2 md:pt-3 border-t">
                <div>
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Permission Level</Label>
                  <div className="mt-1 space-y-1">
                    {selectedUser.permissionLevel ? (() => {
                      const permissionLevel = selectedUser.permissionLevel as PermissionLevel;
                      const capabilities: string[] = [];
                      
                      // Parse capabilities based on permission level
                      if (permissionLevel === PermissionLevel.FULL_ACCESS) {
                        capabilities.push(PermissionLevel.FULL_ACCESS);
                      } else if (permissionLevel === PermissionLevel.APPROVAL_SCORING) {
                        // APPROVAL_SCORING means user has APPROVAL_ONLY, SCORING_ONLY, and SUBMITTER capabilities
                        capabilities.push(PermissionLevel.SUBMITTER, PermissionLevel.APPROVAL_ONLY, PermissionLevel.SCORING_ONLY);
                      } else if (permissionLevel === PermissionLevel.APPROVAL_ONLY) {
                        // APPROVAL_ONLY users can also submit (SUBMITTER is default)
                        capabilities.push(PermissionLevel.SUBMITTER, PermissionLevel.APPROVAL_ONLY);
                      } else if (permissionLevel === PermissionLevel.SCORING_ONLY) {
                        // SCORING_ONLY users can also submit (SUBMITTER is default)
                        capabilities.push(PermissionLevel.SUBMITTER, PermissionLevel.SCORING_ONLY);
                      } else if (permissionLevel === PermissionLevel.SUBMITTER) {
                        capabilities.push(PermissionLevel.SUBMITTER);
                      }
                      
                      return (
                        <div className="flex flex-wrap gap-2">
                          {capabilities.map((capability, index) => (
                            <span
                              key={capability}
                              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                            >
                              {formatEnumDisplay(capability)}
                            </span>
                          ))}
                        </div>
                      );
                    })() : (
                      <p className="text-xs md:text-sm text-slate-900 dark:text-slate-100">-</p>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Member Since</Label>
                  <p className="mt-1 text-xs md:text-sm text-slate-900 dark:text-slate-100">
                    {new Date(selectedUser.createdAt).toLocaleDateString('id-ID', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="px-3 md:px-6 py-2.5 md:py-4 border-t bg-slate-50 dark:bg-slate-900 sticky bottom-0">
            <Button 
              variant="outline" 
              onClick={() => setIsViewDialogOpen(false)} 
              className="w-full md:w-auto text-sm md:text-base cursor-pointer"
            >
              Close
            </Button>
            <Button 
              variant="default" 
              onClick={() => {
                setIsViewDialogOpen(false);
                handleOpenEdit(selectedUser!);
              }}
              className="w-full md:w-auto text-sm md:text-base cursor-pointer"
            >
              Edit User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Edit User" : "Create New User"}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Update user information below."
                : "Fill in the information to create a new user."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nrp">NRP</Label>
                  <Input
                    id="nrp"
                    value={formData.nrp}
                    onChange={(e) =>
                      setFormData({ ...formData, nrp: e.target.value })
                    }
                    required
                    inputMode="numeric"
                  />
                </div>
                {!editingUser && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      required={!editingUser}
                      placeholder="Enter password for new user"
                    />
                  </div>
                )}
                {editingUser && (
                  <div className="space-y-2">
                    <Label htmlFor="password">New Password (Optional)</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      placeholder="Leave empty to keep current password"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <select
                    id="role"
                    value={formData.role}
                    onChange={(e) => {
                      const newRole = e.target.value;
                      setFormData({ ...formData, role: newRole });
                      
                      // Auto-set permissions based on role
                      if (newRole === Role.Super_Admin) {
                        setSelectedPermissions([PermissionLevel.FULL_ACCESS]);
                      } else if (newRole === Role.Staff || newRole === Role.Non_Staff) {
                        setSelectedPermissions([PermissionLevel.SUBMITTER]);
                      } else {
                        // Clear permissions for other roles, let user select
                        setSelectedPermissions([]);
                    }
                    }}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    <option value="">-- Select Role --</option>
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {formatEnumDisplay(role)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="permissionLevel">Permission Level</Label>
                  {formData.role === Role.Super_Admin ? (
                    // Super Admin always has FULL_ACCESS - show as disabled
                    <div className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm items-center text-muted-foreground">
                      {formatEnumDisplay(PermissionLevel.FULL_ACCESS)}
                    </div>
                  ) : formData.role === Role.Staff || formData.role === Role.Non_Staff ? (
                    // Staff and Non_Staff always have SUBMITTER - show as disabled
                    <div className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm items-center text-muted-foreground">
                      {formatEnumDisplay(PermissionLevel.SUBMITTER)}
                    </div>
                  ) : (
                    // Multi-select checkboxes for other roles
                    <div className="space-y-2 p-3 border border-input rounded-md bg-background">
                      {[
                        PermissionLevel.SUBMITTER,
                        PermissionLevel.APPROVAL_ONLY,
                        PermissionLevel.SCORING_ONLY,
                      ].map((level) => (
                        <label
                          key={level}
                          className="flex items-center space-x-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 p-2 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPermissions.includes(level)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPermissions([...selectedPermissions, level]);
                              } else {
                                setSelectedPermissions(selectedPermissions.filter((p) => p !== level));
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm">{formatEnumDisplay(level)}</span>
                        </label>
                      ))}
                      {selectedPermissions.includes(PermissionLevel.APPROVAL_ONLY) &&
                        selectedPermissions.includes(PermissionLevel.SCORING_ONLY) && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Selected: {formatEnumDisplay(PermissionLevel.APPROVAL_ONLY)} + {formatEnumDisplay(PermissionLevel.SCORING_ONLY)}
                          </p>
                        )}
                    </div>
                  )}
                  {formData.role === Role.Super_Admin && (
                    <p className="text-xs text-muted-foreground">
                      Super Admin always has FULL_ACCESS permission level
                    </p>
                  )}
                  {(formData.role === Role.Staff || formData.role === Role.Non_Staff) && (
                    <p className="text-xs text-muted-foreground">
                      Staff and Non_Staff always have SUBMITTER permission level
                    </p>
                  )}
                  {formData.role &&
                    formData.role !== Role.Super_Admin &&
                    formData.role !== Role.Staff &&
                    formData.role !== Role.Non_Staff && (
                      <p className="text-xs text-muted-foreground">
                        You can select multiple permissions. Selecting both Approval and Scoring will combine them.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <select
                    id="department"
                    value={formData.department || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, department: e.target.value || undefined })
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">-- Select Department --</option>
                    {departmentOptions.map((dept) => (
                      <option key={dept} value={dept}>
                        {formatEnumDisplay(dept)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <select
                    id="position"
                    value={formData.position || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, position: e.target.value || undefined })
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">-- Select Position --</option>
                    {positionOptions.map((pos) => (
                      <option key={pos} value={pos}>
                        {formatEnumDisplay(pos)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                disabled={creating || updating}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating || updating} className="cursor-pointer">
                {creating || updating
                  ? "Saving..."
                  : editingUser
                  ? "Update User"
                  : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {ConfirmDialog}
    </div>
  );
}

