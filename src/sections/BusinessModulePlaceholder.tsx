import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PageSectionLayout from '@/components/layout/PageSectionLayout';

interface BusinessModulePlaceholderProps {
  title: string;
  description: string;
  summary: string;
  plannedSections: string[];
  keyFields: string[];
  nextSteps: string[];
}

export default function BusinessModulePlaceholder({
  title,
  description,
  summary,
  plannedSections,
  keyFields,
  nextSteps,
}: BusinessModulePlaceholderProps) {
  return (
    <PageSectionLayout
      title={title}
      description={description}
      stats={
        <>
          <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
            当前阶段：结构占位
          </Badge>
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
            下一步：补字段与业务规则
          </Badge>
        </>
      }
      tabs={[
        { key: 'overview', label: '模块概览', active: true },
        { key: 'fields', label: '关键字段' },
        { key: 'actions', label: '后续动作' },
      ]}
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_1fr]">
        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b border-gray-100">
            <CardTitle>{title}规划摘要</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 p-6">
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm font-medium text-slate-500">模块定位</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">{summary}</p>
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold text-slate-800">建议先做的页面区块</p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {plannedSections.map((section) => (
                  <div key={section} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                    {section}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader className="border-b border-gray-100">
              <CardTitle>关键字段</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-6">
              {keyFields.map((field) => (
                <div key={field} className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  {field}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="border-b border-gray-100">
              <CardTitle>后续动作</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-6">
              {nextSteps.map((step, index) => (
                <div key={step} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#d6b36c] text-xs font-bold text-[#1a1a1a]">
                    {index + 1}
                  </div>
                  <p className="text-sm text-slate-700">{step}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageSectionLayout>
  );
}
