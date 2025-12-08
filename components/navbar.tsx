"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Bell, Search, LogOut, User, X, FileText, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiClient, logout } from "@/types/api-client";
import { useData } from "@/types/hooks";
import { UserProfile, Suggestion, Role } from "@/types/api";
import { formatEnumDisplay } from "@/types/utils";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Build endpoint with userId filter for Staff/Non_Staff users
  const suggestionsEndpoint = useMemo(() => {
    if (!user?.role || !user?.id) return "/suggestions";
    
    const role = user.role as string;
    // Staff/Non_Staff can only see their own suggestions
    if (role === Role.Staff || role === Role.Non_Staff) {
      return `/suggestions?userId=${user.id}`;
    }
    return "/suggestions";
  }, [user?.role, user?.id]);

  // Fetch suggestions and users for search
  const { data: suggestionsData } = useData<Suggestion[]>({
    endpoint: suggestionsEndpoint,
    immediate: searchQuery.trim().length > 0, // Only fetch when there's a search query
  });

  const { data: usersData } = useData<any>({
    endpoint: "/users/all",
    immediate: searchQuery.trim().length > 0 && user?.role !== "Staff" && user?.role !== "Non_Staff", // Only fetch if user has permission
  });

  // Check if user can view all suggestions (Staff/Non_Staff can only see their own)
  const canViewAllSuggestions = useMemo(() => {
    if (!user?.role) return true; // Default to true if role not loaded yet
    const role = user.role as string;
    return role !== Role.Staff && role !== Role.Non_Staff;
  }, [user?.role]);

  // Extract suggestions array and filter by user role
  const suggestions = useMemo(() => {
    if (!suggestionsData) return [];
    
    // Extract array from response
    let suggestionsArray: Suggestion[] = [];
    if (Array.isArray(suggestionsData)) {
      suggestionsArray = suggestionsData;
    } else if (suggestionsData && typeof suggestionsData === 'object') {
      const data = suggestionsData as any;
      if ('data' in data && Array.isArray(data.data)) {
        suggestionsArray = data.data;
      }
    }
    
    // Filter by user role - Staff/Non_Staff can only see their own suggestions
    if (!canViewAllSuggestions && user?.id) {
      suggestionsArray = suggestionsArray.filter((suggestion: Suggestion) => {
        // Only show suggestions that belong to the current user
        const belongsToUser = suggestion.userId === user.id || suggestion.user?.id === user.id;
        return belongsToUser;
      });
      
      if (process.env.NODE_ENV === "development") {
        console.log("[Navbar Search] Filtered suggestions for Staff/Non_Staff:", {
          userId: user.id,
          role: user.role,
          filteredCount: suggestionsArray.length
        });
      }
    }
    
    return suggestionsArray;
  }, [suggestionsData, canViewAllSuggestions, user?.id, user?.role]);

  // Extract users array
  const users = useMemo(() => {
    if (!usersData) return [];
    if (Array.isArray(usersData)) return usersData;
    if (usersData && typeof usersData === 'object') {
      const data = usersData as any;
      if ('data' in data && Array.isArray(data.data)) {
        return data.data;
      }
    }
    return [];
  }, [usersData]);

  // Filter search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return { suggestions: [], users: [] };

    const query = searchQuery.toLowerCase().trim();
    const filteredSuggestions: Suggestion[] = [];
    const filteredUsers: any[] = [];

    // Filter suggestions
    suggestions.forEach((suggestion: Suggestion) => {
      const matchesTitle = suggestion.judulIde?.toLowerCase().includes(query);
      const matchesProblem = suggestion.masalahYangDihadapi?.toLowerCase().includes(query);
      const matchesUser = suggestion.user && (
        suggestion.user.nrp?.toString().toLowerCase().includes(query) ||
        `${suggestion.user.firstName} ${suggestion.user.lastName}`.toLowerCase().includes(query) ||
        suggestion.user.firstName?.toLowerCase().includes(query) ||
        suggestion.user.lastName?.toLowerCase().includes(query)
      );

      if (matchesTitle || matchesProblem || matchesUser) {
        filteredSuggestions.push(suggestion);
      }
    });

    // Filter users
    users.forEach((userItem: any) => {
      const matchesNRP = userItem.nrp?.toString().toLowerCase().includes(query);
      const matchesName = `${userItem.firstName || ""} ${userItem.lastName || ""}`.toLowerCase().includes(query) ||
        userItem.firstName?.toLowerCase().includes(query) ||
        userItem.lastName?.toLowerCase().includes(query);

      if (matchesNRP || matchesName) {
        filteredUsers.push(userItem);
      }
    });

    return {
      suggestions: filteredSuggestions.slice(0, 5), // Limit to 5 results
      users: filteredUsers.slice(0, 5), // Limit to 5 results
    };
  }, [searchQuery, suggestions, users]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowSearchResults(value.trim().length > 0);
  };

  // Handle search result click
  const handleSuggestionClick = (suggestion: Suggestion) => {
    setSearchQuery("");
    setShowSearchResults(false);
    setIsSearchActive(false);
    router.push("/dashboard/suggestions");
    // You could also navigate to a specific suggestion detail page if available
  };

  const handleUserClick = (userItem: any) => {
    setSearchQuery("");
    setShowSearchResults(false);
    setIsSearchActive(false);
    router.push("/dashboard/users");
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (showSearchResults) {
        // Small delay to allow click events to process
        setTimeout(() => setShowSearchResults(false), 200);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showSearchResults]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      // Check if token exists before making request
      const token = typeof window !== "undefined" 
        ? window.localStorage.getItem("token") 
        : null;
      
      if (!token) {
        console.warn("No token found, skipping profile fetch");
        setLoading(false);
        return;
      }

      try {
        const data = await apiClient.get<UserProfile>("/users/profile");
        // Handle different possible response structures
        const profileData = (data as any)?.data || data;
        setUser(profileData);
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
        // Don't set fallback, let it remain null
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  // Calculate display name from firstName and lastName, similar to dashboard
  const displayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.name || "User";

  return (
    <nav className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 md:px-6 py-4">
      {/* Desktop Search */}
      <div className="hidden md:flex items-center justify-between gap-4">
        <div className="flex-1 max-w-md relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4 z-10" />
            <Input
              placeholder="Search suggestions, users..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => setShowSearchResults(searchQuery.trim().length > 0)}
              className="pl-10 bg-slate-100 dark:bg-slate-800 border-0"
            />
          </div>
          {/* Search Results Dropdown */}
          {showSearchResults && (searchResults.suggestions.length > 0 || searchResults.users.length > 0) && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
              {searchResults.suggestions.length > 0 && (
                <div className="p-2">
                  <div className="px-2 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                    Suggestions ({searchResults.suggestions.length})
                  </div>
                  {searchResults.suggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {suggestion.judulIde}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                            {suggestion.masalahYangDihadapi}
                          </p>
                          {suggestion.user && (
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                              By: {suggestion.user.firstName} {suggestion.user.lastName}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {searchResults.users.length > 0 && (
                <div className="p-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="px-2 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                    Users ({searchResults.users.length})
                  </div>
                  {searchResults.users.map((userItem) => (
                    <div
                      key={userItem.id}
                      onClick={() => handleUserClick(userItem)}
                      className="px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-slate-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {userItem.firstName} {userItem.lastName}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            NRP: {userItem.nrp} • {formatEnumDisplay(userItem.role)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar || "/img/profile.png"} />
                </Avatar>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {loading ? "Loading..." : displayName}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {loading ? "..." : user?.role ? formatEnumDisplay(user.role) : "Super Admin"}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {displayName}
                  </p>
                  {user?.nrp && (
                    <p className="text-xs leading-none text-slate-500 dark:text-slate-400">
                      NRP: {user.nrp}
                    </p>
                  )}
                  {user?.email && (
                    <p className="text-xs leading-none text-slate-500 dark:text-slate-400">
                      {user.email}
                    </p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="font-normal">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="text-sm">Role: {user?.role ? formatEnumDisplay(user.role) : "Super Admin"}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                variant="destructive"
                className="cursor-pointer"
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden flex items-center justify-between gap-2 min-h-12">
        {/* Left side - Empty space for hamburger menu */}
        <div className="shrink-0 w-8"></div>

        {/* Center - Search Bar (when active) */}
        {isSearchActive ? (
          <div className="flex-1 max-w-[calc(100%-8rem)] relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4 z-10" />
              <Input
                placeholder="Search suggestions, users..."
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => setShowSearchResults(searchQuery.trim().length > 0)}
                className="pl-10 bg-slate-100 dark:bg-slate-800 border-0"
                autoFocus
              />
            </div>
            {/* Search Results Dropdown for Mobile */}
            {showSearchResults && (searchResults.suggestions.length > 0 || searchResults.users.length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                {searchResults.suggestions.length > 0 && (
                  <div className="p-2">
                    <div className="px-2 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                      Suggestions ({searchResults.suggestions.length})
                    </div>
                    {searchResults.suggestions.map((suggestion) => (
                      <div
                        key={suggestion.id}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <FileText className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                              {suggestion.judulIde}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                              {suggestion.masalahYangDihadapi}
                            </p>
                            {suggestion.user && (
                              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                By: {suggestion.user.firstName} {suggestion.user.lastName}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {searchResults.users.length > 0 && (
                  <div className="p-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="px-2 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                      Users ({searchResults.users.length})
                    </div>
                    {searchResults.users.map((userItem) => (
                      <div
                        key={userItem.id}
                        onClick={() => handleUserClick(userItem)}
                        className="px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-slate-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                              {userItem.firstName} {userItem.lastName}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              NRP: {userItem.nrp} • {formatEnumDisplay(userItem.role)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1"></div>
        )}

        {/* Right side - Icons */}
        {!isSearchActive ? (
          <div className="flex items-center gap-2 shrink-0">
            {/* Search Icon */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSearchActive(true)}
              className="h-9 w-9 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Search className="h-5 w-5" />
            </Button>

            {/* Notification */}
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
            </Button>

            {/* Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar || "/img/profile.png"} />
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {displayName}
                    </p>
                    {user?.nrp && (
                      <p className="text-xs leading-none text-slate-500 dark:text-slate-400">
                        NRP: {user.nrp}
                      </p>
                    )}
                    {user?.email && (
                      <p className="text-xs leading-none text-slate-500 dark:text-slate-400">
                        {user.email}
                      </p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="font-normal">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="text-sm">Role: {user?.role ? formatEnumDisplay(user.role) : "Super Admin"}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  variant="destructive"
                  className="cursor-pointer"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          /* Close button (when search active) */
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setIsSearchActive(false);
              setSearchQuery("");
              setShowSearchResults(false);
            }}
            className="h-9 w-9 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>
    </nav>
  );
}
