import type {
  Role,
  MedicineUnit,
  POStatus,
  LocationType,
  SaleStatus,
  PaymentMethod,
  PrescriptionStatus,
  AdjustmentType,
  ReturnType,
  ReturnStatus,
  NotificationType,
  NotificationPriority,
} from "@prisma/client";

export type {
  Role,
  MedicineUnit,
  POStatus,
  LocationType,
  SaleStatus,
  PaymentMethod,
  PrescriptionStatus,
  AdjustmentType,
  ReturnType,
  ReturnStatus,
  NotificationType,
  NotificationPriority,
};

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  meta?: Record<string, unknown>;
  error?: {
    message: string;
    details?: unknown;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatar?: string | null;
}

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatar?: string | null;
  isActive: boolean;
  lastLogin?: string | null;
  createdAt: string;
  updatedAt: string;
  /** Custom module → none|view|edit. Null/empty = role defaults. */
  moduleAccess?: Record<string, "none" | "view" | "edit"> | null;
}

export interface MedicineDTO {
  id: string;
  name: string;
  genericName?: string | null;
  brand?: string | null;
  category: string;
  description?: string | null;
  sku: string;
  barcode?: string | null;
  unit: MedicineUnit;
  strength?: string | null;
  manufacturer?: string | null;
  country?: string | null;
  requiresPrescription: boolean;
  isControlled: boolean;
  isActive: boolean;
  imageUrl?: string | null;
  minStockLevel: number;
  reorderPoint: number;
  totalStock?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BatchDTO {
  id: string;
  medicineId: string;
  supplierId?: string | null;
  batchNumber: string;
  quantity: number;
  remainingQuantity: number;
  unitCost: number;
  sellingPrice: number;
  expiryDate: string;
  receivedDate: string;
  locationId?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierDTO {
  id: string;
  name: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  taxId?: string | null;
  paymentTerms?: string | null;
  isActive: boolean;
  rating?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerDTO {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  address?: string | null;
  allergies?: string | null;
  medicalHistory?: string | null;
  insuranceProvider?: string | null;
  insuranceNumber?: string | null;
  loyaltyPoints: number;
  outstandingBalance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderItemDTO {
  id: string;
  purchaseOrderId: string;
  medicineId: string;
  quantity: number;
  receivedQuantity: number;
  unitCost: number;
  totalCost: number;
  batchNumber?: string | null;
  expiryDate?: string | null;
  medicine?: MedicineDTO;
}

export interface PurchaseOrderDTO {
  id: string;
  poNumber: string;
  supplierId: string;
  status: POStatus;
  expectedDate?: string | null;
  notes?: string | null;
  totalAmount: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  supplier?: SupplierDTO;
  items?: PurchaseOrderItemDTO[];
}

export interface SaleItemDTO {
  id: string;
  saleId: string;
  batchId: string;
  medicineId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  medicine?: MedicineDTO;
  batch?: BatchDTO;
}

export interface SaleDTO {
  id: string;
  saleNumber: string;
  customerId?: string | null;
  cashierId: string;
  prescriptionId?: string | null;
  status: SaleStatus;
  paymentMethod: PaymentMethod;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amountPaid: number;
  change: number;
  notes?: string | null;
  loyaltyRedeemed: number;
  loyaltyEarned: number;
  isHeld: boolean;
  createdAt: string;
  updatedAt: string;
  customer?: CustomerDTO | null;
  cashier?: UserDTO;
  items?: SaleItemDTO[];
}

export interface PrescriptionItemDTO {
  id: string;
  prescriptionId: string;
  medicineId: string;
  dosage: string;
  frequency: string;
  duration?: string | null;
  quantity: number;
  dispensedQuantity: number;
  notes?: string | null;
  medicine?: MedicineDTO;
}

export interface PrescriptionDTO {
  id: string;
  prescriptionNumber: string;
  customerId: string;
  doctorName: string;
  doctorLicense?: string | null;
  hospitalClinic?: string | null;
  issuedDate: string;
  expiryDate?: string | null;
  status: PrescriptionStatus;
  imageUrl?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: CustomerDTO;
  items?: PrescriptionItemDTO[];
}

export interface ReturnItemDTO {
  id: string;
  returnId: string;
  medicineId: string;
  batchId?: string | null;
  quantity: number;
  unitPrice: number;
  refundAmount: number;
  reason?: string | null;
  medicine?: MedicineDTO;
}

export interface ReturnDTO {
  id: string;
  returnNumber: string;
  saleId?: string | null;
  customerId?: string | null;
  type: ReturnType;
  status: ReturnStatus;
  reason?: string | null;
  totalRefund: number;
  processedById: string;
  createdAt: string;
  updatedAt: string;
  items?: ReturnItemDTO[];
}

export interface StockLocationDTO {
  id: string;
  name: string;
  description?: string | null;
  type: LocationType;
  isActive: boolean;
}

export interface StockAdjustmentDTO {
  id: string;
  batchId: string;
  medicineId: string;
  type: AdjustmentType;
  quantityChange: number;
  previousQuantity: number;
  newQuantity: number;
  reason?: string | null;
  performedById: string;
  createdAt: string;
}

export interface NotificationDTO {
  id: string;
  userId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  priority: NotificationPriority;
  relatedId?: string | null;
  relatedType?: string | null;
  createdAt: string;
}

export interface AuditLogDTO {
  id: string;
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  oldValues?: unknown;
  newValues?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface SettingDTO {
  id: string;
  key: string;
  value: string;
  category: string;
  description?: string | null;
  updatedById?: string | null;
  updatedAt: string;
}

export interface DashboardSalesPoint {
  date: string;
  label: string;
  revenue: number;
  sales: number;
}

export interface DashboardTopMedicine {
  medicineId: string;
  name: string;
  quantity: number;
  revenue: number;
}

export interface DashboardExpiryAlert {
  batchId: string;
  batchNumber: string;
  medicineId: string;
  medicineName: string;
  remainingQuantity: number;
  expiryDate: string;
  status: "expired" | "critical" | "warning" | "ok";
  daysUntilExpiry: number;
}

export interface DashboardRecentSale {
  id: string;
  saleNumber: string;
  total: number;
  paymentMethod: PaymentMethod;
  status: SaleStatus;
  createdAt: string;
  cashierName?: string | null;
  customerName?: string | null;
  itemCount: number;
}

export interface DashboardPaymentMethodStat {
  method: PaymentMethod;
  count: number;
  total: number;
}

export interface DashboardStats {
  todayRevenue: number;
  totalSalesToday: number;
  totalSalesAllTime: number;
  lowStockCount: number;
  expiringSoonCount: number;
  pendingPrescriptions: number;
  activeCustomers: number;
  salesChart: {
    days7: DashboardSalesPoint[];
    days30: DashboardSalesPoint[];
  };
  topMedicines: DashboardTopMedicine[];
  expiryAlerts: DashboardExpiryAlert[];
  recentSales: DashboardRecentSale[];
  paymentMethods: DashboardPaymentMethodStat[];
}

export interface MedicineListItem extends MedicineDTO {
  totalStock: number;
  stockLevel: "out" | "critical" | "low" | "ok" | "overstocked";
  nearestExpiry?: string | null;
  batchCount: number;
}

export interface BatchListItem extends BatchDTO {
  medicine?: Pick<MedicineDTO, "id" | "name" | "sku" | "unit" | "category">;
  supplier?: Pick<SupplierDTO, "id" | "name"> | null;
  location?: Pick<StockLocationDTO, "id" | "name" | "type"> | null;
  expiryStatus: "expired" | "critical" | "warning" | "ok";
  daysUntilExpiry: number;
}
