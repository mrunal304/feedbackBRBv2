import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Star,
  TrendingUp,
  Phone,
  Calendar as CalendarIcon,
  MessageSquare,
  BarChart3,
  ChevronDown,
  Eye,
  LogOut,
  Search,
  X,
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartTooltip,
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
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [period] = useState<"week" | "lastWeek" | "month">("week");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter] = useState<"all" | "contacted" | "pending">("all");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const { data: authCheck, isLoading: authLoading } = useQuery({
    queryKey: ["/api/auth/check"],
  });

  useEffect(() => {
    if (!authLoading && !(authCheck as any)?.authenticated) {
      navigate("/login");
    }
  }, [authCheck, authLoading, navigate]);

  const feedbackUrl = `/api/feedback?startDate=${selectedDate}&endDate=${selectedDate}&status=${statusFilter}`;
  const { data: feedback = [], refetch: refetchFeedback } = useQuery<Feedback[]>({
    queryKey: [feedbackUrl],
    enabled: !!(authCheck as any)?.authenticated,
    refetchInterval: 15000,
  });

  const analyticsUrl = `/api/analytics?period=${period}`;
  const { data: analytics } = useQuery<Analytics>({
    queryKey: [analyticsUrl],
    enabled: !!(authCheck as any)?.authenticated,
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
    onSuccess: () => {
      toast({
        title: "Customer Contacted",
        description: "The customer has been marked as contacted",
      });
      refetchFeedback();
      if (selectedFeedback) {
        setSelectedFeedback({ ...selectedFeedback, contactedAt: new Date().toISOString() });
      }
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

  const handleDateChange = (date: Date) => {
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const setToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const setYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setSelectedDate(yesterday.toISOString().split('T')[0]);
  };

  if (authLoading || !(authCheck as any)?.authenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-[#FDF8F6]">
      <Tabs defaultValue="analytics" className="flex w-full">
        {/* STEP 1: Left Sidebar */}
        <aside className="w-[220px] bg-[#8B1A1A] flex flex-col fixed h-full z-50">
          <div className="px-4 pt-4">
            <h1 className="text-white font-bold text-[19px]">Admin Panel</h1>
          </div>

          <nav className="flex-1 px-0 space-y-0 mt-2">
            <TabsList className="flex flex-col w-full bg-transparent h-auto p-0 space-y-0">
              <TabsTrigger
                value="analytics"
                className="w-full justify-start px-4 py-2.5 text-white data-[state=active]:bg-[#A52020] data-[state=active]:text-white data-[state=active]:rounded-lg hover:bg-[#A52020]/50 transition-colors border-none shadow-none rounded-none mx-2"
                data-testid="tab-analytics"
              >
                <BarChart3 className="w-4 h-4 mr-3 flex-shrink-0" />
                <span className="!text-[17px] !font-medium">Overview</span>
              </TabsTrigger>
              <TabsTrigger
                value="feedback"
                className="w-full justify-start px-4 py-2.5 text-white data-[state=active]:bg-[#A52020] data-[state=active]:text-white data-[state=active]:rounded-lg hover:bg-[#A52020]/50 transition-colors border-none shadow-none rounded-none mx-2"
                data-testid="tab-feedback"
              >
                <MessageSquare className="w-4 h-4 mr-3 flex-shrink-0" />
                <span className="!text-[17px] !font-medium">Feedback</span>
              </TabsTrigger>
            </TabsList>
          </nav>

          <div className="px-4 py-4 mt-auto border-t border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-pink-200 flex items-center justify-center text-[#8B1A1A] font-bold flex-shrink-0">
                A
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-[13px] truncate">admin</p>
                <p className="text-pink-100/70 text-[11px]">Admin</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-white hover:bg-white/10 py-2 h-auto text-[19px]"
              style={{
                width: '100%',
                paddingLeft: '16px',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                overflow: 'visible'
              }}
              onClick={() => logoutMutation.mutate()}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              <span className="text-white font-bold text-[19px]">Sign Out</span>
            </Button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 ml-[220px] min-h-screen">
          <div className="p-8 max-w-7xl mx-auto space-y-8">
            <TabsContent value="analytics" className="mt-0 space-y-8 focus-visible:outline-none">
              {/* STEP 2: Overview Page Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-[#3D2B1F]">Dashboard Overview</h2>
                  <p className="text-gray-500 mt-1">Welcome back, here's what's happening today.</p>
                </div>
                <Button variant="outline" className="border-[#8B1A1A] text-[#8B1A1A] hover:bg-[#8B1A1A]/5">
                  Last 7 Days
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </div>

              {/* STEP 3: Redesigned 4 Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { title: "TOTAL FEEDBACK", value: analytics?.totalFeedback || 0, icon: MessageSquare, sub: "Responses received", color: "bg-blue-50 text-blue-600" },
                  { title: "AVERAGE RATING", value: `${analytics?.averageRating || 0}/5`, icon: Star, sub: "Overall satisfaction", color: "bg-yellow-50 text-yellow-600" },
                  { title: "TOP CATEGORY", value: analytics?.topCategory || "-", icon: TrendingUp, sub: "Highest rated", color: "bg-green-50 text-green-600" },
                  { title: "RESPONSE RATE", value: `${analytics?.responseRate || 0}%`, icon: Phone, sub: "Customers contacted", color: "bg-purple-50 text-purple-600" }
                ].map((stat, i) => (
                  <Card key={i} className="border-none shadow-sm rounded-[12px] overflow-hidden">
                    <CardContent className="p-4 space-y-3">
                      <span className="text-[11px] font-semibold text-gray-500 tracking-widest uppercase block">{stat.title}</span>
                      <div className={`w-10 h-10 p-2 rounded-full flex-shrink-0 ${stat.color} flex items-center justify-center`}>
                        <stat.icon className="w-5 h-5" />
                      </div>
                      <div className="text-[24px] font-bold text-[#3D2B1F]">{stat.value}</div>
                      <div className="text-[13px] text-gray-500 font-medium">{stat.sub}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="border-none shadow-sm rounded-[12px]">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-[#3D2B1F]">Weekly Rating Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(analytics?.weeklyTrends || []).length === 0 ? (
                      <div className="h-[250px] md:h-[350px] flex items-center justify-center text-gray-400">
                        <p>No data available for this week</p>
                      </div>
                    ) : (
                      <div className="w-full h-[250px] md:h-[350px] overflow-x-auto">
                        <ResponsiveContainer width="100%" height="100%" minWidth={300}>
                          <LineChart data={analytics?.weeklyTrends || []}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                            <XAxis 
                              dataKey="date" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{fill: '#9CA3AF', fontSize: window.innerWidth < 768 ? 13 : 14}} 
                              dy={10}
                              tickFormatter={(date, index) => {
                                return parseChartDate(date, index);
                              }}
                            />
                            <YAxis 
                              domain={[0, 5]} 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{fill: '#9CA3AF', fontSize: window.innerWidth < 768 ? 13 : 14}} 
                              dx={-10} 
                            />
                            <RechartTooltip content={<CustomTooltip />} />
                            <Legend 
                              iconType="circle" 
                              wrapperStyle={{fontSize: window.innerWidth < 768 ? '13px' : '14px'}}
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

                {/* STEP 4: Redesign Category Performance Chart */}
                <Card className="border-none shadow-sm rounded-[12px]">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-[#3D2B1F]">Category Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(analytics?.categoryPerformance || []).length === 0 ? (
                      <div className="h-[250px] md:h-[350px] flex items-center justify-center text-gray-400">
                        <p>No data available</p>
                      </div>
                    ) : (
                      <div className="w-full h-[250px] md:h-[350px] overflow-x-auto">
                        <ResponsiveContainer width="100%" height="100%" minWidth={300}>
                          <BarChart layout="vertical" data={analytics?.categoryPerformance || []}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F0F0F0" />
                            <XAxis type="number" domain={[0, 5]} axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: window.innerWidth < 768 ? 10 : 12}} dy={10} />
                            <YAxis type="category" dataKey="category" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 13, fontWeight: 500}} width={window.innerWidth < 768 ? 140 : 150} />
                            <RechartTooltip 
                              cursor={{fill: '#F9FAFB'}}
                              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
                            />
                            <Bar dataKey="average" radius={[0, 4, 4, 0]} barSize={30}>
                              {(analytics?.categoryPerformance || []).map((entry: any, index: number) => {
                                let color = "#cc2200"; // Default red
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
              </div>

              <Card className="border-none shadow-sm rounded-[12px]">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-[#3D2B1F]">Feedback Volume</CardTitle>
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
                        <RechartTooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="feedback" className="mt-0 space-y-6 focus-visible:outline-none">
              {/* STEP 5: Feedback Page Header + Date Filter Bar */}
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-[#3D2B1F]">Customer Feedback</h2>
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search name or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 border-none shadow-sm bg-white rounded-lg"
                    data-testid="input-search"
                  />
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-bold text-gray-400 tracking-tighter uppercase">FILTER BY DATE:</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-sm text-gray-600 bg-gray-50/50">
                        <CalendarIcon className="w-4 h-4 text-gray-400" />
                        {format(new Date(selectedDate), 'MMM d, yyyy')}
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={new Date(selectedDate)}
                        onSelect={(date) => date && handleDateChange(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={setToday}
                      className={selectedDate === new Date().toISOString().split('T')[0] ? "bg-[#8B1A1A] text-white hover:bg-[#8B1A1A]/90 px-4" : "border-[#8B1A1A] text-[#8B1A1A] hover:bg-[#8B1A1A]/5 px-4"}
                      variant={selectedDate === new Date().toISOString().split('T')[0] ? "default" : "outline"}
                    >
                      Today
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={setYesterday}
                      className={selectedDate === new Date(Date.now() - 86400000).toISOString().split('T')[0] ? "bg-[#8B1A1A] text-white hover:bg-[#8B1A1A]/90 px-4" : "border-[#8B1A1A] text-[#8B1A1A] hover:bg-[#8B1A1A]/5 px-4"}
                      variant={selectedDate === new Date(Date.now() - 86400000).toISOString().split('T')[0] ? "default" : "outline"}
                    >
                      Yesterday
                    </Button>
                  </div>
                </div>
                <div className="text-[#8B1A1A] font-bold text-sm">
                  Showing feedback for: <span className="ml-1">{format(new Date(selectedDate), 'MMMM d, yyyy')}</span>
                </div>
              </div>

              {/* STEP 6: Redesign Feedback Table - Responsive Desktop Table */}
              <Card className="border-none shadow-sm rounded-[12px] overflow-hidden hidden md:block">
                <Table>
                  <TableHeader className="bg-gray-50/50">
                    <TableRow>
                      <TableHead className="text-[11px] font-bold text-[#3D2B1F] uppercase tracking-wider py-4">Customer</TableHead>
                      <TableHead className="text-[11px] font-bold text-[#3D2B1F] uppercase tracking-wider py-4">Visit Info</TableHead>
                      <TableHead className="text-[11px] font-bold text-[#3D2B1F] uppercase tracking-wider py-4">Ratings</TableHead>
                      <TableHead className="text-[11px] font-bold text-[#3D2B1F] uppercase tracking-wider py-4">Note</TableHead>
                      <TableHead className="text-[11px] font-bold text-[#3D2B1F] uppercase tracking-wider py-4">Date</TableHead>
                      <TableHead className="text-[11px] font-bold text-[#3D2B1F] uppercase tracking-wider py-4">Status</TableHead>
                      <TableHead className="text-[11px] font-bold text-[#3D2B1F] uppercase tracking-wider py-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFeedback.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                          No feedback found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredFeedback.map((fb) => (
                        <TableRow key={fb._id} className="border-b border-gray-100 hover:bg-gray-50/30 transition-colors">
                          <TableCell className="py-2.5">
                            <div className="flex items-center gap-3">
                              <div>
                                <p className="font-bold text-sm text-[#3D2B1F]">{fb.name}</p>
                                <p className="text-sm text-gray-500">{fb.phone}</p>
                              </div>
                              <a
                                href={`tel:${fb.phone}`}
                                className="w-8 h-8 rounded-full bg-[#fdf0f0] flex items-center justify-center text-[#8B1A1A] hover:bg-[#8B1A1A] hover:text-white transition-colors shadow-sm"
                                title={`Call ${fb.name}`}
                                data-testid={`button-call-${fb._id}`}
                              >
                                <Phone className="w-4 h-4" />
                              </a>
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5">
                            <div className="text-sm text-gray-600 space-y-0.5">
                              <p className="font-medium text-[#3D2B1F]">{fb.location}</p>
                              <p className="capitalize">{(fb.visitType || "").replace('_', ' ')}</p>
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5">
                            <div className="flex flex-col gap-1.5">
                              <div className="text-base font-bold text-[#3D2B1F]">
                                {isNaN(Number(getAverageRating(fb.ratings))) ? "N/A" : getAverageRating(fb.ratings)}
                              </div>
                              {!isNaN(Number(getAverageRating(fb.ratings))) && (
                                <div className="flex gap-0.5">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`w-2.5 h-2.5 ${
                                        star <= Math.round(Number(getAverageRating(fb.ratings))) ? "fill-amber-400 text-amber-400" : "text-gray-200"
                                      }`}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5 max-w-[200px]">
                            {fb.comments ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <p className="text-sm text-gray-500 italic cursor-help line-clamp-1">
                                      "{fb.comments.length > 20 ? fb.comments.substring(0, 20) + "..." : fb.comments}"
                                    </p>
                                  </TooltipTrigger>
                                  <TooltipContent side="left" className="max-w-xs">
                                    <p className="text-sm">{fb.comments}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <p className="text-sm text-gray-500 italic">-</p>
                            )}
                          </TableCell>
                          <TableCell className="py-2.5">
                            <div className="text-sm text-gray-500 whitespace-nowrap">
                              <div className="font-medium text-[#3D2B1F] mb-0.5">{fb.visitDate}</div>
                              <div>{fb.visitTime}</div>
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5">
                            {fb.status === "contacted" ? (
                              <span className="text-sm font-bold text-green-600 uppercase tracking-tighter">CONTACTED</span>
                            ) : (
                              <span className="text-sm font-bold text-[#8B1A1A] uppercase tracking-tighter">PENDING</span>
                            )}
                          </TableCell>
                          <TableCell className="py-2.5">
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 border-[#8B1A1A] text-[#8B1A1A] hover:bg-[#8B1A1A]/5 px-3"
                                onClick={() => {
                                  setSelectedFeedback(fb);
                                  setIsDetailsOpen(true);
                                }}
                                data-testid={`button-view-details-${fb._id}`}
                              >
                                <Eye className="w-3.5 h-3.5 mr-1.5" />
                                View Details
                              </Button>
                              {!fb.contactedAt && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 border-gray-200 text-gray-400 hover:bg-gray-50 px-3"
                                  onClick={() => handleContactCustomer(fb)}
                                  data-testid={`button-contact-mark-${fb._id}`}
                                >
                                  Mark Contacted
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>

              {/* Mobile Card Layout */}
              <div className="md:hidden space-y-4">
                {filteredFeedback.length === 0 ? (
                  <Card className="border-none shadow-sm rounded-[12px] p-8 text-center">
                    <p className="text-gray-400">No feedback found</p>
                  </Card>
                ) : (
                  filteredFeedback.map((fb) => (
                    <Card key={fb._id} className="border-none shadow-sm rounded-[12px] overflow-hidden bg-white">
                      {/* Header with name, phone, status */}
                      <div className="bg-[#8B1A1A] px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-white text-sm">{fb.name}</p>
                            <a
                              href={`tel:${fb.phone}`}
                              className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors flex-shrink-0"
                              title={`Call ${fb.name}`}
                              data-testid={`button-call-${fb._id}`}
                            >
                              <Phone className="w-3 h-3" />
                            </a>
                          </div>
                          <div className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest ${fb.status === "contacted" ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {fb.status === "contacted" ? 'CONTACTED' : 'PENDING'}
                          </div>
                        </div>
                        <p className="text-sm text-white/80">{fb.phone}</p>
                      </div>
                      
                      {/* Content */}
                      <div className="p-4 space-y-2">
                        {/* Visit Type and Rating and Date on same line */}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 capitalize font-medium">{(fb.visitType || "").replace('_', ' ')}</span>
                          <div className="flex items-center gap-1">
                            {!isNaN(Number(getAverageRating(fb.ratings))) && (
                              <>
                                <div className="flex gap-0.5">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`w-2.5 h-2.5 ${
                                        star <= Math.round(Number(getAverageRating(fb.ratings))) ? "fill-amber-400 text-amber-400" : "text-gray-200"
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="font-bold text-base text-[#3D2B1F] ml-1">{getAverageRating(fb.ratings)}</span>
                              </>
                            )}
                          </div>
                          <span className="text-gray-500 font-medium">{fb.visitDate}</span>
                        </div>

                        {/* Comments */}
                        {fb.comments && (
                          <div className="bg-gray-50 p-2 rounded text-sm text-gray-600 italic line-clamp-2">
                            "{fb.comments}"
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="pt-2 grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            className="bg-[#8B1A1A] text-white hover:bg-[#8B1A1A]/90 h-8 text-sm"
                            onClick={() => {
                              setSelectedFeedback(fb);
                              setIsDetailsOpen(true);
                            }}
                            data-testid={`button-view-details-${fb._id}`}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View Details
                          </Button>
                          {!fb.contactedAt && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-[#8B1A1A] text-[#8B1A1A] hover:bg-[#8B1A1A]/5 h-8 text-sm"
                              onClick={() => handleContactCustomer(fb)}
                              data-testid={`button-contact-mark-${fb._id}`}
                            >
                              Mark Contacted
                            </Button>
                          )}
                          {fb.contactedAt && (
                            <div className="col-span-2 text-center text-sm text-green-600 font-medium">
                              ✓ Contacted
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>

              {/* Feedback Details Modal */}
              <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="max-w-2xl bg-[#FDF8F6] border-none overflow-hidden p-0 rounded-2xl">
                  {selectedFeedback && (
                    <>
                      <div className="bg-[#8B1A1A] p-6 text-white relative">
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-bold flex items-center justify-between">
                            Feedback Details
                          </DialogTitle>
                          <DialogDescription className="text-white/70">
                            Submitted on {format(new Date(selectedFeedback.createdAt), 'MMMM d, yyyy h:mm a')}
                          </DialogDescription>
                        </DialogHeader>
                      </div>

                      <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                        <div className="grid grid-cols-2 gap-8">
                          <div className="space-y-4">
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">CUSTOMER NAME</label>
                              <p className="text-lg font-bold text-[#3D2B1F]">{selectedFeedback.name}</p>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">PHONE NUMBER</label>
                              <p className="text-lg font-bold text-[#3D2B1F]">{selectedFeedback.phone}</p>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">LOCATION & OPTION</label>
                              <p className="text-[#3D2B1F]"><span className="font-bold">{selectedFeedback.location || "Bomb Rolls and Bowls"}</span> • <span className="capitalize">{selectedFeedback.visitType === 'dine_in' ? 'Dine In' : 'Take Out'}</span></p>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">VISIT TIME</label>
                              <p className="text-[#3D2B1F]">{new Date(selectedFeedback.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">DETAILED RATINGS</label>
                          <div className="grid grid-cols-2 gap-4">
                            {Object.entries(selectedFeedback.ratings).map(([key, value]) => (
                              <div key={key} className="bg-white p-3 rounded-xl shadow-sm flex items-center justify-between">
                                <span className="text-xs font-medium text-gray-600 capitalize">
                                  {key.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                                <div className="flex items-center gap-1">
                                  <span className={`text-sm font-bold ${value <= 2 ? 'text-red-500' : 'text-[#3D2B1F]'}`}>{value}</span>
                                  <Star className={`w-3 h-3 ${value <= 2 ? 'fill-red-500 text-red-500' : 'fill-amber-400 text-amber-400'}`} />
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between border-2 border-[#8B1A1A]/10">
                            <span className="font-bold text-[#3D2B1F]">OVERALL AVERAGE RATING</span>
                            <div className="flex items-center gap-2">
                              <span className="text-2xl font-bold text-[#8B1A1A]">{getAverageRating(selectedFeedback.ratings)}</span>
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`w-4 h-4 ${
                                      star <= Math.round(Number(getAverageRating(selectedFeedback.ratings))) ? "fill-amber-400 text-amber-400" : "text-gray-200"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">COMMENTS</label>
                          <div className="bg-[#FAFAFA] p-4 rounded-xl border border-[#EEEEEE]">
                            <p className="text-sm font-normal text-[#333333]">{selectedFeedback.comments || "No comments provided"}</p>
                          </div>
                        </div>

                        {selectedFeedback.note && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">CUSTOMER NOTE</label>
                            <div className="bg-white p-4 rounded-xl shadow-sm italic text-gray-600 border-l-4 border-[#F5A623]">
                              "{selectedFeedback.note}"
                            </div>
                          </div>
                        )}

                        <div className="pt-4 flex items-center justify-between border-t border-gray-100">
                          <div className="flex items-center gap-3">
                            <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${selectedFeedback.contactedAt ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {selectedFeedback.contactedAt ? 'CONTACTED' : 'PENDING'}
                            </div>
                            {selectedFeedback.contactedAt && (
                              <span className="text-xs text-gray-400 italic">
                                by {selectedFeedback.contactedBy || 'Admin'} on {format(new Date(selectedFeedback.contactedAt), 'MMM d, yyyy')}
                              </span>
                            )}
                          </div>
                          {!selectedFeedback.contactedAt && (
                            <Button 
                              onClick={() => handleContactCustomer(selectedFeedback)}
                              className="bg-[#8B1A1A] text-white hover:bg-[#8B1A1A]/90"
                            >
                              Mark as Contacted
                            </Button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </DialogContent>
              </Dialog>
            </TabsContent>
          </div>
        </main>
      </Tabs>
    </div>
  );
}
