'use client'

import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useData } from '@/types/hooks'
import { User as UserIcon, Users, BarChart3, TrendingUp, PieChart, LineChart, Timer, CheckCircle2 } from 'lucide-react'
import { UserProfile, DashboardStats, Suggestion, StatusIde, Department, Role } from '@/types/api'
import { formatEnumDisplay } from '@/types/utils'
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart as RechartsLineChart,
  Line,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

type ChartType = 'pie' | 'line' | 'bar'

export default function DashboardPage() {
  const [chartType, setChartType] = useState<ChartType>('pie')
  const [chartFilter, setChartFilter] = useState<'status' | 'department' | 'kriteria'>('status')

  const { data: profile, loading: profileLoading, error: profileError, refetch: refetchProfile } = useData<UserProfile>({
    endpoint: '/users/profile',
  })

  const { data: stats, loading: statsLoading, error: statsError } = useData<DashboardStats>({
    endpoint: '/dashboard/stats',
    immediate: false,
  })

  // Only fetch users/all if user has permission (not Staff, Non_Staff, or Supervisor)
  const canViewAllUsers = useMemo(() => {
    if (!profile?.role) return false
    const role = profile.role as string
    // Supervisor doesn't have access to Users page
    return role !== Role.Staff && role !== Role.Non_Staff && role !== Role.Supervisor
  }, [profile?.role])

  const { data: usersData, loading: usersLoading, error: usersError } = useData<any>({
    endpoint: '/users/all',
    immediate: canViewAllUsers, // Only fetch if user has permission
  })

  // Extract users array from response
  const users = useMemo(() => {
    if (!usersData) return null
    // Handle different response structures
    if (Array.isArray(usersData)) {
      return usersData
    }
    if (usersData && typeof usersData === 'object') {
      if ('data' in usersData && Array.isArray(usersData.data)) {
        return usersData.data
      }
      if ('users' in usersData && Array.isArray(usersData.users)) {
        return usersData.users
      }
    }
    return null
  }, [usersData])

  // Build suggestions endpoint - filter by userId if Staff or Non_Staff
  const suggestionsEndpoint = useMemo(() => {
    if (!profile?.id) return '/suggestions'
    const role = profile.role as string
    // Staff and Non_Staff can only see their own suggestions
    if (role === Role.Staff || role === Role.Non_Staff) {
      return `/suggestions?userId=${profile.id}`
    }
    // Other roles can see all suggestions
    return '/suggestions'
  }, [profile?.id, profile?.role])

  const { data: suggestionsData, loading: suggestionsLoading, error: suggestionsError, refetch: refetchSuggestions } = useData<any>({
    endpoint: suggestionsEndpoint,
    immediate: true,
  })

  // Check if user can view all suggestions (not Staff/Non_Staff)
  const canViewAllSuggestions = useMemo(() => {
    if (!profile?.role) return true; // Default to true if role not loaded yet
    const role = profile.role as string;
    return role !== Role.Staff && role !== Role.Non_Staff;
  }, [profile?.role]);

  // Extract suggestions array from response and filter by user role
  const suggestions = useMemo(() => {
    if (!suggestionsData) {
      if (process.env.NODE_ENV === "development") {
        console.log("[Dashboard] No suggestionsData available");
      }
      return null
    }
    
    let extractedData: any = null;
    
    // Handle different response structures
    if (Array.isArray(suggestionsData)) {
      extractedData = suggestionsData;
    } else if (suggestionsData && typeof suggestionsData === 'object') {
      if ('data' in suggestionsData && Array.isArray(suggestionsData.data)) {
        extractedData = suggestionsData.data;
      } else if ('suggestions' in suggestionsData && Array.isArray(suggestionsData.suggestions)) {
        extractedData = suggestionsData.suggestions;
      }
    }
    
    if (!extractedData || !Array.isArray(extractedData)) {
      if (process.env.NODE_ENV === "development") {
        console.log("[Dashboard] SuggestionsData structure:", Object.keys(suggestionsData || {}));
      }
      return null;
    }
    
    // Additional client-side filtering for Staff/Non_Staff to ensure they only see their own data
    if (!canViewAllSuggestions && profile?.id) {
      const filtered = extractedData.filter((suggestion: Suggestion) => {
        return suggestion.userId === profile.id || suggestion.user?.id === profile.id;
      });
      
      if (process.env.NODE_ENV === "development") {
        console.log("[Dashboard] Filtered suggestions for Staff/Non_Staff:", {
          total: extractedData.length,
          filtered: filtered.length,
          userId: profile.id
        });
      }
      
      return filtered;
    }
    
    if (process.env.NODE_ENV === "development") {
      console.log("[Dashboard] Suggestions (all):", extractedData.length);
    }
    
    return extractedData;
  }, [suggestionsData, canViewAllSuggestions, profile?.id])

  // Calculate stats from users (only show if user has permission)
  const totalUsersCount = useMemo(() => {
    if (!canViewAllUsers) return null // Don't show total users for Staff/Non_Staff
    if (users && Array.isArray(users) && users.length > 0) {
      return users.length
    }
    return 0
  }, [users, canViewAllUsers])

  const displayName = profile?.firstName && profile?.lastName
    ? `${profile.firstName} ${profile.lastName}`
    : profile?.name || 'User'

  const isLoading = profileLoading
  const hasError = profileError

  // Prepare chart data based on filter
  const chartData = useMemo(() => {
    if (!suggestions || suggestions.length === 0) return []

    if (chartFilter === 'status') {
      const statusCount: { [key: string]: number } = {}
      suggestions.forEach((s) => {
        const status = s.statusIde || 'UNKNOWN'
        statusCount[status] = (statusCount[status] || 0) + 1
      })
      return Object.entries(statusCount).map(([name, value]) => ({
        name: formatEnumDisplay(name),
        value,
      }))
    }

    if (chartFilter === 'department') {
      const deptCount: { [key: string]: number } = {}
      suggestions.forEach((s) => {
        const dept = s.user?.department || 'UNKNOWN'
        deptCount[dept] = (deptCount[dept] || 0) + 1
      })
      return Object.entries(deptCount).map(([name, value]) => ({
        name: formatEnumDisplay(name),
        value,
      }))
    }

    if (chartFilter === 'kriteria') {
      const kriteriaCount: { [key: string]: number } = {}
      suggestions.forEach((s) => {
        const kriteria = s.kriteriaSS || 'UNKNOWN'
        kriteriaCount[kriteria] = (kriteriaCount[kriteria] || 0) + 1
      })
      return Object.entries(kriteriaCount).map(([name, value]) => ({
        name: formatEnumDisplay(name),
        value,
      }))
    }

    return []
  }, [suggestions, chartFilter])

  // Colors for charts
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Welcome back, {isLoading ? 'loading...' : displayName}
        </p>
      </div>

      {/* Loading State - Full Skeleton */}
      {(isLoading || suggestionsLoading) && (
        <>
          {/* Stats Cards Skeleton */}
          <div className={`grid gap-6 ${canViewAllUsers ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'}`}>
            {canViewAllUsers && (
              <Card className="p-6 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-4"></div>
                    <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                  </div>
                  <div className="h-12 w-12 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                </div>
              </Card>
            )}
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-4"></div>
                    <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                  </div>
                  <div className="h-12 w-12 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                </div>
              </Card>
            ))}
          </div>

          {/* Profile & Chart Skeleton */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Profile Card Skeleton */}
            <Card className="p-6 animate-pulse">
              <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
              <div className="space-y-4">
                <div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-2"></div>
                  <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                </div>
                <div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-2"></div>
                  <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                </div>
                <div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-2"></div>
                  <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700 mt-4">
                <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-3"></div>
                <div className="space-y-3">
                  <div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-2"></div>
                    <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
                  </div>
                  <div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-2"></div>
                    <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Chart Card Skeleton */}
            <Card className="p-6 animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
                <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
              </div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
              <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded"></div>
            </Card>
          </div>
        </>
      )}

      {/* Error State */}
      {hasError && (
        <Card className="p-6 bg-red-50 dark:bg-red-950">
          <p className="text-red-600 dark:text-red-400 mb-4">{profileError?.message}</p>
          <button
            onClick={refetchProfile}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Try Again
          </button>
        </Card>
      )}

      {/* Stats Cards */}
      {!isLoading && !suggestionsLoading && !hasError && (
        <>
          <div className={`grid gap-6 ${canViewAllUsers ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'}`}>
            {/* Total Users - Only show if user has permission */}
            {canViewAllUsers && (
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Total Users</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {stats?.totalUsers ?? totalUsersCount ?? 0}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </Card>
            )}

            {/* Total Suggestions - Shows user's own suggestions for Staff/Non_Staff */}
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                    {canViewAllUsers ? 'Total Suggestions' : 'My Suggestions'}
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {stats?.totalSuggestions ?? (suggestions && Array.isArray(suggestions) ? suggestions.length : 0) ?? 0}
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </Card>

            {/* Pending Requests */}
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                    {canViewAllUsers ? 'Pending Requests' : 'My Pending'}
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {stats?.pendingRequests ?? (suggestions && Array.isArray(suggestions) ? suggestions.filter(s => s.statusIde === StatusIde.DIAJUKAN).length : 0) ?? 0}
                  </p>
                </div>
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                  <Timer className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </Card>

            {/* Resolved Suggestions */}
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                    {canViewAllUsers ? 'Resolved' : 'My Resolved'}
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {stats?.resolvedSuggestions ?? (suggestions && Array.isArray(suggestions) ? suggestions.filter(s => s.statusIde === StatusIde.DINILAI).length : 0) ?? 0}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </Card>
          </div>

          {/* Profile & Chart Section */}
          {!suggestionsLoading && profile && (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Combined Profile Card */}
              <Card className="p-6 space-y-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                  Profile Information
                </h2>
                
                {/* Profile Info */}
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Name</p>
                    <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                      {displayName}
                    </p>
                  </div>
                  
                  {profile.nrp && (
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">NRP</p>
                      <p className="text-lg text-slate-700 dark:text-slate-300">
                        {profile.nrp}
                      </p>
                    </div>
                  )}
                  
                  {profile.email && (
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Email</p>
                      <p className="text-lg text-slate-700 dark:text-slate-300">
                        {profile.email}
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  <h3 className="text-md font-semibold text-slate-900 dark:text-slate-100 mb-3">
                    Role & Department
                  </h3>
                  
                  {profile.role && (
                    <div className="mb-3">
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Role</p>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                        {formatEnumDisplay(profile.role)}
                      </span>
                    </div>
                  )}
                  
                  {(profile.department || (profile as any).departement) && (
                    <div className="mb-3">
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Department</p>
                      <p className="text-lg text-slate-700 dark:text-slate-300">
                        {formatEnumDisplay(profile.department || (profile as any).departement || "")}
                      </p>
                    </div>
                  )}
                  
                  {(profile.position || (profile as any).posision) && (
                    <div className="mb-3">
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Position</p>
                      <p className="text-lg text-slate-700 dark:text-slate-300">
                        {formatEnumDisplay(profile.position || (profile as any).posision || "")}
                      </p>
                    </div>
                  )}
                  
                  {profile.createdAt && (
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Member Since</p>
                      <p className="text-lg text-slate-700 dark:text-slate-300">
                        {new Date(profile.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Chart Card */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Analytics
                  </h2>
                  <div className="flex items-center gap-2">
                    {/* Chart Type Selector */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setChartType('pie')}
                        className={`h-8 px-3 ${chartType === 'pie' ? 'bg-white dark:bg-slate-700' : ''}`}
                      >
                        <PieChart className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setChartType('line')}
                        className={`h-8 px-3 ${chartType === 'line' ? 'bg-white dark:bg-slate-700' : ''}`}
                      >
                        <LineChart className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setChartType('bar')}
                        className={`h-8 px-3 ${chartType === 'bar' ? 'bg-white dark:bg-slate-700' : ''}`}
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Filter Selector */}
                <div className="mb-4">
                  <select
                    value={chartFilter}
                    onChange={(e) => setChartFilter(e.target.value as 'status' | 'department' | 'kriteria')}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                  >
                    <option value="status">By Status</option>
                    <option value="department">By Department</option>
                    <option value="kriteria">By Kriteria SS</option>
                  </select>
                </div>

                {/* Chart */}
                <div className="h-64">
                  {suggestionsLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-slate-500 dark:text-slate-400">Loading chart data...</p>
                    </div>
                  ) : suggestionsError ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2">
                      <p className="text-red-600 dark:text-red-400 text-sm">Error loading data</p>
                      <p className="text-slate-500 dark:text-slate-400 text-xs">{suggestionsError.message}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => refetchSuggestions()}
                      >
                        Retry
                      </Button>
                    </div>
                  ) : !suggestions || suggestions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2">
                      <p className="text-slate-500 dark:text-slate-400">No suggestions data available</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => refetchSuggestions()}
                      >
                        Retry
                      </Button>
                    </div>
                  ) : chartData.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-slate-500 dark:text-slate-400">No data available for selected filter</p>
                    </div>
                  ) : chartType === 'pie' ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  ) : chartType === 'line' ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" fill="#3b82f6" />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Empty State */}
          {!profile && !isLoading && !hasError && (
            <Card className="p-12 flex items-center justify-center min-h-52">
              <p className="text-slate-500 dark:text-slate-400 text-lg">
                Profile information unavailable.
              </p>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
