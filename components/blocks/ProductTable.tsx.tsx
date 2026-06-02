'use client';

import { useState } from 'react';

export default function ProductTable({ content, seriesData }: any) {
  const [folded, setFolded] = useState(content.folded !== false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleFold = () => setFolded(!folded);
  const toggleRow = (modelId: string) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(modelId)) newSet.delete(modelId);
    else newSet.add(modelId);
    setExpandedRows(newSet);
  };

  const grouped = seriesData.models.reduce((acc: any, model: any) => {
    const series = model.series || '其他';
    if (!acc[series]) acc[series] = [];
    acc[series].push(model);
    return acc;
  }, {});

  return (
    <div className="mb-8">
      {folded ? (
        <button
          onClick={toggleFold}
          className="text-primary hover:underline mb-4"
        >
          展开查看更多
        </button>
      ) : (
        <>
          <button
            onClick={toggleFold}
            className="text-primary hover:underline mb-4"
          >
            点击收起
          </button>
          {Object.entries(grouped).map(([seriesName, models]: [string, any]) => (
            <div key={seriesName} className="mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">{seriesName}</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-border">
                  <thead>
                    <tr className="bg-muted">
                      <th className="p-2 border border-border text-foreground">型号</th>
                      <th className="p-2 border border-border text-foreground">功率(W)</th>
                      <th className="p-2 border border-border text-foreground">输入(V)</th>
                      <th className="p-2 border border-border text-foreground">输出电压(VDC)</th>
                      <th className="p-2 border border-border text-foreground">输出电流</th>
                      <th className="p-2 border border-border text-foreground">效率%</th>
                      <th className="p-2 border border-border text-foreground">隔离电压</th>
                      <th className="p-2 border border-border text-foreground">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {models.map((model: any) => (
                      <tr key={model.model} className="hover:bg-accent">
                        <td className="p-2 border border-border text-foreground">{model.model}</td>
                        <td className="p-2 border border-border text-foreground text-right">{model.power}</td>
                        <td className="p-2 border border-border text-foreground">{model.input_vac || model.input_vdc}</td>
                        <td className="p-2 border border-border text-foreground text-right">{model.output_v}</td>
                        <td className="p-2 border border-border text-foreground">{model.output_i}</td>
                        <td className="p-2 border border-border text-foreground text-right">{model.efficiency}</td>
                        <td className="p-2 border border-border text-foreground">{model.isolation}</td>
                        <td className="p-2 border border-border">
                          <a
                            href={`/products/${model.model}`}
                            className="text-primary hover:underline"
                          >
                            查看详情
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}