'use client';

import { useState } from 'react';
import { Download, FileText, Table } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  exportReportCSV,
  exportReportPDF,
  type ReportData,
} from '@/lib/reports/export-report';
import { useAuthStore } from '@/lib/store/auth-store';
import toast from 'react-hot-toast';

interface DownloadReportButtonProps {
  reportData: ReportData;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function DownloadReportButton({
  reportData,
  variant = 'outline',
  size = 'default',
  className,
}: DownloadReportButtonProps) {
  const [downloading, setDownloading] = useState<'pdf' | 'csv' | null>(null);
  const user = useAuthStore((s) => s.user);

  const logDownload = async (format: string) => {
    try {
      await fetch('/api/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: user?.email || 'anonymous',
          action: 'report_download',
          details: `${format} report for ${reportData.location}`,
        }),
      });
    } catch {
      // Non-blocking
    }
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    setDownloading(format);
    try {
      if (format === 'csv') {
        exportReportCSV(reportData);
        toast.success('CSV report downloaded');
      } else {
        exportReportPDF(reportData);
        toast.success('PDF report downloaded');
      }
      await logDownload(format.toUpperCase());
    } catch {
      toast.error('Failed to export report');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <Button
        variant={variant}
        size={size}
        disabled={!!downloading}
        onClick={() => handleExport('pdf')}
      >
        <FileText className="h-4 w-4 mr-2" />
        {downloading === 'pdf' ? 'Exporting…' : 'PDF'}
      </Button>
      <Button
        variant={variant}
        size={size}
        disabled={!!downloading}
        onClick={() => handleExport('csv')}
      >
        <Table className="h-4 w-4 mr-2" />
        {downloading === 'csv' ? 'Exporting…' : 'CSV'}
      </Button>
    </div>
  );
}

/** Compact single-button variant with icon label */
export function DownloadReportIconButton({
  reportData,
  className,
}: {
  reportData: ReportData;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const user = useAuthStore((s) => s.user);

  const logDownload = async (format: string) => {
    try {
      await fetch('/api/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: user?.email || 'anonymous',
          action: 'report_download',
          details: `${format} report for ${reportData.location}`,
        }),
      });
    } catch {
      // Non-blocking
    }
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      if (format === 'csv') {
        exportReportCSV(reportData);
        toast.success('CSV report downloaded');
      } else {
        exportReportPDF(reportData);
        toast.success('PDF report downloaded');
      }
      await logDownload(format.toUpperCase());
    } catch {
      toast.error('Failed to export report');
    }
    setOpen(false);
  };

  return (
    <div className={`relative ${className ?? ''}`}>
      <Button variant="outline" size="sm" onClick={() => setOpen(!open)}>
        <Download className="h-4 w-4 mr-2" />
        Download Report
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-popover border rounded-md shadow-md py-1 min-w-[140px]">
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
            onClick={() => handleExport('pdf')}
          >
            <FileText className="h-4 w-4" /> PDF
          </button>
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
            onClick={() => handleExport('csv')}
          >
            <Table className="h-4 w-4" /> CSV
          </button>
        </div>
      )}
    </div>
  );
}
