import {
  BarChart3,
  Users,
  NotebookPen,
  Settings2,
  Images,
  Receipt,
  type LucideIcon,
} from "lucide-react";

export interface ManageTab {
  key: string;
  label: string;
  icon: LucideIcon;
}

export const MANAGE_TABS: ManageTab[] = [
  { key: "reports", label: "รายงานและยอดค้าง", icon: BarChart3 },
  { key: "tenants", label: "ข้อมูลผู้เช่า", icon: Users },
  { key: "records", label: "บันทึกรายเดือน", icon: NotebookPen },
  { key: "rooms", label: "สถานะห้องพัก", icon: Settings2 },
  { key: "details", label: "รายละเอียดห้องพัก", icon: Images },
  { key: "invoice", label: "ใบแจ้งค่าเช่า", icon: Receipt },
];

export const MANAGE_TAB_KEYS = MANAGE_TABS.map((t) => t.key);
export const DEFAULT_MANAGE_TAB = "records";
