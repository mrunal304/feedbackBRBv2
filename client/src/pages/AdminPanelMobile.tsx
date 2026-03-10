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
  Menu,
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

export default function AdminPanelMobile() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("analytics");
  const [period] = useState<"week" | "lastWeek" | "month">("week");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter] = useState<"all" | "contacted" | "pending">("all");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
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
        <div className="bg-[#8B1A1A] border-b border-white/10 px-4 py-3">
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
          <Button
            variant="ghost"
            className="w-full justify-start text-white hover:bg-white/10 text-[13px] py-2 h-auto"
            style={{
              width: '100%',
              paddingLeft: '16px',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              overflow: 'visible'
            }}
            onClick={() => {
              logoutMutation.mutate();
              setShowMenu(false);
            }}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span className="text-white">Sign Out</span>
          </Button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 px-4 py-4 space-y-4">
        {activeTab === "analytics" && (
          <div className="space-y-4">
            {/* Dashboard Cards - Stacked Vertically */}
            <div className="space-y-3">
              {[
                { title: "TOTAL FEEDBACK", value: analytics?.totalFeedback || 0, icon: MessageSquare, sub: "Responses received", color: "bg-blue-50 text-blue-600" },
                { title: "AVERAGE RATING", value: `${analytics?.averageRating || 0}/5`, icon: Star, sub: "Overall satisfaction", color: "bg-yellow-50 text-yellow-600" },
                { title: "TOP CATEGORY", value: analytics?.topCategory || "-", icon: TrendingUp, sub: "Highest rated", color: "bg-green-50 text-green-600" },
                { title: "RESPONSE RATE", value: `${analytics?.responseRate || 0}%`, icon: Phone, sub: "Customers contacted", color: "bg-purple-50 text-purple-600" }
              ].map((stat, i) => (
                <Card key={i} className="border-none shadow-sm rounded-lg overflow-hidden">
                  <CardContent className="p-3 space-y-2">
                    <span className="text-[11px] font-semibold text-gray-500 tracking-widest uppercase block">{stat.title}</span>
                    <div className={`w-8 h-8 p-1.5 rounded-full flex-shrink-0 ${stat.color} flex items-center justify-center`}>
                      <stat.icon className="w-4 h-4" />
                    </div>
                    <div className="text-[24px] font-bold text-[#3D2B1F]">{stat.value}</div>
                    <div className="text-[11px] text-gray-500">{stat.sub}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts - Full Width */}
            <Card className="border-none shadow-sm rounded-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-[#3D2B1F]">Weekly Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics?.weeklyTrends || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#9CA3AF', fontSize: 10}} 
                        dy={5}
                        tickFormatter={(date) => {
                          try {
                            const d = new Date(date + 'T00:00:00');
                            return d.toLocaleDateString('en-US', { weekday: 'short' });
                          } catch {
                            return date;
                          }
                        }}
                      />
                      <YAxis domain={[0, 5]} axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 10}} dx={-5} width={35} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                      <Line type="monotone" dataKey="foodTaste" stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="foodTemperature" stroke={CHART_COLORS[1]} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="portionSize" stroke={CHART_COLORS[2]} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-[#3D2B1F]">Category Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={analytics?.categoryPerformance || []}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F0F0F0" />
                      <XAxis type="number" domain={[0, 5]} axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 9}} dy={5} />
                      <YAxis type="category" dataKey="category" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 9}} width={80} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                      <Bar dataKey="average" radius={[0, 4, 4, 0]} barSize={20}>
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
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-[#3D2B1F]">Feedback Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Contacted", value: analytics?.feedbackVolume?.contacted || 0 },
                          { name: "Pending", value: analytics?.feedbackVolume?.pending || 0 },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        <Cell fill="#22a34a" />
                        <Cell fill="#8B1A1A" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "feedback" && (
          <div className="space-y-3">
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
              <div className="flex gap-2 text-xs">
                <Button 
                  size="sm" 
                  onClick={setToday}
                  className={selectedDate === new Date().toISOString().split('T')[0] ? "bg-[#8B1A1A] text-white h-7" : "border-[#8B1A1A] text-[#8B1A1A] h-7"}
                  variant={selectedDate === new Date().toISOString().split('T')[0] ? "default" : "outline"}
                >
                  Today
                </Button>
                <Button 
                  size="sm" 
                  onClick={setYesterday}
                  className={selectedDate === new Date(Date.now() - 86400000).toISOString().split('T')[0] ? "bg-[#8B1A1A] text-white h-7" : "border-[#8B1A1A] text-[#8B1A1A] h-7"}
                  variant={selectedDate === new Date(Date.now() - 86400000).toISOString().split('T')[0] ? "default" : "outline"}
                >
                  Yesterday
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-1 px-2 h-7 text-xs border-[#8B1A1A] text-[#8B1A1A]">
                      <CalendarIcon className="w-3 h-3" />
                      {format(new Date(selectedDate), 'MMM d')}
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
              </div>
              <div className="text-[#8B1A1A] font-bold text-xs">
                {format(new Date(selectedDate), 'MMMM d, yyyy')}
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
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-bold text-sm text-[#3D2B1F]">{fb.name}</p>
                            <p className="text-xs text-gray-500">{fb.phone}</p>
                          </div>
                          <div className="text-xs font-bold uppercase tracking-tight">
                            {fb.contactedAt ? (
                              <span className="text-green-600">CONTACTED</span>
                            ) : (
                              <span className="text-[#8B1A1A]">PENDING</span>
                            )}
                          </div>
                        </div>

                        <div className="text-xs text-gray-600">
                          <p className="font-medium">{fb.location || "Bomb Rolls and Bowls"} • <span className="capitalize">{fb.visitType === 'dine_in' ? 'Dine In' : 'Take Out'}</span></p>
                          <p>{fb.visitDate} at {fb.visitTime}</p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-bold text-[#3D2B1F]">
                              {isNaN(Number(getAverageRating(fb.ratings))) ? "N/A" : getAverageRating(fb.ratings)}
                            </span>
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
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-xs border-[#8B1A1A] text-[#8B1A1A]"
                              onClick={() => {
                                setSelectedFeedback(fb);
                                setIsDetailsOpen(true);
                              }}
                              data-testid={`button-view-details-${fb._id}`}
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            {!fb.contactedAt && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-xs border-gray-200 text-gray-400"
                                onClick={() => handleContactCustomer(fb)}
                                data-testid={`button-contact-mark-${fb._id}`}
                              >
                                Mark
                              </Button>
                            )}
                          </div>
                        </div>
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
        <DialogContent className="max-w-sm bg-[#FDF8F6] border-none overflow-hidden p-0 rounded-2xl">
          {selectedFeedback && (
            <>
              <div className="bg-[#8B1A1A] p-4 text-white relative">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold flex items-center justify-between">
                    Feedback Details
                  </DialogTitle>
                  <DialogDescription className="text-white/70 text-xs">
                    Submitted on {format(new Date(selectedFeedback.createdAt), 'MMM d, yyyy h:mm a')}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="p-4 space-y-4 max-h-[85vh] overflow-y-auto">
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">CUSTOMER NAME</label>
                    <p className="text-base font-bold text-[#3D2B1F]">{selectedFeedback.name}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">PHONE NUMBER</label>
                    <p className="text-base font-bold text-[#3D2B1F]">{selectedFeedback.phone}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">LOCATION</label>
                    <p className="text-sm text-[#3D2B1F]">{selectedFeedback.location || "Bomb Rolls and Bowls"} • <span className="capitalize">{selectedFeedback.visitType === 'dine_in' ? 'Dine In' : 'Take Out'}</span></p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">DETAILED RATINGS</label>
                  <div className="grid grid-cols-1 gap-2">
                    {Object.entries(selectedFeedback.ratings).map(([key, value]) => (
                      <div key={key} className="bg-white p-2 rounded-lg shadow-sm flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-600 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className={`text-xs font-bold ${value <= 2 ? 'text-red-500' : 'text-[#3D2B1F]'}`}>{value}</span>
                          <Star className={`w-3 h-3 ${value <= 2 ? 'fill-red-500 text-red-500' : 'fill-amber-400 text-amber-400'}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm flex items-center justify-between border-2 border-[#8B1A1A]/10 mt-2">
                    <span className="font-bold text-xs text-[#3D2B1F]">OVERALL AVG</span>
                    <div className="flex items-center gap-1">
                      <span className="text-lg font-bold text-[#8B1A1A]">{getAverageRating(selectedFeedback.ratings)}</span>
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">COMMENTS</label>
                  <div className="bg-[#FAFAFA] p-3 rounded-lg border border-[#EEEEEE]">
                    <p className="text-xs font-normal text-[#333333]">{selectedFeedback.comments || "No comments provided"}</p>
                  </div>
                </div>

                {selectedFeedback.note && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">CUSTOMER NOTE</label>
                    <div className="bg-white p-3 rounded-lg shadow-sm italic text-xs text-gray-600 border-l-4 border-[#F5A623]">
                      "{selectedFeedback.note}"
                    </div>
                  </div>
                )}

                <div className="pt-4 flex items-center justify-between border-t border-gray-100">
                  <div className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${selectedFeedback.contactedAt ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {selectedFeedback.contactedAt ? 'CONTACTED' : 'PENDING'}
                  </div>
                  {!selectedFeedback.contactedAt && (
                    <Button 
                      onClick={() => handleContactCustomer(selectedFeedback)}
                      size="sm"
                      className="bg-[#8B1A1A] text-white hover:bg-[#8B1A1A]/90 text-xs h-7"
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

      {/* Mobile Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-30">
        <div className="flex">
          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 transition ${
              activeTab === "analytics"
                ? "bg-[#8B1A1A]/5 text-[#8B1A1A]"
                : "text-gray-500 hover:bg-gray-50"
            }`}
            data-testid="tab-analytics-mobile"
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-xs font-medium">Overview</span>
          </button>
          <button
            onClick={() => setActiveTab("feedback")}
            className={`flex-1 py-3 flex flex-col items-center justify-center gap-1 transition ${
              activeTab === "feedback"
                ? "bg-[#8B1A1A]/5 text-[#8B1A1A]"
                : "text-gray-500 hover:bg-gray-50"
            }`}
            data-testid="tab-feedback-mobile"
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-xs font-medium">Feedback</span>
          </button>
        </div>
      </div>
    </div>
  );
}
