"use client";

import { useState, useMemo, useEffect } from "react";
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
import { formatEnumDisplay } from "@/types/utils";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function UsersPage() {
  const router = useRouter();
  const {
    data: users,
    loading,
    error,
    refetch,
  } = useData<User[]>({
    endpoint: "/users/all",
  });

  const { data: currentUser } = useData<UserProfile>({
    endpoint: "/users/profile",
  });

  // Route protection: Staff and Non_Staff cannot access
  useEffect(() => {
    if (currentUser?.role) {
      const userRole = currentUser.role as string;
      if (userRole === Role.Staff || userRole === Role.Non_Staff) {
        router.replace("/dashboard");
      }
    }
  }, [currentUser, router]);

  // Debug: Log users data structure
  useEffect(() => {
    if (users && users.length > 0) {
      console.log("Users data received:", users);
      console.log("First user structure:", users[0]);
    }
  }, [users]);

  const { mutate: createUser, loading: creating } = useMutation<UserFormData, any>("post");
  const { mutate: updateUser, loading: updating } = useMutation<UserFormData, any>("put");
  const { mutate: deleteUser, loading: deleting } = useMutation<any, any>("delete");

  // Get enum values from types (from Prisma schema)
  const roleOptions = useMemo(() => Object.values(Role), []);
  const departmentOptions = useMemo(() => Object.values(Department), []);
  const positionOptions = useMemo(() => Object.values(Position), []);
  const permissionLevelOptions = useMemo(() => Object.values(PermissionLevel), []);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
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
  const [formError, setFormError] = useState("");

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
    setEditingUser(null);
    setFormError("");
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
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
    setFormError("");
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    try {
      if (editingUser) {
        // Update user - use /users/:id endpoint
        const payload: any = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: formData.role,
        };

        // Only add fields that have values
        if (formData.department && formData.department.trim()) {
          payload.department = formData.department;
        }
        if (formData.position && formData.position.trim()) {
          payload.position = formData.position;
        }
        if (formData.permissionLevel && formData.permissionLevel.trim()) {
          payload.permissionLevel = formData.permissionLevel;
        }
        // Only include password if it's provided (for update)
        if (formData.password && formData.password.trim()) {
          payload.password = formData.password;
        }

        console.log("Updating user:", editingUser.id, payload);
        await updateUser(`/users/${editingUser.id}`, payload);
      } else {
        // Create user - use /auth/register endpoint
        // Required fields: firstName, lastName, nrp, password, role, department, position
        if (!formData.password || !formData.password.trim()) {
          setFormError("Password is required for new users.");
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
        if (formData.permissionLevel && formData.permissionLevel.trim()) {
          payload.permissionLevel = formData.permissionLevel;
        }

        console.log("Creating user via /auth/register:", payload);
        await createUser("/auth/register", payload);
      }
      
      console.log("User operation successful");
      handleCloseDialog();
      
      // Refetch immediately and also after a delay to ensure data is updated
      refetch();
      setTimeout(() => {
        refetch();
      }, 1000);
    } catch (err) {
      console.error("User operation error:", err);
      const message = err instanceof Error ? err.message : "Failed to save user";
      setFormError(message);
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}?`)) {
      return;
    }

    try {
      console.log("Deleting user:", user.id);
      await deleteUser(`/users/${user.id}`);
      console.log("User deleted successfully");
      
      // Refetch immediately and also after a delay to ensure data is updated
      refetch();
      setTimeout(() => {
        refetch();
      }, 1000);
    } catch (err) {
      console.error("Delete error:", err);
      alert(err instanceof Error ? err.message : "Failed to delete user");
    }
  };

  // Check access
  if (currentUser?.role) {
    const userRole = currentUser.role as string
    if (userRole === Role.Staff || userRole === Role.Non_Staff) {
      return (
        <div className="flex items-center justify-center min-h-96">
          <Card className="p-6">
            <p className="text-red-600 dark:text-red-400">
              You don't have permission to access this page.
            </p>
          </Card>
        </div>
      )
    }
  }

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
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Loading State */}
      {loading && (
        <Card className="p-12 flex items-center justify-center min-h-96">
          <p className="text-slate-500 dark:text-slate-400">Loading users...</p>
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
      {!loading && users && users.length > 0 && (
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
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800 transition"
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
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(user)}
                          className="h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(user)}
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
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
      )}

      {/* Empty State */}
      {!loading && (!users || users.length === 0) && (
        <Card className="p-12 flex items-center justify-center min-h-96">
          <div className="text-center">
            <p className="text-slate-500 dark:text-slate-400 text-lg mb-4">
            No users found
          </p>
            <Button onClick={handleOpenCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Add First User
            </Button>
          </div>
        </Card>
      )}

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
            {formError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-700 dark:text-red-400 text-sm">{formError}</p>
              </div>
            )}

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
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
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
                  <select
                    id="permissionLevel"
                    value={formData.permissionLevel || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, permissionLevel: e.target.value || undefined })
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">-- Select Permission Level --</option>
                    {permissionLevelOptions.map((level) => (
                      <option key={level} value={level}>
                        {formatEnumDisplay(level)}
                      </option>
                    ))}
                  </select>
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
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating || updating}>
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
    </div>
  );
}
