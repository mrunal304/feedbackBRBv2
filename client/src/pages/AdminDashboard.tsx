import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";
import {
  Star,
  TrendingUp,
  Phone,
  Calendar,
  Users,
  Search,
  LogOut,
  Copy,
  Check,
  MessageSquare,
  BarChart3,
  ChevronDown,
  Eye,
  AlertTriangle,
  History,
  User,
} from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Feedback, Analytics, CustomerHistory } from "@shared/schema";
import { useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const CHART_COLORS = ["#b52d2a", "#f8c216", "#d59e9d", "#b4635d", "#f4d3d1"];

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

function KPICard({ title, value, icon: Icon, description }: { title: string; value: string | number; icon: any; description?: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [period, setPeriod] = useState<"week" | "lastWeek" | "month">("week");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "contacted" | "pending">("all");
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [staffName, setStaffName] = useState("");
  const [copied, setCopied] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailFeedback, setDetailFeedback] = useState<Feedback | null>(null);

  const { data: authCheck, isLoading: authLoading } = useQuery({
    queryKey: ["/api/auth/check"],
  });

  useEffect(() => {
    if (!authLoading && !(authCheck as any)?.authenticated) {
      navigate("/login");
    }
  }, [authCheck, authLoading, navigate]);

  const feedbackUrl = `/api/feedback?search=${encodeURIComponent(searchQuery)}&status=${statusFilter}`;
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

  const { data: customerHistory, isLoading: historyLoading } = useQuery<CustomerHistory>({
    queryKey: ['/api/feedback/customer-history', detailFeedback?.normalizedName],
    queryFn: async () => {
      if (!detailFeedback?.normalizedName) return null;
      const res = await fetch(`/api/feedback/customer-history/${encodeURIComponent(detailFeedback.normalizedName)}`);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error('Failed to fetch customer history');
      }
      return res.json();
    },
    enabled: !!(authCheck as any)?.authenticated && !!detailFeedback?.normalizedName && detailDialogOpen,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
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
      queryClient.invalidateQueries({ predicate: (query) => {
        const key = query.queryKey[0] as string;
        return key?.startsWith("/api/feedback") || key?.startsWith("/api/analytics");
      }});
      setContactDialogOpen(false);
      setSelectedFeedback(null);
      setStaffName("");
    },
  });

  const handleCopyPhone = async (phone: string) => {
    await navigator.clipboard.writeText(phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Phone Copied",
      description: "Phone number copied to clipboard",
    });
  };

  const handleContactCustomer = (fb: Feedback) => {
    setSelectedFeedback(fb);
    setContactDialogOpen(true);
  };

  const handleViewDetails = (fb: Feedback) => {
    setDetailFeedback(fb);
    setDetailDialogOpen(true);
  };

  const RATING_CATEGORIES = [
    { key: 'qualityOfService', label: 'Quality of Service' },
    { key: 'speedOfService', label: 'Speed of Service' },
    { key: 'friendliness', label: 'Friendliness' },
    { key: 'foodTemperature', label: 'Food Temperature' },
    { key: 'menuExplanation', label: 'Menu Explanation' },
    { key: 'likelyToReturn', label: 'Likely to Return' },
  ] as const;

  const isLowRating = (rating: number) => rating <= 2;

  const getAverageRating = (ratings: Feedback["ratings"]) => {
    const sum = 
      ratings.qualityOfService + 
      ratings.speedOfService + 
      ratings.friendliness + 
      ratings.foodTemperature + 
      ratings.menuExplanation + 
      ratings.likelyToReturn;
    return (sum / 6).toFixed(1);
  };

  const filteredFeedback = feedback.filter((fb) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return fb.name.toLowerCase().includes(query) || fb.phoneNumber.includes(query);
  });

  if (authLoading || !(authCheck as any)?.authenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo className="w-10 h-10" />
            <div>
              <h1 className="font-bold text-lg">Bomb Rolls and Bowls</h1>
              <p className="text-xs text-muted-foreground">Admin Dashboard</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => logoutMutation.mutate()}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <Tabs defaultValue="analytics">
          <TabsList className="mb-4">
            <TabsTrigger value="analytics" data-testid="tab-analytics">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="feedback" data-testid="tab-feedback">
              <MessageSquare className="w-4 h-4 mr-2" />
              Feedback
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-xl font-semibold">Weekly Analytics</h2>
              <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
                <SelectTrigger className="w-40" data-testid="select-period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="lastWeek">Last Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="Total Feedback"
                value={analytics?.totalFeedback || 0}
                icon={MessageSquare}
                description="Responses received"
              />
              <KPICard
                title="Average Rating"
                value={`${analytics?.averageRating || 0}/5`}
                icon={Star}
                description="Overall satisfaction"
              />
              <KPICard
                title="Top Category"
                value={analytics?.topCategory || "-"}
                icon={TrendingUp}
                description="Highest rated"
              />
              <KPICard
                title="Response Rate"
                value={`${analytics?.responseRate || 0}%`}
                icon={Phone}
                description="Customers contacted"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Weekly Rating Trends</CardTitle>
                  <CardDescription>Daily averages for each category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analytics?.weeklyTrends || []}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis domain={[0, 5]} className="text-xs" />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="qualityOfService" stroke={CHART_COLORS[0]} strokeWidth={2} />
                        <Line type="monotone" dataKey="speedOfService" stroke={CHART_COLORS[1]} strokeWidth={2} />
                        <Line type="monotone" dataKey="friendliness" stroke={CHART_COLORS[2]} strokeWidth={2} />
                        <Line type="monotone" dataKey="foodTemperature" stroke={CHART_COLORS[3]} strokeWidth={2} />
                        <Line type="monotone" dataKey="menuExplanation" stroke={CHART_COLORS[4]} strokeWidth={2} />
                        <Line type="monotone" dataKey="likelyToReturn" stroke="#f8c216" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Category Performance</CardTitle>
                  <CardDescription>Average ratings comparison</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics?.categoryPerformance || []}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="category" className="text-xs" />
                        <YAxis domain={[0, 5]} className="text-xs" />
                        <Tooltip />
                        <Bar dataKey="average" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Feedback Volume</CardTitle>
                <CardDescription>Total vs Contacted vs Pending</CardDescription>
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
                        label
                      >
                        <Cell fill={CHART_COLORS[1]} />
                        <Cell fill={CHART_COLORS[2]} />
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feedback" className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="relative flex-1 w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="w-40" data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Ratings</TableHead>
                        <TableHead>Note</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFeedback.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No feedback found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredFeedback.map((fb) => (
                          <TableRow key={fb._id} data-testid={`row-feedback-${fb._id}`}>
                            <TableCell>
                              <div className="flex items-center justify-between group">
                                <div>
                                  <p className="font-medium">{fb.name}</p>
                                  <p className="text-sm text-muted-foreground">{fb.phoneNumber}</p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-11 w-11 rounded-full text-primary hover:text-primary hover:bg-primary/10 transition-colors"
                                  asChild
                                  data-testid={`button-contact-tel-${fb._id}`}
                                >
                                  <a href={`tel:${fb.phoneNumber.replace(/\s+/g, '')}`}>
                                    <Phone className="w-5 h-5" />
                                  </a>
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg font-bold">{getAverageRating(fb.ratings)}</span>
                                  <StarDisplay rating={Math.round(Number(getAverageRating(fb.ratings)))} />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-48">
                              <p className="truncate text-sm text-muted-foreground">
                                {fb.note || "-"}
                              </p>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {(() => {
                                    try {
                                      const [year, month, day] = fb.visitDate.split("-");
                                      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                                      return `${day} ${months[parseInt(month) - 1]} ${year}`;
                                    } catch (e) {
                                      return fb.visitDate;
                                    }
                                  })()}
                                </div>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className="text-[10px] opacity-70">🕒</span>
                                  {(() => {
                                    try {
                                      const [hours, minutes] = fb.visitTime.split(":");
                                      const h = parseInt(hours);
                                      const ampm = h >= 12 ? "PM" : "AM";
                                      const h12 = h % 12 || 12;
                                      return `${h12}:${minutes} ${ampm}`;
                                    } catch (e) {
                                      return fb.visitTime;
                                    }
                                  })()}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {fb.contactedAt ? (
                                <Badge variant="secondary" className="bg-accent/20 text-accent">
                                  Contacted
                                </Badge>
                              ) : (
                                <Badge variant="outline">Pending</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewDetails(fb)}
                                  data-testid={`button-view-details-${fb._id}`}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  View Details
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleCopyPhone(fb.phoneNumber)}
                                  data-testid={`button-copy-${fb._id}`}
                                >
                                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </Button>
                                {!fb.contactedAt && (
                                  <Button
                                    size="sm"
                                    variant="outline"
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
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact Customer</DialogTitle>
            <DialogDescription>
              Mark this customer as contacted. The phone number will be copied to your clipboard.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">Phone Number</p>
              <p className="font-mono text-lg">{selectedFeedback?.phoneNumber}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Your Name</label>
              <Input
                placeholder="Enter your name"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                data-testid="input-staff-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContactDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedFeedback && staffName) {
                  handleCopyPhone(selectedFeedback.phoneNumber);
                  contactMutation.mutate({ id: selectedFeedback._id, staffName });
                }
              }}
              disabled={!staffName || contactMutation.isPending}
              data-testid="button-confirm-contact"
            >
              {contactMutation.isPending ? "Saving..." : "Copy & Mark Contacted"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Feedback Details
            </DialogTitle>
            <DialogDescription>
              Detailed view of customer feedback and rating breakdown
            </DialogDescription>
          </DialogHeader>

          {detailFeedback && (
            <div className="pr-2">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">Customer Name</p>
                    <p className="font-medium" data-testid="text-detail-name">{detailFeedback.name}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">Phone Number</p>
                    <p className="font-mono" data-testid="text-detail-phone">{detailFeedback.phoneNumber}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">Visit Date</p>
                    <p className="font-medium" data-testid="text-detail-visit-date">{detailFeedback.visitDate}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">Review Date</p>
                    <p className="font-medium" data-testid="text-detail-review-date">
                      {new Date(detailFeedback.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium" data-testid="text-detail-location">{detailFeedback.location}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">Dining Option</p>
                    <p className="font-medium capitalize" data-testid="text-detail-dining">{detailFeedback.diningOption}</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400" />
                    Overall Rating
                  </h4>
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
                    <span className="text-3xl font-bold" data-testid="text-detail-overall-rating">
                      {getAverageRating(detailFeedback.ratings)}
                    </span>
                    <StarDisplay rating={Math.round(Number(getAverageRating(detailFeedback.ratings)))} />
                    <span className="text-muted-foreground">/ 5</span>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-3">Category Ratings</h4>
                  <div className="space-y-2">
                    {RATING_CATEGORIES.map(({ key, label }) => {
                      const rating = detailFeedback.ratings[key];
                      const low = isLowRating(rating);
                      return (
                        <div
                          key={key}
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            low ? 'bg-destructive/10 border border-destructive/30' : 'bg-muted'
                          }`}
                          data-testid={`rating-category-${key}`}
                        >
                          <div className="flex items-center gap-2">
                            {low && <AlertTriangle className="w-4 h-4 text-destructive" />}
                            <span className={low ? 'text-destructive font-medium' : ''}>{label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <StarDisplay rating={rating} />
                            <span className={`font-bold ${low ? 'text-destructive' : ''}`}>
                              {rating}/5
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {detailFeedback.note && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Customer Comment
                      </h4>
                      <div className="p-4 rounded-lg bg-muted">
                        <p className="text-sm whitespace-pre-wrap" data-testid="text-detail-note">
                          {detailFeedback.note}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Customer History
                    {customerHistory && customerHistory.totalVisits > 1 && (
                      <Badge variant="secondary" className="ml-2">
                        Repeat Customer
                      </Badge>
                    )}
                  </h4>

                  {historyLoading ? (
                    <div className="p-4 rounded-lg bg-muted text-center text-muted-foreground">
                      Loading customer history...
                    </div>
                  ) : customerHistory ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 p-3 rounded-lg bg-muted">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Visits</p>
                          <p className="text-2xl font-bold" data-testid="text-total-visits">
                            {customerHistory.totalVisits}
                          </p>
                        </div>
                      </div>

                      {customerHistory.totalVisits > 1 && (
                        <div className="space-y-3">
                          <p className="text-sm text-muted-foreground">Previous Reviews (Latest First)</p>
                          {customerHistory.feedbackHistory
                            .filter(fb => fb._id !== detailFeedback._id)
                            .map((fb, index) => (
                              <Card key={fb._id} className="p-4" data-testid={`history-item-${index}`}>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(fb.createdAt).toLocaleDateString()}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold">{getAverageRating(fb.ratings)}</span>
                                    <StarDisplay rating={Math.round(Number(getAverageRating(fb.ratings)))} />
                                  </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                                  {RATING_CATEGORIES.slice(0, 3).map(({ key, label }) => (
                                    <div key={key} className="flex items-center gap-1">
                                      <span className="text-muted-foreground">{label.split(' ')[0]}:</span>
                                      <span className={isLowRating(fb.ratings[key]) ? 'text-destructive font-medium' : ''}>
                                        {fb.ratings[key]}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                                {fb.note && (
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    "{fb.note}"
                                  </p>
                                )}
                              </Card>
                            ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg bg-muted text-center text-muted-foreground">
                      No previous feedback history available
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              Close
            </Button>
            {detailFeedback && !detailFeedback.contactedAt && (
              <Button
                onClick={() => {
                  setDetailDialogOpen(false);
                  handleContactCustomer(detailFeedback);
                }}
                data-testid="button-contact-from-detail"
              >
                <Phone className="w-4 h-4 mr-1" />
                Contact Customer
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
