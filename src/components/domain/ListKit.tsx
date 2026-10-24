import { useState } from 'react';
import { Download, FilterX } from 'lucide-react';
import { Button, Pagination } from '@/components/ui';
import { exportCsv } from '@/lib/csv';
import { errorMessage } from '@/services/http';
import { toast } from '@/store/toast.store';
import type { Paginated } from '@/types/admin';

/** Pagination wired to `useTableState`. */
export function TablePager<T>({ data, onPage, onPageSize }: { data?: Paginated<T>; onPage: (p: number) => void; onPageSize: (s: number) => void }) {
  if (!data) return null;
  return <Pagination page={data.page} pageCount={data.pageCount} total={data.total} pageSize={data.pageSize} onPage={onPage} onPageSize={onPageSize} />;
}

export function ClearFilters({ show, onClear }: { show: boolean; onClear: () => void }) {
  if (!show) return null;
  return (
    <Button variant="ghost" size="sm" icon={FilterX} onClick={onClear}>
      Clear
    </Button>
  );
}

/** Export button that fetches every matching row then downloads a CSV. */
export function ExportButton<T>({ filename, load, columns, label = 'Export CSV' }: { filename: string; load: () => Promise<T[]>; columns: { header: string; value: (r: T) => string | number | null | undefined }[]; label?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      icon={Download}
      loading={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const rows = await load();
          exportCsv(`${filename}-${new Date().toISOString().slice(0, 10)}.csv`, rows, columns);
          toast.success(`Exported ${rows.length} rows`);
        } catch (e) {
          toast.error(errorMessage(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      {label}
    </Button>
  );
}
