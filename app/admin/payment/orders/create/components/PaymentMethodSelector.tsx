// app/admin/payment/orders/create/components/PaymentMethodSelector.tsx
'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Loader2, ChevronRight, Building2, Smartphone, CreditCard, Globe, MapPin, Building, Check, Info } from 'lucide-react';
// ❌ 删除：不再从客户端直接引入服务端模块
// import { accountService } from '@/lib/payment/services/account.service';
import type { PaymentAccount, PaymentMethodType, AccountType } from '@/lib/payment/types/account';
import { PAYMENT_METHOD_LABELS, PAYMENT_TYPE_LABELS } from '@/lib/payment/types/account';
// ✅ 统一使用 getBankLogo，与 share/page.tsx 保持一致
import { getBankLogo, DEFAULT_LOGO } from '@/lib/payment/types/logos';

interface PaymentMethodSelectorProps {
  siteId: string;
  value: PaymentMethodType;
  onChange: (method: PaymentMethodType, accountId?: string) => void;
  onAccountSelect?: (account: PaymentAccount) => void;
  multiple?: boolean;
  maxSelect?: number;
  selectedAccounts?: PaymentAccount[];
  onAccountsChange?: (accounts: PaymentAccount[]) => void;
}

interface GroupedAccounts {
  bank_transfer: PaymentAccount[];
  qr_code: PaymentAccount[];
  online_payment: PaymentAccount[];
}

// ============================================================
// 支付类型图标配置
// ============================================================
const PAYMENT_TYPE_CONFIG: Record<keyof GroupedAccounts, { 
  label: string; 
  icon: React.ReactNode;
  desc: string;
  color: string;
}> = {
  bank_transfer: {
    label: PAYMENT_TYPE_LABELS.bank_transfer,
    icon: <Building2 size={18} />,
    desc: '付款人可付款至您指定的全球收款账户',
    color: 'blue',
  },
  qr_code: {
    label: PAYMENT_TYPE_LABELS.qr_code,
    icon: <Smartphone size={18} />,
    desc: '买家扫码支付，即时到账',
    color: 'green',
  },
  online_payment: {
    label: PAYMENT_TYPE_LABELS.online_payment,
    icon: <CreditCard size={18} />,
    desc: '支持买家使用信用卡/手机钱包等在线支付方式',
    color: 'purple',
  },
};

// ============================================================
// AccountType 显示配置
// ============================================================
const ACCOUNT_TYPE_CONFIG: Record<AccountType, { label: string; icon: React.ReactNode }> = {
  global: {
    label: '全球收款账号',
    icon: <Globe size={14} />,
  },
  local: {
    label: '本地收款账号',
    icon: <MapPin size={14} />,
  },
  domestic: {
    label: '中国国内银行',
    icon: <Building size={14} />,
  },
};

// ============================================================
// ✅ 统一 Logo 渲染函数（与 share/page.tsx 保持一致）
// ============================================================
const renderAccountLogo = (account: PaymentAccount, size: string = 'w-8 h-8') => {
  // ✅ 统一使用 getBankLogo，与 share/page.tsx 保持一致
  const logo = getBankLogo(account);
  
  if (!logo || logo === DEFAULT_LOGO) {
    const emojiMap: Record<string, string> = {
      tt: '🏦',
      wechat: '💬',
      alipay: '💳',
      paypal: '🅿️',
      credit_card: '💳',
    };
    return (
      <span className="text-sm text-gray-400">
        {emojiMap[account.payment_method] || '💳'}
      </span>
    );
  }
  
  return (
    <img 
      src={logo} 
      alt=""
      className={`${size} object-contain rounded`}
      onError={(e) => {
        (e.target as HTMLImageElement).src = DEFAULT_LOGO;
      }}
    />
  );
};

// ✅ 大 Logo 渲染（用于详情区域）
const renderLargeAccountLogo = (account: PaymentAccount) => {
  // ✅ 统一使用 getBankLogo，与 share/page.tsx 保持一致
  const logo = getBankLogo(account);
  
  if (!logo || logo === DEFAULT_LOGO) {
    const emojiMap: Record<string, string> = {
      tt: '🏦',
      wechat: '💬',
      alipay: '💳',
      paypal: '🅿️',
      credit_card: '💳',
    };
    return (
      <div className="w-[100px] h-[50px] rounded-lg border bg-gray-100 flex items-center justify-center text-2xl">
        {emojiMap[account.payment_method] || '💳'}
      </div>
    );
  }
  
  return (
    <img 
      src={logo} 
      alt=""
      className="w-[100px] h-[50px] object-contain rounded-lg border bg-white p-1"
      onError={(e) => {
        (e.target as HTMLImageElement).src = DEFAULT_LOGO;
      }}
    />
  );
};

// ============================================================
// ✅ 扫码支付图片组件（独立处理加载状态）
// ============================================================
const QRCodeImage = ({ imageUrl, noQrText, scanToPayText }: { 
  imageUrl?: string; 
  noQrText: string;
  scanToPayText: string;
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
  }, [imageUrl]);

  if (!imageUrl || hasError) {
    return (
      <div className="w-32 h-32 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-300 text-sm">
        {noQrText}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <img 
        src={imageUrl} 
        alt="收款码"
        className={`w-32 h-32 object-contain border rounded-lg bg-white p-1 transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
      />
      <p className="text-xs text-gray-400 mt-2">{scanToPayText}</p>
    </div>
  );
};

export default function PaymentMethodSelector({ 
  siteId, 
  value, 
  onChange,
  onAccountSelect,
  multiple = false,
  maxSelect = 3,
  selectedAccounts: externalSelectedAccounts = [],
  onAccountsChange,
}: PaymentMethodSelectorProps) {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<keyof GroupedAccounts>('bank_transfer');
  const [expandedTypes, setExpandedTypes] = useState<Set<AccountType>>(new Set(['global', 'local', 'domestic']));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // ✅ 添加标记：是否已完成初始同步
  const [initialSyncDone, setInitialSyncDone] = useState(false);
  // ✅ 防止无限循环
  const [isSyncing, setIsSyncing] = useState(false);

  // ============================================================
  // 加载所有活跃的收款账号（✅ 改为通过 API Route 查询）
  // ============================================================
  useEffect(() => {
    const loadAccounts = async () => {
      if (!siteId) {
        setLoading(false);
        setInitialSyncDone(true);
        return;
      }
      
      try {
        // ✅ 通过 API Route 查询（避免客户端直接引 server-only 模块）
        const params = new URLSearchParams({ 
          siteId,
          is_active: 'true',   // 只要活跃账号
        });
        const res = await fetch(`/api/admin/payment/accounts?${params}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        // API 返回格式：{ success: true, data: accounts }
        const data: PaymentAccount[] = json.data || [];
        
        setAccounts(data);
        
        // ✅ 多选模式：优先使用外部传入的选中账号
        if (multiple && externalSelectedAccounts.length > 0) {
          const ids = new Set(externalSelectedAccounts.map(a => a.id));
          // 验证这些账号是否在 accounts 列表中
          const validIds = new Set<string>();
          ids.forEach(id => {
            if (data.some(acc => acc.id === id)) {
              validIds.add(id);
            }
          });
          if (validIds.size > 0) {
            setSelectedIds(validIds);
          }
        } else if (multiple && externalSelectedAccounts.length === 0) {
          // 多选模式但外部没有选中账号
          setSelectedIds(new Set());
        } else if (data.length > 0 && !multiple) {
          // 单选模式：默认选中第一个
          const firstAccount = data[0];
          setSelectedAccountId(firstAccount.id);
          onChange(firstAccount.payment_method, firstAccount.id);
          if (onAccountSelect) onAccountSelect(firstAccount);
        }
        
        // ✅ 标记初始同步完成
        setInitialSyncDone(true);
      } catch (error) {
        console.error('加载收款账号失败:', error);
        setInitialSyncDone(true);
      } finally {
        setLoading(false);
      }
    };
    loadAccounts();
  }, [siteId]);

  // ============================================================
  // ✅ 监听外部传入的选中账号列表变化（用于编辑模式）
  // ============================================================
  useEffect(() => {
    // 只有多选模式、账号已加载、且初始同步完成后才处理
    if (!multiple || accounts.length === 0 || !initialSyncDone || isSyncing) {
      return;
    }

    // 检查外部传入的账号是否与当前选中的一致
    const externalIds = new Set(externalSelectedAccounts.map(a => a.id));
    const currentIds = new Set(selectedIds);
    
    // 比较两个 Set 是否相同
    const externalArray = Array.from(externalIds).sort();
    const currentArray = Array.from(currentIds).sort();
    
    const isSame = externalArray.length === currentArray.length && 
                   externalArray.every((id, index) => id === currentArray[index]);
    
    if (!isSame) {
      setIsSyncing(true);
      
      // ✅ 确保外部传入的账号都在 accounts 列表中（通过 ID 匹配）
      const validIds = new Set<string>();
      externalSelectedAccounts.forEach(a => {
        // 检查账号是否存在于 accounts 列表中
        const exists = accounts.some(acc => acc.id === a.id);
        if (exists) {
          validIds.add(a.id);
        } else {
          // 如果账号不在列表中，尝试通过显示名称匹配
          const matched = accounts.find(acc => 
            (acc.display_name_zh && acc.display_name_zh === a.display_name_zh) || 
            (acc.display_name_en && acc.display_name_en === a.display_name_en)
          );
          if (matched) {
            validIds.add(matched.id);
          }
        }
      });
      
      // ✅ 如果外部传入的账号ID有效，更新选中状态
      if (validIds.size > 0) {
        setSelectedIds(validIds);
        
        // 通知父组件同步（确保数据一致）
        const matchedAccounts = accounts.filter(a => validIds.has(a.id));
        if (onAccountsChange && matchedAccounts.length > 0) {
          // 使用 setTimeout 避免在渲染期间触发更新
          setTimeout(() => {
            onAccountsChange(matchedAccounts);
            setIsSyncing(false);
          }, 0);
          return;
        }
      } else if (externalSelectedAccounts.length === 0) {
        setSelectedIds(new Set());
        if (onAccountsChange) {
          setTimeout(() => {
            onAccountsChange([]);
            setIsSyncing(false);
          }, 0);
          return;
        }
      }
      
      setIsSyncing(false);
    }
  }, [externalSelectedAccounts, accounts, multiple, initialSyncDone, selectedIds, onAccountsChange, isSyncing]);

  // ============================================================
  // ✅ 当 accounts 和 externalSelectedAccounts 都准备好后，确保选中状态同步（兜底逻辑）
  // ============================================================
  useEffect(() => {
    if (multiple && accounts.length > 0 && initialSyncDone && !isSyncing) {
      // 如果外部有选中账号，但当前选中的为空，强制同步
      if (externalSelectedAccounts.length > 0 && selectedIds.size === 0) {
        const ids = new Set(externalSelectedAccounts.map(a => a.id));
        const validIds = new Set<string>();
        ids.forEach(id => {
          if (accounts.some(acc => acc.id === id)) {
            validIds.add(id);
          }
        });
        if (validIds.size > 0) {
          setIsSyncing(true);
          setSelectedIds(validIds);
          
          const matchedAccounts = accounts.filter(a => validIds.has(a.id));
          if (onAccountsChange && matchedAccounts.length > 0) {
            setTimeout(() => {
              onAccountsChange(matchedAccounts);
              setIsSyncing(false);
            }, 0);
          } else {
            setIsSyncing(false);
          }
        }
      }
    }
  }, [accounts, externalSelectedAccounts, multiple, initialSyncDone, selectedIds.size, onAccountsChange, isSyncing]);

  // 按支付方式分组
  const groupedAccounts: GroupedAccounts = {
    bank_transfer: accounts.filter(a => a.payment_method === 'tt'),
    qr_code: accounts.filter(a => a.payment_method === 'wechat' || a.payment_method === 'alipay'),
    online_payment: accounts.filter(a => a.payment_method === 'paypal' || a.payment_method === 'credit_card'),
  };

  // TT银行按 account_type 分组
  const getTTAccountsByType = (): Record<AccountType, PaymentAccount[]> => {
    const ttAccounts = groupedAccounts.bank_transfer;
    const result: Record<AccountType, PaymentAccount[]> = {
      global: [],
      local: [],
      domestic: [],
    };
    
    ttAccounts.forEach(acc => {
      const type = acc.account_type as AccountType || 'local';
      if (result[type]) {
        result[type].push(acc);
      } else {
        result.local.push(acc);
      }
    });
    
    return result;
  };

  // 获取支付方式显示名
  const getMethodDisplayName = (account: PaymentAccount): string => {
    if (account.display_name_zh) {
      return account.display_name_zh;
    }
    const bankName = (account.beneficiary_bank || '').toLowerCase();
    if (bankName.includes('citi')) {
      return '中国香港(花旗)';
    }
    if (bankName.includes('jpmorgan') || bankName.includes('chase')) {
      return '新加坡(摩根)';
    }
    if (account.display_name_en) {
      return account.display_name_en;
    }
    return PAYMENT_METHOD_LABELS[account.payment_method] || '未命名';
  };

  // 获取支付方式标签
  const getAccountBadge = (account: PaymentAccount): string => {
    const badgeMap: Record<PaymentMethodType, string> = {
      tt: '银行转账',
      paypal: 'PayPal',
      credit_card: '信用卡',
      wechat: '微信支付',
      alipay: '支付宝',
    };
    return badgeMap[account.payment_method] || '';
  };

  // 选择/取消选择账号
  const toggleSelectAccount = (account: PaymentAccount) => {
    if (!multiple) {
      setSelectedAccountId(account.id);
      onChange(account.payment_method, account.id);
      if (onAccountSelect) onAccountSelect(account);
      return;
    }

    const newSelected = new Set(selectedIds);
    if (newSelected.has(account.id)) {
      newSelected.delete(account.id);
    } else {
      if (newSelected.size >= maxSelect) {
        return;
      }
      newSelected.add(account.id);
    }
    setSelectedIds(newSelected);
    
    const selectedAccountsList = accounts.filter(a => newSelected.has(a.id));
    if (onAccountsChange) {
      onAccountsChange(selectedAccountsList);
    }
  };

  // 获取当前选中的账号
  const getSelectedAccount = (): PaymentAccount | null => {
    return accounts.find(a => a.id === selectedAccountId) || null;
  };

  const hasAvailableAccounts = Object.values(groupedAccounts).some(list => list.length > 0);

  const toggleTypeExpand = (type: AccountType) => {
    const newSet = new Set(expandedTypes);
    if (newSet.has(type)) {
      newSet.delete(type);
    } else {
      newSet.add(type);
    }
    setExpandedTypes(newSet);
  };

  const getSelectedAccountsList = (): PaymentAccount[] => {
    if (multiple) {
      return accounts.filter(a => selectedIds.has(a.id));
    }
    const account = getSelectedAccount();
    return account ? [account] : [];
  };

  // ✅ 渲染账号详情
  const renderAccountDetails = (account: PaymentAccount) => {
    if (!account) return null;

    // TT 银行转账
    if (account.payment_method === 'tt') {
      const isDomestic = account.account_type === 'domestic';
      return (
        <div className="space-y-3">
          <div>
            <div className="text-xs text-gray-400">Beneficiary Name</div>
            <div className="font-medium">{account.beneficiary_name || '-'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Account Number</div>
            <div className="font-medium font-mono">{account.beneficiary_account || '-'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Country/Region</div>
            <div className="font-medium">{account.country_region || '-'}</div>
          </div>
          {!isDomestic && (
            <div>
              <div className="text-xs text-gray-400">SWIFT Code</div>
              <div className="font-medium font-mono">{account.swift_code || '-'}</div>
            </div>
          )}
          {!isDomestic && account.beneficiary_address && (
            <div>
              <div className="text-xs text-gray-400">Beneficiary Address</div>
              <div className="font-medium">{account.beneficiary_address}</div>
            </div>
          )}
          <div>
            <div className="text-xs text-gray-400">Beneficiary Bank</div>
            <div className="font-medium">{account.beneficiary_bank || '-'}</div>
          </div>
          {account.beneficiary_bank_address && (
            <div>
              <div className="text-xs text-gray-400">Bank Address</div>
              <div className="font-medium">{account.beneficiary_bank_address}</div>
            </div>
          )}
          {account.bank_code && (
            <div>
              <div className="text-xs text-gray-400">Bank Code</div>
              <div className="font-medium">{account.bank_code}</div>
            </div>
          )}
          {account.branch_code && (
            <div>
              <div className="text-xs text-gray-400">Branch Code</div>
              <div className="font-medium">{account.branch_code}</div>
            </div>
          )}
          {!isDomestic && account.iban && (
            <div>
              <div className="text-xs text-gray-400">IBAN</div>
              <div className="font-medium font-mono">{account.iban}</div>
            </div>
          )}
          <div>
            <div className="text-xs text-gray-400">Supported Currencies</div>
            <div className="font-medium">{account.currency?.join(', ') || '-'}</div>
          </div>
          {account.intermediary_bank && (
            <div>
              <div className="text-xs text-gray-400">Intermediary Bank</div>
              <div className="font-medium">{account.intermediary_bank}</div>
            </div>
          )}
          {account.attention && (
            <div>
              <div className="text-xs text-yellow-600 font-medium">⚠️ Attention</div>
              <div className="text-sm text-yellow-700 whitespace-pre-wrap">{account.attention}</div>
            </div>
          )}
        </div>
      );
    }

    // PayPal
    if (account.payment_method === 'paypal') {
      return (
        <div className="space-y-3">
          <div>
            <div className="text-xs text-gray-400">PayPal Email</div>
            <div className="font-medium">{account.paypal_email || '-'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">验证状态</div>
            <div className="font-medium">
              {account.is_verified ? (
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle size={14} /> 已验证
                </span>
              ) : (
                <span className="text-yellow-600 flex items-center gap-1">
                  <AlertCircle size={14} /> 未验证
                </span>
              )}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Supported Currencies</div>
            <div className="font-medium">{account.currency?.join(', ') || '-'}</div>
          </div>
        </div>
      );
    }

    // 微信支付 / 支付宝（扫码支付）
    if (account.payment_method === 'wechat' || account.payment_method === 'alipay') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <div className="text-xs text-gray-400">收款户名</div>
              <div className="font-medium">{account.account_holder || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">账号标识</div>
              <div className="font-medium">{account.account_identifier || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Supported Currencies</div>
              <div className="font-medium">{account.currency?.join(', ') || '-'}</div>
            </div>
            {account.remark && (
              <div>
                <div className="text-xs text-gray-400">备注</div>
                <div className="font-medium">{account.remark}</div>
              </div>
            )}
          </div>
          <div className="flex flex-col items-center justify-start">
            <QRCodeImage 
              imageUrl={account.qr_code_image}
              noQrText="暂无二维码"
              scanToPayText="扫码付款"
            />
          </div>
        </div>
      );
    }

    return null;
  };

  // 渲染TT银行账号列表
  const renderTTAccountList = () => {
    const groupedByType = getTTAccountsByType();
    const typeKeys: AccountType[] = ['global', 'local', 'domestic'];
    
    return (
      <div className="space-y-2">
        {typeKeys.map((type) => {
          const accountsOfType = groupedByType[type] || [];
          if (accountsOfType.length === 0) return null;
          
          const config = ACCOUNT_TYPE_CONFIG[type];
          const isExpanded = expandedTypes.has(type);
          
          return (
            <div key={type} className="border border-gray-100 rounded-lg overflow-hidden">
              <div
                onClick={() => toggleTypeExpand(type)}
                className="flex items-center justify-between px-3 py-2 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">{config.icon}</span>
                  <span className="text-sm font-medium text-gray-700">{config.label}</span>
                  <span className="text-xs text-gray-400">({accountsOfType.length})</span>
                </div>
                <ChevronRight 
                  size={16} 
                  className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                />
              </div>
              
              {isExpanded && (
                <div className="p-1 space-y-0.5">
                  {accountsOfType.map((account) => {
                    const isSelected = multiple 
                      ? selectedIds.has(account.id)
                      : selectedAccountId === account.id;
                    const isDefault = account.is_default;
                    const displayName = getMethodDisplayName(account);
                    const isMaxSelected = multiple && selectedIds.size >= maxSelect && !selectedIds.has(account.id);
                    
                    return (
                      <div
                        key={account.id}
                        onClick={() => toggleSelectAccount(account)}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-blue-50 border border-blue-200' 
                            : 'hover:bg-gray-50 border border-transparent'
                        } ${isMaxSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {multiple && (
                          <div className="flex-shrink-0">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                              isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                            }`}>
                              {isSelected && <Check size={12} className="text-white" />}
                            </div>
                          </div>
                        )}
                        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                          {renderAccountLogo(account)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-sm truncate">{displayName}</span>
                            {isDefault && (
                              <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded flex-shrink-0">
                                默认
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight size={14} className={`text-gray-400 transition-transform ${isSelected ? 'text-blue-500' : ''}`} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // 渲染非TT银行账号列表
  const renderSimpleAccountList = () => {
    const list = groupedAccounts[activeTab] || [];
    
    return (
      <div className="space-y-1">
        {list.map((account) => {
          const isSelected = multiple 
            ? selectedIds.has(account.id)
            : selectedAccountId === account.id;
          const isDefault = account.is_default;
          const displayName = getMethodDisplayName(account);
          const isMaxSelected = multiple && selectedIds.size >= maxSelect && !selectedIds.has(account.id);
          
          return (
            <div
              key={account.id}
              onClick={() => toggleSelectAccount(account)}
              className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all ${
                isSelected 
                  ? 'bg-blue-50 border border-blue-200 shadow-sm' 
                  : 'hover:bg-gray-50 border border-transparent'
              } ${isMaxSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {multiple && (
                <div className="flex-shrink-0">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                    isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                  }`}>
                    {isSelected && <Check size={12} className="text-white" />}
                  </div>
                </div>
              )}
              <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                {renderAccountLogo(account)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-sm truncate">{displayName}</span>
                  {isDefault && (
                    <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded flex-shrink-0">
                      默认
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {account.is_verified && account.payment_method === 'paypal' && (
                  <span className="text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded">✓</span>
                )}
                <ChevronRight size={14} className={`text-gray-400 transition-transform ${isSelected ? 'text-blue-500' : ''}`} />
              </div>
            </div>
          );
        })}
        
        {list.length === 0 && (
          <div className="text-center py-4 text-gray-400 text-sm">
            暂无 {PAYMENT_TYPE_CONFIG[activeTab].label} 账号
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={24} className="animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">加载收款账号...</span>
      </div>
    );
  }

  if (!hasAvailableAccounts) {
    return (
      <div className="text-center py-8 text-gray-400">
        <div className="text-4xl mb-2">🏦</div>
        <p>暂无收款账号</p>
        <p className="text-sm mt-1">请先在"收款账号管理"中配置</p>
      </div>
    );
  }

  const selectedAccountsList = getSelectedAccountsList();

  return (
    <div className="space-y-4">
      {/* 多选提示 */}
      {multiple && (
        <div className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
          selectedIds.size > 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center gap-2 text-sm">
            <Info size={16} className={`flex-shrink-0 ${selectedIds.size > 0 ? 'text-blue-700' : 'text-gray-500'}`} />
            <span className={selectedIds.size > 0 ? 'text-blue-700' : 'text-gray-600'}>
              已选择 <strong>{selectedIds.size}</strong> / {maxSelect} 个收款账号
            </span>
            <span className={`text-xs ${selectedIds.size > 0 ? 'text-blue-500' : 'text-gray-400'} ml-1`}>
              （建议最多选择 {maxSelect} 种付款方式）
            </span>
          </div>
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelectedIds(new Set());
                if (onAccountsChange) onAccountsChange([]);
              }}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              清空选择
            </button>
          )}
        </div>
      )}

      {/* 选项卡 */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['bank_transfer', 'qr_code', 'online_payment'] as const).map((type) => {
          const list = groupedAccounts[type];
          if (list.length === 0) return null;
          const config = PAYMENT_TYPE_CONFIG[type];
          const isActive = activeTab === type;
          
          return (
            <button
              key={type}
              onClick={() => setActiveTab(type)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                isActive 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="text-blue-600">{config.icon}</span>
              <span>{config.label}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
              }`}>
                {list.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* 当前选项卡内容 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 左侧：账号列表 */}
        <div className="md:col-span-1 border-r border-gray-100 pr-4">
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">
            {activeTab === 'bank_transfer' ? '选择账号类型' : '选择账号'}
          </div>
          {activeTab === 'bank_transfer' ? renderTTAccountList() : renderSimpleAccountList()}
        </div>

        {/* 右侧：账号详情 */}
        <div className="md:col-span-2">
          {selectedAccountsList.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-2xl mb-2">👈</div>
              <p>请从左侧选择收款账号</p>
              {multiple && (
                <p className="text-xs mt-1">建议最多选择 {maxSelect} 种付款方式</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {selectedAccountsList.map((account, index) => (
                <div key={account.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {selectedAccountsList.length > 1 && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          #{index + 1}
                        </span>
                      )}
                      {/* ✅ 使用统一的大 Logo 渲染 */}
                      {renderLargeAccountLogo(account)}
                      <div>
                        <span className="font-semibold">{getMethodDisplayName(account)}</span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded ml-2">
                          {getAccountBadge(account)}
                        </span>
                        {account.is_default && (
                          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded ml-1">默认</span>
                        )}
                      </div>
                    </div>
                    {multiple && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectAccount(account);
                        }}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <span className="text-sm">✕</span>
                      </button>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    {renderAccountDetails(account)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}