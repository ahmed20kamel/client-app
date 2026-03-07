import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 6 }: TableSkeletonProps) {
  return (
    <Card className="shadow-premium overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="border-b bg-muted/30 px-4 py-3 flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="border-b last:border-0 px-4 py-3.5 flex items-center gap-4">
            {Array.from({ length: columns }).map((_, j) => (
              <Skeleton
                key={j}
                className={`h-4 flex-1 ${j === 0 ? 'max-w-[200px]' : j === columns - 1 ? 'max-w-[80px]' : ''}`}
              />
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
