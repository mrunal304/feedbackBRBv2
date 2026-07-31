import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Star,
  TrendingUp,
  Phone,
  MessageSquare,
  BarChart3,
  ChevronDown,
  Eye,
  LogOut,
  Search,
  X,
  Menu,
  PhoneCall,
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import RatingStars from "@/components/RatingStars";
import FloatingDatePicker from "@/components/FloatingDatePicker";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  TooltipProps,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import type { Feedback, Analytics } from "@shared/schema";

const CHART_COLORS = ["#8B1A1A", "#f5a623", "#22a34a", "#b4635d", "#FF8C8C"];

const formatCamelCase = (str: string): string => {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
};

/** Returns a YYYY-MM-DD string in LOCAL time (not UTC) */
const localDateStr = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/** Returns ordinal string: 1 → "1st", 2 → "2nd", 3 → "3rd", etc. */
const toOrdinal = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const parseChartDate = (dateStr: any, index: number = 0): string => {
  if (!dateStr) return `Day ${index + 1}`;
  
  try {
    // Try to parse as YYYY-MM-DD format
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) {
      return `Day ${index + 1}`;
    }
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${dayName}, ${monthDay}`;
  } catch {
    return `Day ${index + 1}`;
  }
};

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as any;
    const dateStr = data?.date || label;
    const dataIndex = (payload[0].payload as any)?.__index || 0;
    const formattedDate = parseChartDate(dateStr, dataIndex);

    return (
      <div style={{ 
        backgroundColor: '#fff', 
        padding: '8px 12px', 
        border: '1px solid #ddd',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <p style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: 'bold', color: '#3D2B1F' }}>
          {formattedDate}
        </p>
        {payload.map((entry, index) => (
          <p key={index} style={{ margin: '2px 0', fontSize: '12px', color: entry.color }}>
            {formatCamelCase(entry.dataKey)}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AdminPanelMobile() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("analytics");
  const [overviewFilter, setOverviewFilter] = useState<'last7days' | 'today' | 'thisMonth' | 'lastMonth' | 'selectMonth' | 'customRange'>('last7days');
  const [overviewMonthValue, setOverviewMonthValue] = useState({ month: new Date().getMonth(), year: new Date().getFullYear() });
  const [pendingOverviewMonth, setPendingOverviewMonth] = useState({ month: new Date().getMonth(), year: new Date().getFullYear() });
  const [showOverviewMonthPicker, setShowOverviewMonthPicker] = useState(false);
  const [showOverviewCustomRange, setShowOverviewCustomRange] = useState(false);
  const [overviewCustomStart, setOverviewCustomStart] = useState('');
  const [overviewCustomEnd, setOverviewCustomEnd] = useState('');
  const [pendingCustomStart, setPendingCustomStart] = useState('');
  const [pendingCustomEnd, setPendingCustomEnd] = useState('');
  const [showOverviewFilterPanel, setShowOverviewFilterPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter] = useState<"all" | "contacted" | "pending">("all");
  const [selectedDate, setSelectedDate] = useState<string>(localDateStr(new Date()));
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'thisWeek' | 'thisMonth' | 'lastMonth' | 'selectMonth' | 'customRange' | null>(null);
  const [filterLabel, setFilterLabel] = useState('');
  const [selectMonthValue, setSelectMonthValue] = useState({ month: new Date().getMonth(), year: new Date().getFullYear() });
  const [customRangeStart, setCustomRangeStart] = useState('');
  const [customRangeEnd, setCustomRangeEnd] = useState('');
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const { data: authCheck, isLoading: authLoading } = useQuery({
    queryKey: ["/api/auth/check"],
  });

  useEffect(() => {
    if (!authLoading && !(authCheck as any)?.authenticated) {
      navigate("/login");
    }
  }, [authCheck, authLoading, navigate]);

  // Compute date range based on active filter
  let filterStartDate = selectedDate;
  let filterEndDate = selectedDate;
  if (activeFilter === 'thisWeek') {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    filterStartDate = localDateStr(monday);
    filterEndDate = localDateStr(now);
  } else if (activeFilter === 'thisMonth') {
    const now = new Date();
    filterStartDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    filterEndDate = localDateStr(now);
  } else if (activeFilter === 'lastMonth') {
    const now = new Date();
    filterStartDate = localDateStr(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    filterEndDate = localDateStr(new Date(now.getFullYear(), now.getMonth(), 0));
  } else if (activeFilter === 'selectMonth') {
    filterStartDate = `${selectMonthValue.year}-${String(selectMonthValue.month + 1).padStart(2, '0')}-01`;
    filterEndDate = localDateStr(new Date(selectMonthValue.year, selectMonthValue.month + 1, 0));
  } else if (activeFilter === 'customRange' && customRangeStart && customRangeEnd) {
    filterStartDate = customRangeStart;
    filterEndDate = customRangeEnd;
  }

  // Showing label
  let showingLabel: string;
  if (activeFilter === 'thisWeek') {
    showingLabel = `${format(new Date(filterStartDate + 'T12:00:00'), 'd MMM')} – ${format(new Date(filterEndDate + 'T12:00:00'), 'd MMM yyyy')}`;
  } else if (activeFilter === 'thisMonth') {
    showingLabel = format(new Date(), 'MMMM yyyy');
  } else if (activeFilter === 'lastMonth') {
    const lm = new Date(); lm.setDate(1); lm.setMonth(lm.getMonth() - 1);
    showingLabel = format(lm, 'MMMM yyyy');
  } else if (activeFilter === 'selectMonth') {
    showingLabel = format(new Date(selectMonthValue.year, selectMonthValue.month, 1), 'MMMM yyyy');
  } else if (activeFilter === 'customRange' && customRangeStart && customRangeEnd) {
    showingLabel = `${format(new Date(customRangeStart + 'T12:00:00'), 'dd MMM')} – ${format(new Date(customRangeEnd + 'T12:00:00'), 'dd MMM yyyy')}`;
  } else {
    const todayStr = localDateStr(new Date());
    const yd = new Date(); yd.setDate(yd.getDate() - 1);
    const yesterdayStr = localDateStr(yd);
    if (selectedDate === todayStr) {
      showingLabel = `Today, ${format(new Date(selectedDate + 'T12:00:00'), 'd MMM yyyy')}`;
    } else if (selectedDate === yesterdayStr) {
      showingLabel = `Yesterday, ${format(new Date(selectedDate + 'T12:00:00'), 'd MMM yyyy')}`;
    } else {
      showingLabel = format(new Date(selectedDate + 'T12:00:00'), 'd MMM yyyy');
    }
  }

  const feedbackUrl = `/api/feedback?startDate=${filterStartDate}&endDate=${filterEndDate}&status=${statusFilter}`;
  const { data: feedback = [], refetch: refetchFeedback } = useQuery<Feedback[]>({
    queryKey: [feedbackUrl],
    enabled: !!(authCheck as any)?.authenticated,
    refetchInterval: 15000,
  });

  // Overview filter button label
  const overviewFilterLabel = (() => {
    if (overviewFilter === 'today') return 'Today';
    if (overviewFilter === 'thisMonth') return 'This Month';
    if (overviewFilter === 'lastMonth') return 'Last Month';
    if (overviewFilter === 'selectMonth') return format(new Date(overviewMonthValue.year, overviewMonthValue.month, 1), 'MMM yyyy');
    if (overviewFilter === 'customRange' && overviewCustomStart && overviewCustomEnd)
      return `${format(new Date(overviewCustomStart + 'T12:00:00'), 'dd MMM')} – ${format(new Date(overviewCustomEnd + 'T12:00:00'), 'dd MMM yyyy')}`;
    return 'Last 7 Days';
  })();

  // Overview filter date range
  const todayOverview = localDateStr(new Date());
  let analyticsStartDate: string;
  let analyticsEndDate: string;
  if (overviewFilter === 'today') {
    analyticsStartDate = todayOverview;
    analyticsEndDate = todayOverview;
  } else if (overviewFilter === 'thisMonth') {
    const now = new Date();
    analyticsStartDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    analyticsEndDate = todayOverview;
  } else if (overviewFilter === 'lastMonth') {
    const now = new Date();
    analyticsStartDate = localDateStr(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    analyticsEndDate = localDateStr(new Date(now.getFullYear(), now.getMonth(), 0));
  } else if (overviewFilter === 'selectMonth') {
    analyticsStartDate = `${overviewMonthValue.year}-${String(overviewMonthValue.month + 1).padStart(2, '0')}-01`;
    analyticsEndDate = localDateStr(new Date(overviewMonthValue.year, overviewMonthValue.month + 1, 0));
  } else if (overviewFilter === 'customRange' && overviewCustomStart && overviewCustomEnd) {
    analyticsStartDate = overviewCustomStart;
    analyticsEndDate = overviewCustomEnd;
  } else {
    // last7days (default)
    const d = new Date(); d.setDate(d.getDate() - 6);
    analyticsStartDate = localDateStr(d);
    analyticsEndDate = todayOverview;
  }

  const analyticsUrl = `/api/analytics?startDate=${analyticsStartDate}&endDate=${analyticsEndDate}`;
  const { data: analytics, refetch: refetchAnalytics } = useQuery<Analytics>({
    queryKey: [analyticsUrl],
    enabled: !!(authCheck as any)?.authenticated,
    refetchInterval: 30000,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/check"] });
      navigate("/login");
    },
  });

  const contactMutation = useMutation({
    mutationFn: async ({ id, staffName }: { id: string; staffName: string }) => {
      const response = await apiRequest("PATCH", `/api/feedback/${id}/contact`, { staffName });
      return response.json();
    },
    onSuccess: ({ _id: id }) => {
      // Show toast first
      toast({
        title: "✓ Marked as Contacted",
        description: "Customer has been marked as contacted.\nStatus updated from Pending to Contacted.",
        duration: 3000,
      });
      
      // Then update status after toast appears
      setTimeout(() => {
        const newFeedback = feedback.map(fb => 
          fb._id === id ? { ...fb, status: "contacted" as const } : fb
        );
        queryClient.setQueryData([feedbackUrl], newFeedback);
        
        if (selectedFeedback && selectedFeedback._id === id) {
          setSelectedFeedback({ ...selectedFeedback, status: "contacted" });
        }
      }, 50);
      
      // Invalidate cache to ensure fresh data from server
      queryClient.invalidateQueries({ queryKey: [feedbackUrl] });
      
      // Instantly refresh analytics to update Feedback Volume, Response Rate, etc.
      refetchAnalytics();
    },
    onError: () => {
      toast({
        title: "✗ Failed to update status",
        description: "Please try again",
        variant: "destructive",
        duration: 3000,
      });
    },
  });

  const handleContactCustomer = (fb: Feedback) => {
    contactMutation.mutate({ id: fb._id as string, staffName: "Admin" });
  };

  const getAverageRating = (ratings: Feedback["ratings"]) => {
    const ratingsArray = [
      ratings.foodTaste,
      ratings.foodTemperature,
      ratings.portionSize,
      ratings.valueForMoney,
      ratings.presentation,
      ratings.overallService,
    ];
    const validRatings = ratingsArray.filter(
      (r) => r !== null && r !== undefined && !isNaN(Number(r))
    );
    if (validRatings.length === 0) return "N/A";
    const avg =
      validRatings.reduce((a, b) => a + Number(b), 0) / validRatings.length;
    return avg.toFixed(1);
  };

  const filteredFeedback = feedback.filter((fb) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return fb.name.toLowerCase().includes(query) || fb.phone.includes(query);
  });

  const clearAdvancedFilter = () => {
    setActiveFilter(null);
    setFilterLabel('');
    setShowMonthPicker(false);
    setShowCustomRange(false);
    setSelectedDate(localDateStr(new Date()));
  };

  const handleDateChange = (date: Date) => {
    setSelectedDate(localDateStr(date));
    setActiveFilter(null);
    setFilterLabel('');
  };

  const handleClearDate = () => {
    setSelectedDate(localDateStr(new Date()));
    setActiveFilter(null);
    setFilterLabel('');
  };

  const setToday = () => {
    setSelectedDate(localDateStr(new Date()));
    setActiveFilter(null);
    setFilterLabel('');
  };

  const setYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setSelectedDate(localDateStr(yesterday));
    setActiveFilter(null);
    setFilterLabel('');
  };

  if (authLoading || !(authCheck as any)?.authenticated) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#FDF8F6] pb-24">
      {/* Mobile Top Header */}
      <header className="sticky top-0 z-40 bg-[#8B1A1A] text-white px-4 py-4 flex items-center justify-between shadow-sm">
        <h1 className="text-[18px] font-bold">Admin Panel</h1>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-2 hover:bg-white/10 rounded transition"
          data-testid="button-menu"
        >
          {showMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Menu Dropdown */}
      {showMenu && (
        <div className="bg-[#8B1A1A] border-b border-white/10 px-4 py-3 pb-6 overflow-visible">
          <div className="flex flex-col gap-2 mb-3">
            <div className="flex items-center gap-3 p-2 border-b border-white/10 pb-3">
              <div className="w-10 h-10 rounded-full bg-pink-200 flex items-center justify-center text-[#8B1A1A] font-bold flex-shrink-0">
                A
              </div>
              <div className="flex-1 overflow-hidden min-w-0">
                <p className="text-white font-medium text-[13px] truncate">admin</p>
                <p className="text-pink-100/70 text-[11px]">Admin</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              logoutMutation.mutate();
              setShowMenu(false);
            }}
            data-testid="button-logout"
            className="flex items-center gap-3 w-full px-4 h-12 rounded-md border text-[15px] font-medium transition-colors text-white/80 hover:text-white hover:bg-white/10 border-white/30"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 px-4 py-4 space-y-4">
        {activeTab === "analytics" && (
          <div className="space-y-6">
            {/* Dashboard Overview Header + Period Filter */}
            <div className="space-y-3">
              <div>
                <h2 className="text-xl font-bold text-[#3D2B1F]">Dashboard Overview</h2>
                <p className="text-gray-500 text-[13px] mt-1">Welcome back, here's what's happening today.</p>
              </div>
              <Button
                variant="outline"
                className="w-full justify-between border-[#8B1A1A] text-[#8B1A1A] hover:bg-[#8B1A1A]/5"
                onClick={() => { setShowOverviewFilterPanel(v => !v); setShowOverviewMonthPicker(false); setShowOverviewCustomRange(false); }}
                data-testid="dropdown-period-mobile"
              >
                {overviewFilterLabel}
                <ChevronDown className={`ml-2 h-4 w-4 transition-transform duration-200 ${showOverviewFilterPanel ? 'rotate-180' : ''}`} />
              </Button>

              {showOverviewFilterPanel && (
                <div className="bg-white rounded-lg shadow-sm p-3 space-y-2">
                  {/* Filter option buttons */}
                  <div className="flex flex-wrap gap-2">
                    {([
                      { key: 'today', label: 'Today' },
                      { key: 'last7days', label: 'Last 7 Days' },
                      { key: 'thisMonth', label: 'This Month' },
                      { key: 'lastMonth', label: 'Last Month' },
                    ] as const).map(({ key, label }) => (
                      <Button
                        key={key}
                        size="sm"
                        className={`h-8 px-3 text-xs ${overviewFilter === key ? 'bg-[#8B1A1A] text-white hover:bg-[#8B1A1A]/90' : 'bg-white border border-[#8B1A1A] text-[#8B1A1A] hover:bg-[#8B1A1A]/5'}`}
                        variant={overviewFilter === key ? 'default' : 'outline'}
                        onClick={() => { setOverviewFilter(key); setShowOverviewMonthPicker(false); setShowOverviewCustomRange(false); setShowOverviewFilterPanel(false); }}
                      >
                        {label}
                      </Button>
                    ))}
                    <Button
                      size="sm"
                      className={`h-8 px-3 text-xs ${overviewFilter === 'selectMonth' || showOverviewMonthPicker ? 'bg-[#8B1A1A] text-white hover:bg-[#8B1A1A]/90' : 'bg-white border border-[#8B1A1A] text-[#8B1A1A] hover:bg-[#8B1A1A]/5'}`}
                      variant={overviewFilter === 'selectMonth' || showOverviewMonthPicker ? 'default' : 'outline'}
                      onClick={() => { setShowOverviewMonthPicker(v => !v); setShowOverviewCustomRange(false); setPendingOverviewMonth(overviewMonthValue); }}
                    >
                      {overviewFilter === 'selectMonth'
                        ? `${format(new Date(overviewMonthValue.year, overviewMonthValue.month, 1), 'MMM yyyy')} ${showOverviewMonthPicker ? '↑' : '↓'}`
                        : `Select Month ${showOverviewMonthPicker ? '↑' : '›'}`}
                    </Button>
                    <Button
                      size="sm"
                      className={`h-8 px-3 text-xs ${overviewFilter === 'customRange' || showOverviewCustomRange ? 'bg-[#8B1A1A] text-white hover:bg-[#8B1A1A]/90' : 'bg-white border border-[#8B1A1A] text-[#8B1A1A] hover:bg-[#8B1A1A]/5'}`}
                      variant={overviewFilter === 'customRange' || showOverviewCustomRange ? 'default' : 'outline'}
                      onClick={() => { setShowOverviewCustomRange(v => !v); setShowOverviewMonthPicker(false); setPendingCustomStart(overviewCustomStart); setPendingCustomEnd(overviewCustomEnd); }}
                    >
                      {overviewFilter === 'customRange' && overviewCustomStart && overviewCustomEnd
                        ? `${format(new Date(overviewCustomStart + 'T12:00:00'), 'dd MMM')} – ${format(new Date(overviewCustomEnd + 'T12:00:00'), 'dd MMM yyyy')} ${showOverviewCustomRange ? '↑' : '↓'}`
                        : `Custom Range ${showOverviewCustomRange ? '↑' : '›'}`}
                    </Button>
                  </div>

                  {/* Month picker sub-row */}
                  {showOverviewMonthPicker && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-widest w-full">Pick Month:</span>
                      <select
                        value={pendingOverviewMonth.year}
                        onChange={e => setPendingOverviewMonth(v => ({ ...v, year: Number(e.target.value) }))}
                        className="border border-gray-200 rounded text-sm px-2 py-1.5 focus:outline-none focus:border-[#8B1A1A]"
                      >
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 3 + i).map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                      <select
                        value={pendingOverviewMonth.month}
                        onChange={e => setPendingOverviewMonth(v => ({ ...v, month: Number(e.target.value) }))}
                        className="border border-gray-200 rounded text-sm px-2 py-1.5 focus:outline-none focus:border-[#8B1A1A]"
                      >
                        {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                          <option key={i} value={i}>{m}</option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        className="h-8 px-4 text-xs bg-[#8B1A1A] text-white hover:bg-[#8B1A1A]/90"
                        onClick={() => { setOverviewMonthValue(pendingOverviewMonth); setOverviewFilter('selectMonth'); setShowOverviewMonthPicker(false); setShowOverviewFilterPanel(false); }}
                      >
                        Done
                      </Button>
                    </div>
                  )}

                  {/* Custom range sub-row */}
                  {showOverviewCustomRange && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-widest w-full">Date Range:</span>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500">From</label>
                        <input
                          type="date"
                          value={pendingCustomStart}
                          onChange={e => setPendingCustomStart(e.target.value)}
                          className="border border-gray-200 rounded text-sm px-2 py-1.5 focus:outline-none focus:border-[#8B1A1A]"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500">To</label>
                        <input
                          type="date"
                          value={pendingCustomEnd}
                          onChange={e => setPendingCustomEnd(e.target.value)}
                          className="border border-gray-200 rounded text-sm px-2 py-1.5 focus:outline-none focus:border-[#8B1A1A]"
                        />
                      </div>
                      <Button
                        size="sm"
                        className="h-8 px-4 text-xs bg-[#8B1A1A] text-white hover:bg-[#8B1A1A]/90 disabled:opacity-50"
                        onClick={() => { if (pendingCustomStart && pendingCustomEnd) { setOverviewCustomStart(pendingCustomStart); setOverviewCustomEnd(pendingCustomEnd); setOverviewFilter('customRange'); setShowOverviewCustomRange(false); setShowOverviewFilterPanel(false); } }}
                        disabled={!pendingCustomStart || !pendingCustomEnd}
                      >
                        Done
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Dashboard Cards - 2x2 Grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { title: "TOTAL FEEDBACK", value: analytics?.totalFeedback || 0, icon: MessageSquare, sub: "Responses received", color: "bg-blue-50 text-blue-600", valueClass: "text-[24px] font-bold text-[#3D2B1F]" },
                { title: "AVERAGE RATING", value: `${analytics?.averageRating || 0}/5`, icon: Star, sub: "Overall satisfaction", color: "bg-yellow-50 text-yellow-600", valueClass: "text-[24px] font-bold text-[#3D2B1F]" },
                { title: "TOP CATEGORY", value: analytics?.topCategory || "-", icon: TrendingUp, sub: "Highest rated", color: "bg-green-50 text-green-600", valueClass: "text-[15px] font-bold text-[#3D2B1F] break-words leading-tight" },
                { title: "RESPONSE RATE", value: `${analytics?.responseRate || 0}%`, icon: Phone, sub: "Customers contacted", color: "bg-purple-50 text-purple-600", valueClass: "text-[24px] font-bold text-[#3D2B1F]" }
              ].map((stat, i) => (
                <Card key={i} className="border-none shadow-sm rounded-lg overflow-hidden">
                  <CardContent className="p-3 space-y-2">
                    <span className="text-[11px] font-semibold text-gray-500 tracking-widest uppercase block">{stat.title}</span>
                    <div className={`w-8 h-8 p-1.5 rounded-full flex-shrink-0 ${stat.color} flex items-center justify-center`}>
                      <stat.icon className="w-4 h-4" />
                    </div>
                    <div className={stat.valueClass}>{stat.value}</div>
                    <div className="text-[12px] text-gray-500 font-medium">{stat.sub}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts - Full Width */}
            <Card className="border-none shadow-sm rounded-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-[#3D2B1F]">Weekly Rating Trends</CardTitle>
              </CardHeader>
              <CardContent>
                {(analytics?.weeklyTrends || []).length === 0 ? (
                  <div className="h-[250px] flex items-center justify-center text-gray-400">
                    <p>No data available for this week</p>
                  </div>
                ) : (
                  <div className="w-full h-[250px] overflow-x-auto">
                    <ResponsiveContainer width="100%" height="100%" minWidth={300}>
                      <LineChart data={analytics?.weeklyTrends || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                        <XAxis 
                          dataKey="date" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{fill: '#9CA3AF', fontSize: 13}} 
                          dy={10}
                          tickFormatter={(date, index) => {
                            return parseChartDate(date, index);
                          }}
                        />
                        <YAxis domain={[0, 5]} axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 13}} dx={-10} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend 
                          iconType="circle" 
                          wrapperStyle={{fontSize: '13px'}}
                          formatter={(value) => formatCamelCase(value)}
                        />
                        <Line type="monotone" dataKey="foodTaste" name="Food Taste" stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="foodTemperature" name="Food Temperature" stroke={CHART_COLORS[1]} strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="portionSize" name="Portion Size" stroke={CHART_COLORS[2]} strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="valueForMoney" name="Value For Money" stroke={CHART_COLORS[3]} strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="presentation" name="Presentation" stroke={CHART_COLORS[4]} strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="overallService" name="Overall Service" stroke="#f8c216" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-[#3D2B1F]">Category Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {(analytics?.categoryPerformance || []).length === 0 ? (
                  <div className="h-[250px] flex items-center justify-center text-gray-400">
                    <p>No data available</p>
                  </div>
                ) : (
                  <div className="w-full h-[250px] overflow-x-auto">
                    <ResponsiveContainer width="100%" height="100%" minWidth={300}>
                      <BarChart layout="vertical" data={analytics?.categoryPerformance || []}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F0F0F0" />
                        <XAxis type="number" domain={[0, 5]} axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} dy={10} />
                        <YAxis type="category" dataKey="category" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 13, fontWeight: 500}} width={150} />
                        <Tooltip 
                          cursor={{fill: '#F9FAFB'}}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
                        />
                        <Bar dataKey="average" radius={[0, 4, 4, 0]} barSize={30}>
                          {(analytics?.categoryPerformance || []).map((entry: any, index: number) => {
                            let color = "#cc2200";
                            if (entry.average >= 4.0) color = "#22a34a";
                            else if (entry.average >= 3.0) color = "#f5a623";
                            return <Cell key={`cell-${index}`} fill={color} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-[#3D2B1F]">Feedback Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Contacted", value: analytics?.feedbackVolume?.contacted || 0 },
                          { name: "Pending", value: analytics?.feedbackVolume?.pending || 0 },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        <Cell fill="#22a34a" />
                        <Cell fill="#8B1A1A" />
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "feedback" && (
          <div className="space-y-3">
            {/* Page Heading */}
            <h2 className="text-3xl font-bold text-[#3D2B1F]">Customer Feedback</h2>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-none shadow-sm bg-white rounded-lg text-sm"
                data-testid="input-search"
              />
            </div>

            {/* Date Filter */}
            <div className="bg-white p-3 rounded-lg shadow-sm space-y-2">
              {/* Row 1: Date picker + quick buttons + toggle */}
              <div className="flex flex-wrap items-center gap-2">
                <FloatingDatePicker
                  selected={new Date(selectedDate + 'T12:00:00')}
                  onSelect={handleDateChange}
                  onClear={handleClearDate}
                />
                <Button
                  size="sm"
                  onClick={setToday}
                  className={!activeFilter && selectedDate === localDateStr(new Date()) ? "bg-[#8B0000] text-white hover:bg-[#8B0000]/90 h-7 rounded" : "bg-white border border-[#8B0000] text-[#8B0000] hover:bg-[#8B0000]/5 h-7 rounded"}
                  variant={!activeFilter && selectedDate === localDateStr(new Date()) ? "default" : "outline"}
                >
                  Today
                </Button>
                <Button
                  size="sm"
                  onClick={setYesterday}
                  className={!activeFilter && selectedDate === localDateStr(new Date(Date.now() - 86400000)) ? "bg-[#8B0000] text-white hover:bg-[#8B0000]/90 h-7 rounded" : "bg-white border border-[#8B0000] text-[#8B0000] hover:bg-[#8B0000]/5 h-7 rounded"}
                  variant={!activeFilter && selectedDate === localDateStr(new Date(Date.now() - 86400000)) ? "default" : "outline"}
                >
                  Yesterday
                </Button>
                {activeFilter && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#8B0000]/10 text-[#8B0000] text-xs font-semibold rounded-full border border-[#8B0000]/20">
                    {filterLabel}
                    <button onClick={clearAdvancedFilter} className="ml-0.5 hover:opacity-70 text-base leading-none">×</button>
                  </span>
                )}
                <button
                  onClick={() => setShowAdvancedFilters(v => !v)}
                  className="p-1 rounded border border-gray-200 hover:bg-gray-50 transition-colors"
                  title={showAdvancedFilters ? "Hide filters" : "More filters"}
                >
                  <ChevronDown className="w-4 h-4 text-gray-500 transition-transform duration-200" style={{ transform: showAdvancedFilters ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                </button>
              </div>

              {/* Row 2: Advanced filter options */}
              {showAdvancedFilters && (
                <div className="pt-2 border-t border-gray-100 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {(['thisWeek', 'thisMonth', 'lastMonth'] as const).map((f, i) => {
                      const labels = ['This Week', 'This Month', 'Last Month'];
                      return (
                        <Button
                          key={f}
                          size="sm"
                          onClick={() => { setActiveFilter(f); setFilterLabel(labels[i]); setShowAdvancedFilters(false); setShowMonthPicker(false); setShowCustomRange(false); }}
                          className={`h-7 text-xs px-3 rounded ${activeFilter === f ? "bg-[#8B0000] text-white hover:bg-[#8B0000]/90" : "bg-white border border-[#8B0000] text-[#8B0000] hover:bg-[#8B0000]/5"}`}
                          variant={activeFilter === f ? "default" : "outline"}
                        >
                          {labels[i]}
                        </Button>
                      );
                    })}
                    <Button
                      size="sm"
                      onClick={() => { setShowMonthPicker(v => !v); setShowCustomRange(false); }}
                      className={`h-7 text-xs px-3 rounded ${showMonthPicker || activeFilter === 'selectMonth' ? "bg-[#8B0000] text-white hover:bg-[#8B0000]/90" : "bg-white border border-[#8B0000] text-[#8B0000] hover:bg-[#8B0000]/5"}`}
                      variant={showMonthPicker || activeFilter === 'selectMonth' ? "default" : "outline"}
                    >
                      Select Month ›
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => { setShowCustomRange(v => !v); setShowMonthPicker(false); }}
                      className={`h-7 text-xs px-3 rounded ${showCustomRange || activeFilter === 'customRange' ? "bg-[#8B0000] text-white hover:bg-[#8B0000]/90" : "bg-white border border-[#8B0000] text-[#8B0000] hover:bg-[#8B0000]/5"}`}
                      variant={showCustomRange || activeFilter === 'customRange' ? "default" : "outline"}
                    >
                      Custom Range ›
                    </Button>
                  </div>

                  {showMonthPicker && (
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={selectMonthValue.month}
                        onChange={(e) => setSelectMonthValue(prev => ({ ...prev, month: Number(e.target.value) }))}
                        className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-700 focus:outline-none focus:border-[#8B0000]"
                      >
                        {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                          <option key={m} value={i}>{m}</option>
                        ))}
                      </select>
                      <select
                        value={selectMonthValue.year}
                        onChange={(e) => setSelectMonthValue(prev => ({ ...prev, year: Number(e.target.value) }))}
                        className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-700 focus:outline-none focus:border-[#8B0000]"
                      >
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        onClick={() => {
                          const label = format(new Date(selectMonthValue.year, selectMonthValue.month, 1), 'MMMM yyyy');
                          setActiveFilter('selectMonth');
                          setFilterLabel(label);
                          setShowMonthPicker(false);
                          setShowAdvancedFilters(false);
                        }}
                        className="h-7 text-xs px-3 rounded bg-[#8B0000] text-white hover:bg-[#8B0000]/90"
                      >
                        Apply
                      </Button>
                    </div>
                  )}

                  {showCustomRange && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-gray-500">From</span>
                      <input
                        type="date"
                        value={customRangeStart}
                        onChange={(e) => setCustomRangeStart(e.target.value)}
                        className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-700 focus:outline-none focus:border-[#8B0000]"
                      />
                      <span className="text-xs text-gray-400">→</span>
                      <span className="text-xs text-gray-500">To</span>
                      <input
                        type="date"
                        value={customRangeEnd}
                        onChange={(e) => setCustomRangeEnd(e.target.value)}
                        className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-700 focus:outline-none focus:border-[#8B0000]"
                      />
                      <Button
                        size="sm"
                        disabled={!customRangeStart || !customRangeEnd}
                        onClick={() => {
                          if (customRangeStart && customRangeEnd) {
                            const label = `${format(new Date(customRangeStart + 'T12:00:00'), 'MMM d')} – ${format(new Date(customRangeEnd + 'T12:00:00'), 'MMM d, yyyy')}`;
                            setActiveFilter('customRange');
                            setFilterLabel(label);
                            setShowCustomRange(false);
                            setShowAdvancedFilters(false);
                          }
                        }}
                        className="h-7 text-xs px-3 rounded bg-[#8B0000] text-white hover:bg-[#8B0000]/90 disabled:opacity-50"
                      >
                        Apply
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="text-[#8B1A1A] font-bold text-xs pt-1 leading-5">
                Showing feedback for: <span className="ml-1">{showingLabel}</span>
              </div>
            </div>

            {/* Feedback Cards */}
            {filteredFeedback.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                No feedback found
              </div>
            ) : (
              <div className="space-y-3">
                {filteredFeedback.map((fb) => (
                  <Card key={fb._id} className="border-none shadow-sm rounded-lg overflow-hidden">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Row 1: Customer Name (bold, left) + Status badge (right) */}
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-bold text-sm text-[#3D2B1F] capitalize flex-1">{fb.name}</p>
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest whitespace-nowrap flex-shrink-0 ${fb.status === 'contacted' ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#fee2e2] text-[#991b1b]'}`}>
                            {fb.status === 'contacted' ? 'CONTACTED' : 'PENDING'}
                          </span>
                        </div>

                        {/* Row 2: Full phone number with call icon */}
                        <div className="flex items-center gap-2">
                          <a
                            href={`tel:${fb.phone}`}
                            className="w-8 h-8 rounded-full bg-[#8B1A1A]/10 flex items-center justify-center text-[#8B1A1A] hover:bg-[#8B1A1A]/20 transition-colors flex-shrink-0"
                            title={`Call ${fb.name}`}
                            data-testid={`button-call-${fb._id}`}
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                          <a
                            href={`tel:${fb.phone}`}
                            className="text-xs text-gray-600 font-medium hover:text-[#8B1A1A] transition-colors"
                            data-testid={`text-phone-${fb._id}`}
                          >
                            {fb.phone}
                          </a>
                        </div>

                        {/* Row 3: Visit badge + visit number (left) + Date & Time (right) */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-col gap-0.5 flex-shrink-0">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${fb.visitType === 'dine_in' ? 'bg-[#dbeafe] text-[#1e40af]' : 'bg-[#ede9fe] text-[#5b21b6]'}`}>
                              {fb.visitType === 'dine_in' ? 'Dine In' : 'Take Out'}
                            </span>
                            {fb.visitNumber && (
                              <span className="text-[11px] text-gray-400 font-medium">{toOrdinal(fb.visitNumber)} Visit</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 font-medium text-right">{fb.visitDate} {fb.visitTime}</p>
                        </div>

                        {/* Row 4: Note section */}
                        <p className="text-xs text-gray-600 font-medium"><span className="text-gray-500">Note:</span> {fb.comments || '-'}</p>

                        {/* Row 5: Rating + Stars (left) + Eye button (right) */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <div className="flex items-center gap-1.5">
                            <span className="text-base font-bold text-[#3D2B1F]">
                              {isNaN(Number(getAverageRating(fb.ratings))) ? "N/A" : getAverageRating(fb.ratings)}
                            </span>
                            {!isNaN(Number(getAverageRating(fb.ratings))) && (
                              <RatingStars rating={Number(getAverageRating(fb.ratings))} size="xs" />
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 w-9 px-0 flex items-center justify-center flex-shrink-0 border-[#8B1A1A] text-[#8B1A1A] hover:bg-[#8B1A1A]/5"
                            onClick={() => {
                              setSelectedFeedback(fb);
                              setIsDetailsOpen(true);
                            }}
                            data-testid={`button-view-details-${fb._id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Row 6: Mark Contacted — full width, own row to guarantee text fits */}
                        {fb.status !== 'contacted' && (
                          <Button
                            className="w-full bg-[#8B1A1A] text-white hover:bg-[#8B1A1A]/90 font-medium text-xs h-8"
                            onClick={() => handleContactCustomer(fb)}
                            data-testid={`button-contact-mark-${fb._id}`}
                          >
                            Mark Contacted
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Feedback Details Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-sm bg-[#FDF8F6] border-none overflow-hidden p-0 rounded-2xl flex flex-col max-h-[90vh] [&>button]:hidden">
          {selectedFeedback && (
            <>
              {/* Header - Dark Red Background */}
              <div className="bg-[#8B0000] p-4 text-white relative">
                <div className="pr-12">
                  <h2 className="text-xl font-bold">Feedback Details</h2>
                  <p className="text-sm text-white/80 mt-1">
                    Submitted on {format(new Date(selectedFeedback.createdAt), 'MMMM d, yyyy h:mm a')}
                  </p>
                </div>
                <DialogClose className="absolute top-4 right-4 z-50 p-1 text-white hover:bg-white/20 rounded transition" data-testid="button-close-details">
                  <X className="w-6 h-6" />
                </DialogClose>
              </div>

              {/* Scrollable Content - starts from top */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-28">
                {/* Section 1: Customer Info */}
                <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Customer Name</label>
                    <p className="text-base font-bold text-[#3D2B1F] capitalize">{selectedFeedback.name}</p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Phone Number</label>
                    <a 
                      href={`tel:${selectedFeedback.phone}`}
                      className="flex items-center gap-2 text-base font-bold text-[#8B1A1A] hover:text-[#8B1A1A]/80 transition"
                      data-testid={`button-call-phone-${selectedFeedback._id}`}
                    >
                      <PhoneCall className="w-4 h-4 flex-shrink-0" />
                      {selectedFeedback.phone}
                    </a>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Location & Visit Type</label>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-[#3D2B1F]">{selectedFeedback.location || "Bomb Rolls and Bowls"}</span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${selectedFeedback.visitType === 'dine_in' ? 'bg-[#dbeafe] text-[#1e40af]' : 'bg-[#ede9fe] text-[#5b21b6]'}`}>
                        {selectedFeedback.visitType === 'dine_in' ? 'Dine In' : 'Take Out'}
                      </span>
                    </div>
                  </div>
                  {selectedFeedback.location === "Kalyan" && selectedFeedback.locationDetail && (
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Kalyan Location</label>
                      <p className="text-sm font-medium text-[#3D2B1F]">{selectedFeedback.locationDetail}</p>
                    </div>
                  )}
                </div>

                {/* Section 2: Detailed Ratings */}
                <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Detailed Ratings</label>
                  
                  <div className="space-y-2">
                    {Object.entries(selectedFeedback.ratings).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2 py-1">
                        <span className="text-xs font-medium text-gray-600 capitalize flex-shrink-0 w-20">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <div className="flex-1 flex items-center justify-center">
                          <RatingStars rating={value} size="xs" />
                        </div>
                        <span className={`text-sm font-bold flex-shrink-0 w-6 text-right ${value <= 2 ? 'text-red-500' : 'text-[#3D2B1F]'}`}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-gray-200 pt-3 mt-3 flex items-center justify-between">
                    <span className="font-bold text-sm text-[#3D2B1F]">Overall Avg</span>
                    <div className="flex items-center gap-2">
                      <RatingStars rating={Number(getAverageRating(selectedFeedback.ratings))} size="xs" />
                      <span className="text-lg font-bold text-[#8B1A1A]">{getAverageRating(selectedFeedback.ratings)}</span>
                    </div>
                  </div>
                </div>

                {/* Section 3: Comments */}
                <div className="bg-white rounded-lg shadow-sm p-4 space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Comments</label>
                  <p className={`text-sm ${selectedFeedback.comments ? 'text-[#333333]' : 'text-gray-400 italic'}`}>
                    {selectedFeedback.comments || "No comments provided"}
                  </p>
                </div>

                {/* Customer Note (if exists) */}
                {selectedFeedback.note && (
                  <div className="bg-white rounded-lg shadow-sm p-4 space-y-2 border-l-4 border-[#F5A623]">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Customer Note</label>
                    <p className="text-sm text-gray-600 italic">"{selectedFeedback.note}"</p>
                  </div>
                )}
              </div>

              {/* Sticky Footer */}
              <div className="bg-white border-t border-gray-200 p-4 flex items-center justify-between gap-3 flex-shrink-0 min-h-[60px]">
                <span className={`px-3 py-2 rounded-full text-xs font-bold uppercase tracking-widest whitespace-nowrap flex-shrink-0 ${selectedFeedback.status === 'contacted' ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#fee2e2] text-[#991b1b]'}`}>
                  {selectedFeedback.status === 'contacted' ? 'Contacted' : 'Pending'}
                </span>
                {selectedFeedback.status !== 'contacted' && (
                  <Button 
                    onClick={() => handleContactCustomer(selectedFeedback)}
                    className="bg-[#8B1A1A] text-white hover:bg-[#8B1A1A]/90 text-sm h-11 flex-1"
                    data-testid={`button-mark-contacted-modal-${selectedFeedback._id}`}
                  >
                    Mark as Contacted
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Mobile Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-30">
        <div className="flex">
          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex-1 py-3 flex flex-col items-center justify-center gap-1.5 transition ${
              activeTab === "analytics"
                ? "bg-[#8B1A1A]/5 text-[#8B1A1A]"
                : "text-gray-500 hover:bg-gray-50"
            }`}
            data-testid="tab-analytics-mobile"
          >
            <BarChart3 className="w-6 h-6" />
            <span className="text-sm font-medium">Overview</span>
          </button>
          <button
            onClick={() => setActiveTab("feedback")}
            className={`flex-1 py-3 flex flex-col items-center justify-center gap-1.5 transition ${
              activeTab === "feedback"
                ? "bg-[#8B1A1A]/5 text-[#8B1A1A]"
                : "text-gray-500 hover:bg-gray-50"
            }`}
            data-testid="tab-feedback-mobile"
          >
            <MessageSquare className="w-6 h-6" />
            <span className="text-sm font-medium">Feedback</span>
          </button>
        </div>
      </div>
    </div>
  );
}
