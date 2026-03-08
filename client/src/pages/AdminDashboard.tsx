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
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import type { Feedback, Analytics } from "@shared/schema";

const CHART_COLORS = ["#8B1A1A", "#f5a623", "#22a34a", "#b4635d", "#f4d3d1"];

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
    const sum = 
      ratings.foodTaste + 
      ratings.foodTemperature + 
      ratings.portionSize + 
      ratings.valueForMoney + 
      ratings.presentation + 
      ratings.overallService;
    return (sum / 6).toFixed(1);
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
        <aside className="w-[260px] bg-[#8B1A1A] flex flex-col fixed h-full z-50">
          <div className="p-6">
            <h1 className="text-white font-bold text-2xl">Admin Panel</h1>
          </div>

          <nav className="flex-1 px-4 space-y-2 mt-4">
            <TabsList className="flex flex-col w-full bg-transparent h-auto p-0 space-y-2">
              <TabsTrigger
                value="analytics"
                className="w-full justify-start px-4 py-3 text-white data-[state=active]:bg-[#A52020] data-[state=active]:text-white hover:bg-[#A52020]/50 transition-colors border-none shadow-none"
                data-testid="tab-analytics"
              >
                <BarChart3 className="w-5 h-5 mr-3" />
                <span className="font-medium">Overview</span>
              </TabsTrigger>
              <TabsTrigger
                value="feedback"
                className="w-full justify-start px-4 py-3 text-white data-[state=active]:bg-[#A52020] data-[state=active]:text-white hover:bg-[#A52020]/50 transition-colors border-none shadow-none"
                data-testid="tab-feedback"
              >
                <MessageSquare className="w-5 h-5 mr-3" />
                <span className="font-medium">Feedback</span>
              </TabsTrigger>
            </TabsList>
          </nav>

          <div className="p-4 mt-auto border-t border-white/10">
            <div className="flex items-center gap-3 px-2 py-3">
              <div className="w-10 h-10 rounded-full bg-pink-200 flex items-center justify-center text-[#8B1A1A] font-bold">
                A
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-white font-medium truncate">admin</p>
                <p className="text-pink-100/70 text-xs">Admin</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-white hover:bg-white/10 mt-2 px-2"
              onClick={() => logoutMutation.mutate()}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Sign Out
            </Button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 ml-[260px] min-h-screen">
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
                  <Card key={i} className="border-none shadow-sm rounded-[12px]">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-[11px] font-bold text-gray-400 tracking-wider">{stat.title}</span>
                        <div className={`p-2 rounded-full ${stat.color}`}>
                          <stat.icon className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-[#3D2B1F] mb-1">{stat.value}</div>
                      <div className="text-xs text-gray-400">{stat.sub}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="border-none shadow-sm rounded-[12px]">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-[#3D2B1F]">Weekly Rating Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analytics?.weeklyTrends || []}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} dy={10} />
                          <YAxis domain={[0, 5]} axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} dx={-10} />
                          <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                          <Legend iconType="circle" />
                          <Line type="monotone" dataKey="foodTaste" stroke={CHART_COLORS[0]} strokeWidth={3} dot={false} />
                          <Line type="monotone" dataKey="foodTemperature" stroke={CHART_COLORS[1]} strokeWidth={3} dot={false} />
                          <Line type="monotone" dataKey="portionSize" stroke={CHART_COLORS[2]} strokeWidth={3} dot={false} />
                          <Line type="monotone" dataKey="valueForMoney" stroke={CHART_COLORS[3]} strokeWidth={3} dot={false} />
                          <Line type="monotone" dataKey="presentation" stroke={CHART_COLORS[4]} strokeWidth={3} dot={false} />
                          <Line type="monotone" dataKey="overallService" stroke="#f8c216" strokeWidth={3} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* STEP 4: Redesign Category Performance Chart */}
                <Card className="border-none shadow-sm rounded-[12px]">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-[#3D2B1F]">Category Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={analytics?.categoryPerformance || []}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F0F0F0" />
                          <XAxis type="number" domain={[0, 5]} axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} dy={10} />
                          <YAxis type="category" dataKey="category" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 10}} width={120} />
                          <Tooltip 
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
                        <Tooltip />
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

              {/* STEP 6: Redesign Feedback Table */}
              <Card className="border-none shadow-sm rounded-[12px] overflow-hidden">
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
                          <TableCell className="py-4">
                            <div className="flex items-center gap-3">
                              <div>
                                <p className="font-bold text-[#3D2B1F]">{fb.name}</p>
                                <p className="text-xs text-gray-500">{fb.phone}</p>
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
                          <TableCell className="py-4">
                            <div className="text-xs text-gray-600 space-y-0.5">
                              <p className="font-medium text-[#3D2B1F]">{fb.location}</p>
                              <p className="capitalize">{(fb.visitType || "").replace('_', ' ')}</p>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex flex-col gap-1">
                              <div className="text-sm font-bold text-[#3D2B1F]">
                                {isNaN(Number(getAverageRating(fb.ratings))) ? "N/A" : getAverageRating(fb.ratings)}
                              </div>
                              {!isNaN(Number(getAverageRating(fb.ratings))) && (
                                <div className="flex gap-0.5">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`w-3 h-3 ${
                                        star <= Math.round(Number(getAverageRating(fb.ratings))) ? "fill-amber-400 text-amber-400" : "text-gray-200"
                                      }`}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-4 max-w-[200px]">
                            <p className="text-xs text-gray-500 line-clamp-2 italic">
                              {fb.note ? `"${fb.note}"` : "-"}
                            </p>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="text-xs text-gray-500 whitespace-nowrap">
                              <div className="font-medium text-[#3D2B1F] mb-0.5">{fb.visitDate}</div>
                              <div>{fb.visitTime}</div>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            {fb.status === "contacted" ? (
                              <span className="text-xs font-bold text-green-600 uppercase tracking-tighter">CONTACTED</span>
                            ) : (
                              <span className="text-xs font-bold text-[#8B1A1A] uppercase tracking-tighter">PENDING</span>
                            )}
                          </TableCell>
                          <TableCell className="py-4">
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
                              <p className="text-lg font-bold text-[#3D2B1F]">{selectedFeedback.phoneNumber}</p>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">LOCATION & OPTION</label>
                              <p className="text-[#3D2B1F]"><span className="font-bold">{selectedFeedback.location}</span> • <span className="capitalize">{(selectedFeedback.diningOption || "").replace('-', ' ')}</span></p>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">VISIT TIME</label>
                              <p className="text-[#3D2B1F]">{selectedFeedback.visitDate} at {selectedFeedback.visitTime}</p>
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
