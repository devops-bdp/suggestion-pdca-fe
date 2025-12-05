/**
 * API Types - Aligned with Backend Routes
 * 
 * Routes:
 * - /api/auth - Authentication
 * - /api/users - User management
 * - /api/suggestions - Suggestion management
 */

// ============================================================================
// ENUMS - From Prisma Schema
// ============================================================================

export enum Role {
  Non_Staff = "Non_Staff",
  Staff = "Staff",
  Group_Leader = "Group_Leader",
  Supervisor = "Supervisor",
  Dept_Head = "Dept_Head",
  Project_Manager = "Project_Manager",
  Super_Admin = "Super_Admin",
}

export enum Department {
  IT = "IT",
  HRGA = "HRGA",
  PLANT = "PLANT",
  HSE = "HSE",
  TC = "TC",
  PRODUKSI = "PRODUKSI",
  LOGISTIK = "LOGISTIK",
  ALL_DEPT = "ALL_DEPT",
}

export enum Position {
  MEKANIK = "MEKANIK",
  TYREMAN = "TYREMAN",
  WELDER = "WELDER",
  OPERATOR_DT = "OPERATOR_DT",
  OPERATOR_FT = "OPERATOR_FT",
  OPERATOR_CT = "OPERATOR_CT",
  DRIVER_LV = "DRIVER_LV",
  DRIVER_SARANA = "DRIVER_SARANA",
  GL_PRODUKSI = "GL_PRODUKSI",
  GL_LOGISTIK = "GL_LOGISTIK",
  GL_PLANT = "GL_PLANT",
  GL_HSE = "GL_HSE",
  GL_HRGA = "GL_HRGA",
  PDCA_OFFICER = "PDCA_OFFICER",
  HRGA_OFFICER = "HRGA_OFFICER",
  PLANNER = "PLANNER",
  SPV_PLANT = "SPV_PLANT",
  SPV_PRODUKSI = "SPV_PRODUKSI",
  SPV_LOGISTIK = "SPV_LOGISTIK",
  SPV_HSE = "SPV_HSE",
  SPV_HRGA = "SPV_HRGA",
  DEPT_HEAD_PLANT = "DEPT_HEAD_PLANT",
  DEPT_HEAD_PRODUKSI = "DEPT_HEAD_PRODUKSI",
  DEPT_HEAD_LOGISTIK = "DEPT_HEAD_LOGISTIK",
  DEPT_HEAD_HSE = "DEPT_HEAD_HSE",
  DEPT_HEAD_HRGA = "DEPT_HEAD_HRGA",
  IT_OFFICER = "IT_OFFICER",
  IT_MANAGER = "IT_MANAGER",
  PROJECT_MANAGER = "PROJECT_MANAGER",
  CCR = "CCR",
  MOCO = "MOCO",
  MANAGEMENT_SITE = "MANAGEMENT_SITE",
}

export enum PermissionLevel {
  SUBMITTER = "SUBMITTER",
  APPROVAL_ONLY = "APPROVAL_ONLY",
  SCORING_ONLY = "SCORING_ONLY",
  APPROVAL_SCORING = "APPROVAL_SCORING",
  FULL_ACCESS = "FULL_ACCESS",
}

export enum KriteriaSS {
  QUALITY = "QUALITY",
  COST = "COST",
  DELIVERY = "DELIVERY",
  SAFETY = "SAFETY",
  MORALE = "MORALE",
  PRODUCTIVITY = "PRODUCTIVITY",
}

export enum SifatPerbaikan {
  MENCIPTAKAN = "MENCIPTAKAN",
  MENINGKATKAN = "MENINGKATKAN",
  MENCONTOH = "MENCONTOH",
}

export enum StatusIde {
  DIAJUKAN = "DIAJUKAN",
  APPROVE = "APPROVE",
  DINILAI = "DINILAI",
}

// ============================================================================
// USER TYPES - /api/users
// ============================================================================

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  nrp: string; // BigInt in Prisma, string in API
  role: Role | string;
  permissionLevel?: PermissionLevel | string;
  department?: Department | string;
  position?: Position | string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile extends Omit<User, "password"> {
  // User profile without sensitive data
  name?: string; // Computed from firstName + lastName
  email?: string; // Optional email field
  avatar?: string; // Optional avatar URL
}

export interface UserFormData {
  firstName: string;
  lastName: string;
  nrp: string;
  role: string;
  department?: string;
  position?: string;
  permissionLevel?: string;
  password?: string; // Only for create/update
}

// ============================================================================
// AUTH TYPES - /api/auth
// ============================================================================

export interface LoginPayload {
  nrp: string;
  password: string;
}

export interface LoginResponse {
  success?: boolean;
  message?: string;
  token?: string;
  data?: {
    token?: string;
    user?: UserProfile;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  nrp: string;
  password: string;
  role?: string;
  department?: string;
  position?: string;
}

// ============================================================================
// SUGGESTION TYPES - /api/suggestions
// ============================================================================

export interface Suggestion {
  id: string;
  judulIde: string;
  masalahYangDihadapi: string;
  uraianIde: string;
  ideProsesPerbaikan: string;
  hasilUraianProses: string;
  evaluasiIde: string;
  komentarAtasan?: string;
  fotoSebelum?: string;
  fotoSesudah?: string;
  kriteriaSS: KriteriaSS | string;
  sifatPerbaikan: SifatPerbaikan | string;
  statusIde: StatusIde | string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  user?: UserProfile;
  history?: SuggestionHistory[];
  penilaian?: FormPenilaian[];
}

export interface SuggestionFormData {
  judulIde: string;
  masalahYangDihadapi: string;
  uraianIde: string;
  ideProsesPerbaikan: string;
  hasilUraianProses: string;
  evaluasiIde: string;
  komentarAtasan?: string;
  fotoSebelum?: string;
  fotoSesudah?: string;
  kriteriaSS: KriteriaSS | string;
  sifatPerbaikan: SifatPerbaikan | string;
  userId: string;
  statusIde?: StatusIde | string;
  // Additional fields from form
  noRegistSS?: string;
  tanggalUsulan?: string;
  hubungan?: string; // "Pekerjaannya" | "Penemuan" | "Bukan"
  tanggalEfektif?: string;
}

export interface PenilaianFormData {
  suggestionId: string;
  penilaianKriteria: string;
  skorKriteria: number;
  komentarPenilaian?: string;
}

export interface SuggestionStatusUpdate {
  statusIde: StatusIde | string;
  komentarAtasan?: string;
}

export interface SuggestionStatistics {
  total: number;
  diajukan: number;
  approved: number;
  dinilai: number;
}

export interface SuggestionHistory {
  id: string;
  suggestionId: string;
  statusIde: StatusIde | string;
  changedAt: string;
}

export interface FormPenilaian {
  id: string;
  suggestionId: string;
  penilaianKriteria: string;
  skorKriteria: number;
  komentarPenilaian?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiError {
  success: false;
  message: string;
  error?: string;
  statusCode?: number;
  path?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// ============================================================================
// DASHBOARD TYPES
// ============================================================================

export interface DashboardStats {
  totalUsers?: number;
  totalSuggestions?: number;
  pendingRequests?: number;
  resolvedSuggestions?: number;
  approvedSuggestions?: number;
  evaluatedSuggestions?: number;
}

// ============================================================================
// TYPE HELPERS
// ============================================================================

export type ApiEndpoint = 
  | `/auth/${string}`
  | `/users/${string}`
  | `/users/all`
  | `/users/profile`
  | `/suggestions/${string}`
  | `/suggestions`
  | string;

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

