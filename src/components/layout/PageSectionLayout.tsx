import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageSectionTab {
  key: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

interface PageSectionLayoutProps {
  title: string;
  description: string;
  onBack?: () => void;
  backLabel?: string;
  actions?: ReactNode;
  stats?: ReactNode;
  tabs?: PageSectionTab[];
  children: ReactNode;
}

export default function PageSectionLayout({
  title,
  description,
  onBack,
  backLabel = '返回仪表盘',
  actions,
  stats,
  tabs,
  children,
}: PageSectionLayoutProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              {onBack ? (
                <Button variant="outline" className="gap-2" onClick={onBack}>
                  <ChevronLeft className="h-4 w-4" />
                  {backLabel}
                </Button>
              ) : null}
              {stats ? <div className="flex flex-wrap gap-2">{stats}</div> : null}
            </div>
            <div className="mt-4">
              <h2 className="text-2xl font-bold tracking-tight text-[#1a1a1a]">{title}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">{description}</p>
            </div>
            {tabs?.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {tabs.map((tab) => (
                  <Button
                    key={tab.key}
                    variant={tab.active ? 'default' : 'outline'}
                    size="sm"
                    onClick={tab.onClick}
                    className={tab.active ? 'bg-[#c9a962] text-[#1a1a1a] hover:bg-[#b9964f]' : ''}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>

          {actions ? <div className="flex flex-wrap gap-3 xl:justify-end">{actions}</div> : null}
        </div>
      </section>

      <section>{children}</section>
    </div>
  );
}
