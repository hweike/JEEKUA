'use client';

import React from 'react';
import { Check, X } from 'lucide-react';

interface ComparisonRow {
  id: string;
  label: string;
  values: string[];
}

interface ComparisonGroup {
  id: string;
  title: string;
  rows: ComparisonRow[];
}

interface ComparisonTableBlockProps {
  bannerType: 'standard' | 'fullwidth';
  backgroundColor: string;
  columns: 2 | 3 | 4;
  columnTitles: any;
  groups: ComparisonGroup[];
  headerBgColor: string;
  headerTextColor: string;
  groupBgColor: string;
  groupTextColor: string;
  rowBgColor: string;
  rowAltBgColor: string;
  rowTextColor: string;
  borderColor: string;
  checkIconColor: string;
  crossIconColor: string;
  cellFontSize: number;
  labelFontSize: number;
  labelColumnWidth: number;
  tableTitle: string;
  tableTitleColor: string;
  tableTitleFontSize: number;
  tableTitleAlign: 'left' | 'center' | 'right';
  paddingTop: number;
  paddingBottom: number;
  puck?: any;
}

export function ComparisonTableBlock(props: ComparisonTableBlockProps) {
  const {
    bannerType = 'standard',
    backgroundColor = '#ffffff',
    columns = 3,
    columnTitles = [],
    groups = [],
    headerBgColor = '#f9fafb',
    headerTextColor = '#000000',
    groupBgColor = '#f3f4f6',
    groupTextColor = '#000000',
    rowBgColor = '#ffffff',
    rowAltBgColor = '#f9fafb',
    rowTextColor = '#333333',
    borderColor = '#e5e7eb',
    checkIconColor = '#22c55e',
    crossIconColor = '#d1d5db',
    cellFontSize = 14,
    labelFontSize = 14,
    labelColumnWidth = 200,
    tableTitle = '',
    tableTitleColor = '#000000',
    tableTitleFontSize = 32,
    tableTitleAlign = 'center',
    paddingTop = 48,
    paddingBottom = 48,
    puck,
  } = props;

  // ✅ 规范化 columnTitles：兼容字符串数组、对象数组、逗号分隔字符串
  const normalizedTitles: string[] = React.useMemo(() => {
    const raw: any = columnTitles;
    let arr: any[] = [];
    if (typeof raw === 'string') {
      arr = raw.split(',').map((t: string) => t.trim());
    } else if (Array.isArray(raw)) {
      arr = raw;
    }
    return arr.map((item: any) => {
      if (item === null || item === undefined) return '';
      if (typeof item === 'object') {
        return item.title ?? item.text ?? item.label ?? '';
      }
      return String(item);
    });
  }, [columnTitles]);

  if (!groups || groups.length === 0) {
    return (
      <div
        ref={puck?.dragRef}
        className="border-2 border-dashed border-gray-300 p-8 text-center text-gray-400"
      >
        〖详细对比表格 - 请添加对比分组〗
      </div>
    );
  }

  // 通栏样式
  const isFullwidth = bannerType === 'fullwidth';
  const outerStyle: React.CSSProperties = {
    backgroundColor,
    ...(isFullwidth
      ? {
          position: 'relative',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100vw',
          maxWidth: '100vw',
        }
      : {
          maxWidth: '80rem',
          marginLeft: 'auto',
          marginRight: 'auto',
        }),
    ...(bannerType === 'standard' ? { marginTop: '10px', marginBottom: '10px' } : {}),
  };

  const innerStyle: React.CSSProperties = {
    paddingTop: `${paddingTop}px`,
    paddingBottom: `${paddingBottom}px`,
    maxWidth: '80rem',
    margin: '0 auto',
    width: '100%',
    paddingLeft: 'clamp(1rem, 2vw, 2rem)',
    paddingRight: 'clamp(1rem, 2vw, 2rem)',
  };

  // 网格列数 = 1（首列）+ columns
  const gridTemplateColumns = `minmax(${labelColumnWidth}px, 1.2fr) repeat(${columns}, minmax(100px, 1fr))`;

  // ✅ 单元格渲染：处理对象、null、undefined
  const renderCell = (value: any) => {
    let str = '';
    if (value === null || value === undefined) {
      str = '';
    } else if (typeof value === 'object') {
      str = value.text ?? value.title ?? value.label ?? JSON.stringify(value);
    } else {
      str = String(value);
    }

    const trimmed = str.trim();
    if (trimmed === '✓' || trimmed.toLowerCase() === 'check' || trimmed === 'yes') {
      return <Check size={18} style={{ color: checkIconColor }} className="mx-auto" />;
    }
    if (trimmed === '✗' || trimmed === '-' || trimmed.toLowerCase() === 'no') {
      return <X size={18} style={{ color: crossIconColor }} className="mx-auto" />;
    }
    return <span>{trimmed || '-'}</span>;
  };

  return (
    <div ref={puck?.dragRef} style={outerStyle}>
      <div style={innerStyle}>
        {/* 表格标题 */}
        {tableTitle && (
          <h2
            className="mb-8"
            style={{
              fontSize: `${tableTitleFontSize}px`,
              color: tableTitleColor,
              fontWeight: 'bold',
              textAlign: tableTitleAlign,
            }}
          >
            {tableTitle}
          </h2>
        )}

        {/* 表格容器（横向滚动 + 首列固定） */}
        <div className="overflow-x-auto">
          <div className="min-w-full" style={{ border: `1px solid ${borderColor}` }}>
            {/* 表头行 */}
            <div
              className="grid"
              style={{
                gridTemplateColumns,
                backgroundColor: headerBgColor,
                borderBottom: `1px solid ${borderColor}`,
              }}
            >
              <div
                className="px-4 py-3 font-semibold"
                style={{ color: headerTextColor }}
              ></div>
              {normalizedTitles.slice(0, columns).map((title, idx) => (
                <div
                  key={`header-${idx}`}
                  className="px-4 py-3 text-center font-semibold"
                  style={{ color: headerTextColor }}
                >
                  {title}
                </div>
              ))}
            </div>

            {/* 分组 */}
            {groups.map((group, groupIdx) => (
              <React.Fragment key={group.id || `group-${groupIdx}`}>
                {/* 分组标题（跨列合并） */}
                <div
                  className="px-4 py-2 font-semibold"
                  style={{
                    backgroundColor: groupBgColor,
                    color: groupTextColor,
                    borderTop: `1px solid ${borderColor}`,
                    borderBottom: `1px solid ${borderColor}`,
                  }}
                >
                  {group.title}
                </div>

                {/* 分组数据行 */}
                {(group.rows || []).map((row, rowIdx) => {
                  // ✅ 确保 values 是数组
                  const valuesArr = Array.isArray(row.values) ? row.values : [];
                  return (
                    <div
                      key={row.id || `row-${groupIdx}-${rowIdx}`}
                      className="grid"
                      style={{
                        gridTemplateColumns,
                        backgroundColor: rowIdx % 2 === 0 ? rowBgColor : rowAltBgColor,
                        borderBottom: `1px solid ${borderColor}`,
                      }}
                    >
                      <div
                        className="px-4 py-3 sticky left-0"
                        style={{
                          color: rowTextColor,
                          fontSize: `${labelFontSize}px`,
                          backgroundColor: rowIdx % 2 === 0 ? rowBgColor : rowAltBgColor,
                        }}
                      >
                        {row.label}
                      </div>
                      {normalizedTitles.slice(0, columns).map((_, colIdx) => (
                        <div
                          key={`cell-${groupIdx}-${rowIdx}-${colIdx}`}
                          className="px-4 py-3 text-center"
                          style={{
                            color: rowTextColor,
                            fontSize: `${cellFontSize}px`,
                          }}
                        >
                          {renderCell(valuesArr[colIdx] || '-')}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}