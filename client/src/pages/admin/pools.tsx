import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

interface AdminPool {
  id: string;
  title: string;
  description: string;
  target: string;
  current: string;
  category: string;
  status: string;
  creatorId: string;
  deadline: string;
  createdAt: string;
}

interface PoolsResponse {
  pools: AdminPool[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

async function fetchPools(page: number, status: string): Promise<PoolsResponse> {
  const params = new URLSearchParams({ page: page.toString(), limit: "20" });
  if (status && status !== "all") params.append("status", status);
  
  const response = await fetch(`/api/admin/pools?${params}`, { credentials: "include" });
  if (!response.ok) throw new Error("Failed to fetch pools");
  return response.json();
}

export default function AdminPools() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "pools", page, status],
    queryFn: () => fetchPools(page, status),
  });

  const getStatusBadge = (poolStatus: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      active: { className: "bg-green-500/10 text-green-500 border-green-500/30", label: "Active" },
      completed: { className: "bg-blue-500/10 text-blue-500 border-blue-500/30", label: "Completed" },
      expired: { className: "bg-gray-500/10 text-gray-500 border-gray-500/30", label: "Expired" },
    };
    const variant = variants[poolStatus] || variants.active;
    return <Badge variant="outline" className={variant.className}>{variant.label}</Badge>;
  };

  const calculateProgress = (current: string, target: string) => {
    const c = parseFloat(current);
    const t = parseFloat(target);
    return t > 0 ? Math.min((c / t) * 100, 100) : 0;
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold">Pool Management</h1>
        <p className="text-muted-foreground">View and manage all pools</p>
      </div>

      <div className="flex gap-4 mb-6">
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-48" data-testid="select-pool-status">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {data?.pools.map((pool) => (
              <Card key={pool.id} className="bg-card/50 border-white/10" data-testid={`pool-row-${pool.id}`}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-medium text-lg">{pool.title}</span>
                        {getStatusBadge(pool.status)}
                        <Badge variant="outline" className="border-white/20">{pool.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1 mb-3">
                        {pool.description || "No description"}
                      </p>
                      <div className="flex items-center gap-6 text-sm">
                        <div>
                          <span className="text-muted-foreground">Progress: </span>
                          <span className="font-medium">${parseFloat(pool.current).toLocaleString()}</span>
                          <span className="text-muted-foreground"> / ${parseFloat(pool.target).toLocaleString()}</span>
                          <span className="ml-2 text-primary">({calculateProgress(pool.current, pool.target).toFixed(0)}%)</span>
                        </div>
                        <div className="text-muted-foreground">
                          Deadline: {pool.deadline ? format(new Date(pool.deadline), "MMM d, yyyy") : "No deadline"}
                        </div>
                        <div className="text-muted-foreground">
                          Created: {format(new Date(pool.createdAt), "MMM d, yyyy")}
                        </div>
                      </div>
                    </div>

                    <Link href={`/pool/${pool.id}`}>
                      <Button size="sm" variant="outline" data-testid={`button-view-pool-${pool.id}`}>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm text-muted-foreground">
                Page {page} of {data.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                disabled={page === data.pagination.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}

          {data?.pools.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No pools found
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}
