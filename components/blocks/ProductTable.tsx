'use client';

import { useState } from 'react';

interface ProductTableProps {
  content: {
    folded?: boolean;
    showSpecs?: boolean;
  };
  seriesData?: any;
  productData?: any;
}

export default function ProductTable({ content, seriesData, productData }: ProductTableProps) {
  const [folded, setFolded] = useState(content.folded !== false);
  const models = seriesData?.models || productData?.models || [];

  const grouped = models.reduce((acc: any, model: any) => {
    const series = model.series || '产品系列';
    if (!acc[series]) acc[series] = [];
    acc[series].push(model);
    return acc;
  }, {});

  if (folded) {
    return (
      <button
        onClick={() => setFolded(false)}
        className="text-primary hover:underline mb-4"
      >
        展开查看更多
      </button>
    );
  }

  return (
    <div className="mb-8">
      <button
        onClick={() => setFolded(true)}
        className="text-primary hover:underline mb-4"
      >
        点击收起
      </button>
      {Object.entries(grouped).map(([seriesName, items]: [string, any]) => (
        <div key={seriesName} className="mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-2">{seriesName}</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-border">
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
                {items.map((model: any, idx: number) => (
                  <tr key={idx} className="hover:bg-accent">
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
    </div>
  );
}