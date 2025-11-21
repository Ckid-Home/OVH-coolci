import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/utils/apiClient';
import { toast } from 'sonner';
import { 
  Server, 
  RefreshCw, 
  Power, 
  PowerOff, 
  Play, 
  Pause,
  Settings,
  Info,
  HardDrive,
  Network,
  Activity,
  AlertCircle,
  Cpu,
  MemoryStick,
  Globe,
  Shield,
  Zap,
  Monitor,
  Terminal,
  Download,
  Upload,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  ExternalLink,
  Calendar,
  TrendingUp,
  ChevronRight,
  MoreVertical,
  Eye,
  EyeOff,
  BarChart3,
  Lock,
  CreditCard,
  Database,
  FileText,
  ArrowLeft
} from 'lucide-react';
import { useAPI } from '@/context/APIContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';

/**
 * VPS控制台页面 - 全新设计
 * 参考现代云服务管理界面，采用更优雅的设计风格
 */

interface VPSInfo {
  serviceName: string;
  displayName?: string;
  name?: string;
  state?: 'running' | 'stopped' | 'stopping' | 'starting' | 'rebooting' | 'unknown';
  model?: string;
  datacenter?: string;
  datacenterCode?: string;
  memory?: number;
  cpu?: number;
  disk?: number;
  ip?: string;
  netbootMode?: string;
  osType?: string;
  status?: string;
  creation?: string;
  expiration?: string;
  error?: string;
}

interface VPSDetails extends VPSInfo {
  ipv4?: string[];
  ipv6?: string[];
  monitoring?: boolean;
  snapshotCount?: number;
  renewalType?: boolean;
  traffic?: {
    used?: number;
    total?: number;
    resetDate?: string;
  };
}

const VPSConsolePage = () => {
  const isMobile = useIsMobile();
  const { isAuthenticated } = useAPI();
  const [vpsList, setVpsList] = useState<VPSInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVPS, setSelectedVPS] = useState<string | null>(null);
  const [vpsDetails, setVpsDetails] = useState<Record<string, VPSDetails>>({});
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // 获取状态中文名称
  const getStateText = (state?: string) => {
    const stateMap: Record<string, string> = {
      'running': '运行中',
      'stopped': '已停止',
      'stopping': '正在停止',
      'starting': '正在启动',
      'rebooting': '正在重启',
      'unknown': '未知状态'
    };
    return stateMap[state || 'unknown'] || '未知状态';
  };

  // 获取状态颜色
  const getStateColor = (state?: string) => {
    switch (state) {
      case 'running':
        return 'bg-green-500/20 text-green-400 border-green-500/40';
      case 'stopped':
        return 'bg-red-500/20 text-red-400 border-red-500/40';
      case 'stopping':
      case 'starting':
      case 'rebooting':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/40';
    }
  };

  // 获取状态图标
  const getStateIcon = (state?: string) => {
    switch (state) {
      case 'running':
        return <CheckCircle2 size={14} className="text-green-400" />;
      case 'stopped':
        return <XCircle size={14} className="text-red-400" />;
      case 'stopping':
      case 'starting':
      case 'rebooting':
        return <Loader2 size={14} className="text-yellow-400 animate-spin" />;
      default:
        return <AlertCircle size={14} className="text-gray-400" />;
    }
  };

  // 格式化日期
  const formatDate = (dateString?: string) => {
    if (!dateString) return '未知';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  // 复制到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('已复制到剪贴板');
    }).catch(() => {
      toast.error('复制失败');
    });
  };

  // 加载VPS列表
  const loadVPSList = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('正在请求VPS列表: /vps-console/list');
      const response = await api.get('/vps-console/list');
      console.log('VPS列表响应:', response.data);
      if (response.data.success) {
        const vpsData = response.data.data || [];
        setVpsList(vpsData);
        setLastRefresh(new Date());
        // 如果有VPS且当前没有选中，自动选择第一个
        if (vpsData.length > 0 && !selectedVPS) {
          const firstVPS = vpsData[0].serviceName;
          setSelectedVPS(firstVPS);
          // 详情会在useEffect中自动加载
        }
        if (vpsData.length > 0) {
          toast.success(`成功加载 ${response.data.total} 个VPS实例`);
        }
      } else {
        throw new Error(response.data.error || '加载失败');
      }
    } catch (error: any) {
      console.error('加载VPS列表失败:', error);
      console.error('错误详情:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        fullURL: `${error.config?.baseURL}${error.config?.url}`
      });
      const errorMsg = error.response?.data?.error || error.message || '加载VPS列表失败';
      if (error.response?.status === 404) {
        toast.error('API路由不存在，请检查后端服务是否已重启');
      } else {
        toast.error(errorMsg);
      }
      setVpsList([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 加载VPS详情
  const loadVPSDetails = useCallback(async (serviceName: string, forceRefresh = false) => {
    // 检查缓存（除非强制刷新）
    if (!forceRefresh) {
      const cached = vpsDetails[serviceName];
      if (cached && cached._cachedAt) {
        const cachedTime = new Date(cached._cachedAt).getTime();
        const now = Date.now();
        if (now - cachedTime < 5 * 60 * 1000) {
          return; // 使用缓存，不重新加载
        }
      }
    }

    setIsLoadingDetails(true);
    try {
      const response = await api.get(`/vps-console/${serviceName}`);
      if (response.data.success) {
        setVpsDetails(prev => ({
          ...prev,
          [serviceName]: {
            ...response.data.data,
            _cachedAt: new Date().toISOString()
          }
        }));
      } else {
        throw new Error(response.data.error || '加载详情失败');
      }
    } catch (error: any) {
      console.error('加载VPS详情失败:', error);
      const errorMsg = error.response?.data?.error || error.message || '加载VPS详情失败';
      toast.error(errorMsg);
    } finally {
      setIsLoadingDetails(false);
    }
  }, [vpsDetails]);

  // 选择VPS
  const handleSelectVPS = (serviceName: string) => {
    setSelectedVPS(serviceName);
    setActiveTab('overview');
    // 详情会在useEffect中自动加载
  };

  // 刷新详情
  const handleRefreshDetails = () => {
    if (selectedVPS) {
      loadVPSDetails(selectedVPS, true); // 强制刷新
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadVPSList();
    }
  }, [isAuthenticated]);

  // 当选中VPS变化时，加载详情
  useEffect(() => {
    if (selectedVPS && isAuthenticated) {
      loadVPSDetails(selectedVPS, false);
    }
  }, [selectedVPS, isAuthenticated, loadVPSDetails]);

  const selectedDetails = selectedVPS ? vpsDetails[selectedVPS] : null;
  const runningCount = vpsList.filter(v => v.state === 'running').length;
  const stoppedCount = vpsList.filter(v => v.state === 'stopped').length;

  // 如果没有选中VPS，显示列表视图
  if (!selectedVPS && vpsList.length > 0) {
    return (
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 cyber-glow-text">VPS 控制台</h1>
            <p className="text-cyber-muted text-sm">管理您的 OVH VPS 实例</p>
          </div>
          <Button onClick={loadVPSList} disabled={isLoading} variant="outline">
            <RefreshCw size={16} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="cyber-panel border-cyber-accent/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-cyber-muted mb-1">总 VPS 数</p>
                  <p className="text-2xl font-bold text-cyber-accent">{vpsList.length}</p>
                </div>
                <Server className="text-cyber-accent" size={32} />
              </div>
            </CardContent>
          </Card>
          <Card className="cyber-panel border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-cyber-muted mb-1">运行中</p>
                  <p className="text-2xl font-bold text-green-400">{runningCount}</p>
                </div>
                <CheckCircle2 className="text-green-400" size={32} />
              </div>
            </CardContent>
          </Card>
          <Card className="cyber-panel border-red-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-cyber-muted mb-1">已停止</p>
                  <p className="text-2xl font-bold text-red-400">{stoppedCount}</p>
                </div>
                <XCircle className="text-red-400" size={32} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* VPS列表 */}
        <Card className="cyber-panel border-cyber-accent/20">
          <CardHeader>
            <CardTitle>VPS 实例列表</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vpsList.map((vps) => (
                <motion.div
                  key={vps.serviceName}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="group relative p-4 rounded-xl border border-cyber-accent/20 hover:border-cyber-accent/40 bg-cyber-grid/5 hover:bg-cyber-accent/5 cursor-pointer transition-all"
                  onClick={() => handleSelectVPS(vps.serviceName)}
                >
                  <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-xl ${
                    vps.state === 'running' ? 'bg-green-500' :
                    vps.state === 'stopped' ? 'bg-red-500' :
                    'bg-yellow-500'
                  }`} />
                  <div className="flex items-start justify-between mb-3 mt-2">
                    <div className="flex items-center gap-2">
                      <Server size={20} className="text-cyber-accent" />
                      <h3 className="font-semibold text-cyber-text">
                        {vps.displayName || vps.name || vps.serviceName}
                      </h3>
                    </div>
                    <Badge variant="outline" className={getStateColor(vps.state)}>
                      {getStateIcon(vps.state)}
                      <span className="ml-1 text-xs">{getStateText(vps.state)}</span>
                    </Badge>
                  </div>
                  <p className="text-xs text-cyber-muted font-mono mb-3">{vps.serviceName}</p>
                  <div className="flex flex-wrap gap-2">
                    {vps.model && vps.model !== 'N/A' && (
                      <Badge variant="outline" className="text-xs">{vps.model}</Badge>
                    )}
                    {vps.cpu && vps.cpu > 0 && (
                      <Badge variant="outline" className="text-xs">{vps.cpu}核</Badge>
                    )}
                    {vps.memory && vps.memory > 0 && (
                      <Badge variant="outline" className="text-xs">{vps.memory}GB</Badge>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 如果有选中VPS，显示详情视图
  return (
    <div className="space-y-6">
      {/* 面包屑导航 */}
      <div className="flex items-center gap-2 text-sm text-cyber-muted">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedVPS(null)}
          className="h-auto p-0"
        >
          <ArrowLeft size={16} className="mr-1" />
          VPS 列表
        </Button>
        <ChevronRight size={16} />
        <span className="text-cyber-text">
          {selectedDetails?.displayName || selectedDetails?.name || selectedVPS}
        </span>
      </div>

      {/* 服务器概览卡片 */}
      <Card className="cyber-panel border-cyber-accent/20 overflow-hidden">
        <div className={`h-2 ${
          selectedDetails?.state === 'running' ? 'bg-gradient-to-r from-green-500 to-green-400' :
          selectedDetails?.state === 'stopped' ? 'bg-gradient-to-r from-red-500 to-red-400' :
          'bg-gradient-to-r from-yellow-500 to-yellow-400'
        }`} />
        <CardContent className="p-6">
          {/* 服务器标识 */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-cyber-text">
                  {selectedDetails?.displayName || selectedDetails?.name || selectedVPS}
                </h1>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(selectedVPS || '')}
                  className="h-6 w-6 p-0"
                >
                  <Copy size={14} />
                </Button>
              </div>
              <p className="text-sm text-cyber-muted font-mono">{selectedVPS}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${
                selectedDetails?.state === 'running' ? 'bg-green-500/20' :
                selectedDetails?.state === 'stopped' ? 'bg-red-500/20' :
                'bg-yellow-500/20'
              }`}>
                <Server size={24} className={
                  selectedDetails?.state === 'running' ? 'text-green-400' :
                  selectedDetails?.state === 'stopped' ? 'text-red-400' :
                  'text-yellow-400'
                } />
              </div>
              <Badge variant="outline" className={getStateColor(selectedDetails?.state)}>
                {getStateIcon(selectedDetails?.state)}
                <span className="ml-1.5">{getStateText(selectedDetails?.state)}</span>
              </Badge>
            </div>
          </div>

          {/* 操作按钮组 */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Button
              variant="outline"
              className="border-red-500/40 text-red-400 hover:bg-red-500/10"
              onClick={() => toast.info('关机功能待实现')}
            >
              <PowerOff size={16} className="mr-2" />
              关机
            </Button>
            <Button
              variant="outline"
              className="border-blue-500/40 text-blue-400 hover:bg-blue-500/10"
              onClick={() => toast.info('重启功能待实现')}
            >
              <RefreshCw size={16} className="mr-2" />
              重启
            </Button>
            <Button
              variant="outline"
              className="border-blue-500/40 text-blue-400 hover:bg-blue-500/10"
              onClick={() => toast.info('VNC功能待实现')}
            >
              <Monitor size={16} className="mr-2" />
              VNC
            </Button>
            <Button
              variant="outline"
              className="border-blue-500/40 text-blue-400 hover:bg-blue-500/10"
              onClick={() => toast.info('续费功能待实现')}
            >
              <CreditCard size={16} className="mr-2" />
              续费
            </Button>
            <Button
              variant="outline"
              className="border-cyber-accent/40 text-cyber-accent hover:bg-cyber-accent/10"
            >
              <MoreVertical size={16} className="mr-2" />
              更多
            </Button>
          </div>

          {/* 服务器规格信息 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-cyber-grid/10 rounded-lg border border-cyber-accent/10">
              <div className="flex items-center gap-2 mb-1">
                <Globe size={14} className="text-blue-400" />
                <span className="text-xs text-cyber-muted">地区线路</span>
              </div>
              <p className="text-sm font-semibold text-cyber-text">
                {selectedDetails?.datacenter || '未知'}
              </p>
            </div>
            <div className="p-3 bg-cyber-grid/10 rounded-lg border border-cyber-accent/10">
              <div className="flex items-center gap-2 mb-1">
                <Network size={14} className="text-green-400" />
                <span className="text-xs text-cyber-muted">IP 地址</span>
              </div>
              <div className="flex items-center gap-1">
                <p className="text-sm font-semibold text-cyber-text">
                  {selectedDetails?.ipv4?.[0] || selectedDetails?.ip || '未知'}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0"
                  onClick={() => copyToClipboard(selectedDetails?.ipv4?.[0] || selectedDetails?.ip || '')}
                >
                  <Copy size={12} />
                </Button>
              </div>
            </div>
            <div className="p-3 bg-cyber-grid/10 rounded-lg border border-cyber-accent/10">
              <div className="flex items-center gap-2 mb-1">
                <Cpu size={14} className="text-purple-400" />
                <span className="text-xs text-cyber-muted">计算资源</span>
              </div>
              <p className="text-sm font-semibold text-cyber-text">
                {selectedDetails?.cpu || 0}核 / {selectedDetails?.memory || 0} GB
              </p>
            </div>
            <div className="p-3 bg-cyber-grid/10 rounded-lg border border-cyber-accent/10">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard size={14} className="text-yellow-400" />
                <span className="text-xs text-cyber-muted">计费状态</span>
              </div>
              <p className="text-sm font-semibold text-green-400">已开通</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 标签页导航 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
          <TabsTrigger value="overview">概要</TabsTrigger>
          <TabsTrigger value="monitoring">监控</TabsTrigger>
          <TabsTrigger value="access">访问控制</TabsTrigger>
          <TabsTrigger value="disk">硬盘</TabsTrigger>
          <TabsTrigger value="network">网络与安全</TabsTrigger>
          <TabsTrigger value="backup">备份与快照</TabsTrigger>
          <TabsTrigger value="billing">计费</TabsTrigger>
          <TabsTrigger value="logs">日志</TabsTrigger>
        </TabsList>

        {/* 概要标签页 */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 流量面板 */}
            <Card className="cyber-panel border-cyber-accent/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp size={18} className="text-cyber-accent" />
                    流量
                  </CardTitle>
                  <ChevronRight size={16} className="text-cyber-muted" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-cyber-muted">已用流量</span>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <RefreshCw size={12} />
                    </Button>
                  </div>
                  <Progress value={10} className="h-2 mb-2" />
                  <p className="text-sm text-cyber-text">
                    {selectedDetails?.traffic?.used || 0} GB ({Math.round(((selectedDetails?.traffic?.used || 0) / (selectedDetails?.traffic?.total || 1)) * 100)}%)
                  </p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-cyber-muted">总流量</span>
                    <span className="text-cyber-text font-medium">{selectedDetails?.traffic?.total || 0} GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyber-muted">剩余流量</span>
                    <span className="text-cyber-text font-medium">
                      {(selectedDetails?.traffic?.total || 0) - (selectedDetails?.traffic?.used || 0)} GB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyber-muted">重置时间</span>
                    <span className="text-cyber-text font-medium">
                      {selectedDetails?.traffic?.resetDate ? formatDate(selectedDetails.traffic.resetDate) : '未知'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 访问面板 */}
            <Card className="cyber-panel border-cyber-accent/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Terminal size={18} className="text-cyber-accent" />
                    访问
                  </CardTitle>
                  <ChevronRight size={16} className="text-cyber-muted" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-cyber-grid/10 rounded-lg">
                  <div className="p-2 bg-blue-500/20 rounded">
                    <Server size={24} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-cyber-text">
                      {selectedDetails?.osType || 'Linux'}
                    </p>
                    <p className="text-xs text-cyber-muted">操作系统</p>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-cyber-muted">IP 地址</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={() => copyToClipboard(selectedDetails?.ipv4?.[0] || '')}
                      >
                        <Copy size={12} />
                      </Button>
                    </div>
                    <p className="text-cyber-text font-mono font-medium">
                      {selectedDetails?.ipv4?.[0] || '未知'}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-cyber-muted">用户名</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={() => copyToClipboard('root')}
                      >
                        <Copy size={12} />
                      </Button>
                    </div>
                    <p className="text-cyber-text font-mono font-medium">root</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-cyber-muted">密码</span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={() => copyToClipboard('********')}
                        >
                          <Copy size={12} />
                        </Button>
                      </div>
                    </div>
                    <p className="text-cyber-text font-mono font-medium">
                      {showPassword ? 'your-password' : '********'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 计费面板 */}
            <Card className="cyber-panel border-cyber-accent/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard size={18} className="text-cyber-accent" />
                    计费
                  </CardTitle>
                  <ChevronRight size={16} className="text-cyber-muted" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-cyber-muted">计费方式</span>
                    <p className="text-cyber-text font-medium mt-1">按流量配额计费</p>
                  </div>
                  <div>
                    <span className="text-cyber-muted">计费状态</span>
                    <p className="text-green-400 font-medium mt-1">已开通</p>
                  </div>
                  <div>
                    <span className="text-cyber-muted">续费金额</span>
                    <p className="text-cyber-text font-medium mt-1">¥9.90</p>
                  </div>
                  <div>
                    <span className="text-cyber-muted">到期时间</span>
                    <p className="text-cyber-text font-medium mt-1">
                      {selectedDetails?.expiration ? formatDate(selectedDetails.expiration) : '未知'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-cyber-accent/10">
                    <span className="text-cyber-muted">自动续费</span>
                    <Switch checked={selectedDetails?.renewalType || false} />
                  </div>
                </div>
                <Button className="w-full bg-cyber-accent/20 hover:bg-cyber-accent/30 text-cyber-accent border-cyber-accent/40">
                  <CreditCard size={16} className="mr-2" />
                  ¥ 续费
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 其他标签页占位 */}
        <TabsContent value="monitoring" className="mt-4">
          <Card className="cyber-panel border-cyber-accent/20">
            <CardContent className="p-8 text-center">
              <BarChart3 size={48} className="mx-auto mb-4 text-cyber-muted opacity-50" />
              <p className="text-cyber-muted">监控功能开发中...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access" className="mt-4">
          <Card className="cyber-panel border-cyber-accent/20">
            <CardContent className="p-8 text-center">
              <Lock size={48} className="mx-auto mb-4 text-cyber-muted opacity-50" />
              <p className="text-cyber-muted">访问控制功能开发中...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disk" className="mt-4">
          <Card className="cyber-panel border-cyber-accent/20">
            <CardContent className="p-8 text-center">
              <HardDrive size={48} className="mx-auto mb-4 text-cyber-muted opacity-50" />
              <p className="text-cyber-muted">硬盘管理功能开发中...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="network" className="mt-4">
          <Card className="cyber-panel border-cyber-accent/20">
            <CardContent className="p-8 text-center">
              <Network size={48} className="mx-auto mb-4 text-cyber-muted opacity-50" />
              <p className="text-cyber-muted">网络与安全功能开发中...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup" className="mt-4">
          <Card className="cyber-panel border-cyber-accent/20">
            <CardContent className="p-8 text-center">
              <Database size={48} className="mx-auto mb-4 text-cyber-muted opacity-50" />
              <p className="text-cyber-muted">备份与快照功能开发中...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="mt-4">
          <Card className="cyber-panel border-cyber-accent/20">
            <CardContent className="p-8 text-center">
              <CreditCard size={48} className="mx-auto mb-4 text-cyber-muted opacity-50" />
              <p className="text-cyber-muted">计费详情功能开发中...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card className="cyber-panel border-cyber-accent/20">
            <CardContent className="p-8 text-center">
              <FileText size={48} className="mx-auto mb-4 text-cyber-muted opacity-50" />
              <p className="text-cyber-muted">日志功能开发中...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VPSConsolePage;

