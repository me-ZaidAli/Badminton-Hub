export interface FinancialEntry {
  signupId: number;
  sessionId: number;
  playerId: number;
  fee: number;
  paymentStatus: "PAID" | "UNPAID" | "PENDING";
  paymentMethod?: "CARD" | "BANK_TRANSFER" | "NONE" | null;
  signupStatus?: "CONFIRMED" | "WAITING" | "CANCELLED" | null;
  verifiedByAdmin?: boolean | null;
  attendanceStatus: string;
  attendanceNote?: string | null;
  partialPercentage?: number | null;
  policyMet?: boolean | null;
  signupTime: string;
  sessionTitle: string;
  sessionDate: string;
  sessionType: string;
  matchMode: string;
  sessionFee: number;
  clubId: number;
  clubName: string;
  clubSessionFee?: number | null;
  playerName: string;
  playerEmail: string;
  playerUserId: number;
  membershipStatus: string | null;
  membershipPlanName: string | null;
  membershipSessionFee: number | null;
}

export interface DashboardData {
  sessionIncome: number;
  sessionPaid: number;
  sessionPending: number;
  sessionOutstanding: number;
  inventorySales: number;
  inventoryPurchases: number;
  generalExpenses: number;
  totalIncome: number;
  totalExpenses: number;
  netRevenue: number;
  stockUsed: number;
  collectionRate: string;
  membershipTotalRevenue: number;
  membershipPaid: number;
  membershipUnpaid: number;
  membershipOverdue: number;
  membershipActiveCount: number;
}

export interface FinancialViewProps {
  filteredData: FinancialEntry[];
  dashboardData: DashboardData | undefined;
}

export function formatPounds(pence: number): string {
  return (pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
