import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Package, Store, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import CoursesManager from "./CoursesManager";
import ProductsManager from "./ProductsManager";
import StorefrontEditor from "./StorefrontEditor";

export default function CreatorDashboard() {
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalSales: 0,
    totalLearners: 0,
    productsListed: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch total courses
      const { count: coursesCount } = await supabase
        .from("courses")
        .select("*", { count: "exact", head: true })
        .eq("creator_id", user.id);

      // Fetch total products
      const { count: productsCount } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("creator_id", user.id);

      // Fetch creator's course IDs for learner and sales calculations
      const { data: creatorCourses } = await supabase
        .from("courses")
        .select("id")
        .eq("creator_id", user.id);

      const courseIds = creatorCourses?.map(c => c.id) || [];

      // Fetch unique learners (enrolled users)
      let learnersCount = 0;
      if (courseIds.length > 0) {
        const { data: enrollments } = await supabase
          .from("enrollments")
          .select("user_id")
          .in("course_id", courseIds);
        
        const uniqueLearners = new Set(enrollments?.map(e => e.user_id) || []);
        learnersCount = uniqueLearners.size;
      }

      // Fetch total sales from completed orders
      const { data: orders } = await supabase
        .from("orders")
        .select("amount")
        .eq("status", "completed")
        .in("item_id", courseIds);

      const totalSales = orders?.reduce((sum, order) => sum + Number(order.amount), 0) || 0;

      setStats({
        totalCourses: coursesCount || 0,
        totalSales,
        totalLearners: learnersCount,
        productsListed: productsCount || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Failed to load dashboard stats");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Creator Dashboard</h1>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardDescription>Total Courses</CardDescription>
            <CardTitle className="text-3xl">{stats.totalCourses}</CardTitle>
          </CardHeader>
          <CardContent>
            <BookOpen className="text-primary w-8 h-8" />
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardDescription>Total Sales</CardDescription>
            <CardTitle className="text-3xl">${stats.totalSales.toFixed(2)}</CardTitle>
          </CardHeader>
          <CardContent>
            <DollarSign className="text-secondary w-8 h-8" />
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardDescription>Total Learners</CardDescription>
            <CardTitle className="text-3xl">{stats.totalLearners}</CardTitle>
          </CardHeader>
          <CardContent>
            <Store className="text-accent w-8 h-8" />
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardDescription>Products Listed</CardDescription>
            <CardTitle className="text-3xl">{stats.productsListed}</CardTitle>
          </CardHeader>
          <CardContent>
            <Package className="text-primary w-8 h-8" />
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="courses" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl mb-8">
          <TabsTrigger value="courses">My Courses</TabsTrigger>
          <TabsTrigger value="products">My Products</TabsTrigger>
          <TabsTrigger value="storefront">Storefront</TabsTrigger>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
        </TabsList>

        <TabsContent value="courses">
          <CoursesManager onCourseChange={fetchStats} />
        </TabsContent>

        <TabsContent value="products">
          <ProductsManager onProductChange={fetchStats} />
        </TabsContent>

        <TabsContent value="storefront">
          <StorefrontEditor />
        </TabsContent>

        <TabsContent value="earnings">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Earnings Overview</CardTitle>
              <CardDescription>Track your revenue and withdrawals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <span className="font-medium">Total Revenue</span>
                  <span className="text-2xl font-bold text-primary">$0.00</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <span className="font-medium">Pending Withdrawals</span>
                  <span className="text-2xl font-bold text-secondary">$0.00</span>
                </div>
                <p className="text-sm text-muted-foreground mt-4">Recent sales will appear here once you start earning.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}