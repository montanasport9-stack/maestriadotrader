import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  BarChart3, 
  Brain, 
  LogOut, 
  TrendingUp, 
  TrendingDown,
  Target,
  Zap,
  ShieldAlert,
  Calendar,
  Clock,
  User as UserIcon,
  ChevronRight,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { cn, formatCurrency, formatPercent } from './lib/utils';
import { Trade, User, Metrics } from './types';
import { generateTradeInsights } from './services/geminiService';

// --- Components ---

const Card = ({ children, className, title }: { children: React.ReactNode; className?: string; title?: string }) => (
  <div className={cn("bg-card-dark border border-border-dark rounded-xl p-6 shadow-sm", className)}>
    {title && <h3 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">{title}</h3>}
    {children}
  </div>
);

const StatCard = ({ title, value, subValue, trend, icon: Icon }: { title: string; value: string; subValue?: string; trend?: 'up' | 'down' | 'neutral'; icon: any }) => (
  <Card className="flex flex-col justify-between">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
        <h2 className="text-2xl font-bold mt-1">{value}</h2>
        {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
      </div>
      <div className="p-2 bg-gray-800/50 rounded-lg">
        <Icon size={20} className="text-brand-primary" />
      </div>
    </div>
    {trend && (
      <div className={cn(
        "mt-4 text-xs font-medium flex items-center gap-1",
        trend === 'up' ? "text-emerald-500" : trend === 'down' ? "text-red-500" : "text-gray-400"
      )}>
        {trend === 'up' ? <TrendingUp size={12} /> : trend === 'down' ? <TrendingDown size={12} /> : null}
        {trend === 'up' ? 'Vantagem Matemática' : trend === 'down' ? 'Expectativa Negativa' : ''}
      </div>
    )}
  </Card>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [activeTab, setActiveTab] = useState<'trades' | 'dashboard' | 'setups' | 'emotional'>('dashboard');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<string>("");
  const [showTradeForm, setShowTradeForm] = useState(false);

  // Auth State
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (token) {
      fetchTrades();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchTrades = async () => {
    try {
      const res = await fetch('/api/trades', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTrades(data);
        const aiInsights = await generateTradeInsights(data);
        setInsights(aiInsights);
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
    } else {
      alert(data.error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setTrades([]);
  };

  const calculateMetrics = (trades: Trade[]): Metrics => {
    const totalTrades = trades.length;
    if (totalTrades === 0) return {
      totalTrades: 0, winRate: 0, avgGain: 0, avgLoss: 0, payoff: 0, totalProfit: 0, avgR: 0, maxConsecutiveLoss: 0, maxConsecutiveGain: 0, expectancy: 0
    };

    const gains = trades.filter(t => t.result_cash > 0);
    const losses = trades.filter(t => t.result_cash <= 0);
    const winRate = gains.length / totalTrades;
    const avgGain = gains.length > 0 ? gains.reduce((acc, t) => acc + t.result_cash, 0) / gains.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((acc, t) => acc + t.result_cash, 0) / losses.length) : 0;
    const payoff = avgLoss > 0 ? avgGain / avgLoss : 0;
    const totalProfit = trades.reduce((acc, t) => acc + t.result_cash, 0);
    const avgR = trades.reduce((acc, t) => acc + t.result_r, 0) / totalTrades;
    const expectancy = (winRate * avgGain) - ((1 - winRate) * avgLoss);

    let maxGainStreak = 0;
    let currentGainStreak = 0;
    let maxLossStreak = 0;
    let currentLossStreak = 0;

    [...trades].reverse().forEach(t => {
      if (t.result_cash > 0) {
        currentGainStreak++;
        currentLossStreak = 0;
        maxGainStreak = Math.max(maxGainStreak, currentGainStreak);
      } else {
        currentLossStreak++;
        currentGainStreak = 0;
        maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
      }
    });

    return {
      totalTrades, winRate, avgGain, avgLoss, payoff, totalProfit, avgR, maxConsecutiveLoss: maxLossStreak, maxConsecutiveGain: maxGainStreak, expectancy
    };
  };

  const metrics = calculateMetrics(trades);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-bg-dark">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-card-dark border border-border-dark rounded-2xl p-8 shadow-2xl"
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-3 bg-brand-primary/10 rounded-xl mb-4">
              <Zap className="text-brand-primary" size={32} />
            </div>
            <h1 className="text-3xl font-bold font-display">Maestria do Trader</h1>
            <p className="text-gray-400 mt-2">Sua performance levada ao próximo nível</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
              <input 
                type="email" 
                required
                className="w-full bg-bg-dark border border-border-dark rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Senha</label>
              <input 
                type="password" 
                required
                className="w-full bg-bg-dark border border-border-dark rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-brand-primary hover:bg-emerald-600 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-brand-primary/20 mt-4"
            >
              {authMode === 'login' ? 'Entrar' : 'Criar Conta'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              {authMode === 'login' ? 'Não tem conta? Registre-se' : 'Já tem conta? Faça login'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-bg-dark">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border-dark flex flex-col fixed h-full bg-card-dark z-20">
        <div className="p-6 flex items-center gap-3 border-b border-border-dark">
          <div className="p-1.5 bg-brand-primary rounded-lg">
            <Zap size={20} className="text-white" />
          </div>
          <span className="font-bold text-lg font-display tracking-tight">Maestria</span>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <SidebarItem 
            icon={LayoutDashboard} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          <SidebarItem 
            icon={PlusCircle} 
            label="Diário de Trades" 
            active={activeTab === 'trades'} 
            onClick={() => setActiveTab('trades')} 
          />
          <SidebarItem 
            icon={BarChart3} 
            label="Análise por Setup" 
            active={activeTab === 'setups'} 
            onClick={() => setActiveTab('setups')} 
          />
          <SidebarItem 
            icon={Brain} 
            label="Controle Emocional" 
            active={activeTab === 'emotional'} 
            onClick={() => setActiveTab('emotional')} 
          />
        </nav>

        <div className="p-4 border-t border-border-dark">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-bg-dark/50 mb-4">
            <div className="w-8 h-8 rounded-full bg-brand-secondary flex items-center justify-center text-xs font-bold">
              {email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{email}</p>
              <p className="text-[10px] text-brand-primary font-bold uppercase tracking-wider">Plano Pro</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-red-500/10 rounded-lg transition-all"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold font-display">
              {activeTab === 'dashboard' && 'Visão Geral'}
              {activeTab === 'trades' && 'Diário de Trades'}
              {activeTab === 'setups' && 'Performance por Estratégia'}
              {activeTab === 'emotional' && 'Inteligência Emocional'}
            </h1>
            <p className="text-gray-400 text-sm">Bem-vindo de volta, trader.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-card-dark border border-border-dark rounded-lg text-sm">
              <Calendar size={16} className="text-gray-500" />
              <span>{new Date().toLocaleDateString('pt-BR')}</span>
            </div>
            {activeTab === 'trades' && (
              <button 
                onClick={() => setShowTradeForm(true)}
                className="flex items-center gap-2 bg-brand-primary hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-lg shadow-brand-primary/20"
              >
                <PlusCircle size={18} />
                Novo Trade
              </button>
            )}
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total de Trades" value={metrics.totalTrades.toString()} icon={Target} />
                <StatCard title="Win Rate" value={formatPercent(metrics.winRate)} icon={Zap} />
                <StatCard title="Lucro Total" value={formatCurrency(metrics.totalProfit)} icon={TrendingUp} />
                <StatCard title="Expectativa Matemática" value={formatCurrency(metrics.expectancy)} trend={metrics.expectancy > 0 ? 'up' : 'down'} icon={ShieldAlert} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Capital Curve */}
                <Card className="lg:col-span-2" title="Curva de Capital">
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={getCapitalCurveData(trades)}>
                        <defs>
                          <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                        <XAxis dataKey="name" stroke="#525252" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#525252" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$ ${v}`} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#141414', border: '1px solid #262626', borderRadius: '8px' }}
                          itemStyle={{ color: '#10b981' }}
                        />
                        <Area type="monotone" dataKey="balance" stroke="#10b981" fillOpacity={1} fill="url(#colorProfit)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* AI Insights */}
                <Card title="Insights Inteligentes (AI)">
                  <div className="space-y-4">
                    <div className="p-4 bg-brand-primary/5 border border-brand-primary/20 rounded-xl">
                      <div className="flex items-center gap-2 text-brand-primary mb-2">
                        <Brain size={18} />
                        <span className="text-xs font-bold uppercase tracking-wider">Análise do Mentor</span>
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed italic">
                        "{insights || "Analisando seus padrões operacionais..."}"
                      </p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Média de R por trade</span>
                        <span className="font-bold text-brand-primary">{metrics.avgR.toFixed(2)}R</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Payoff</span>
                        <span className="font-bold text-brand-secondary">{metrics.payoff.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Maior Sequência Gain</span>
                        <span className="font-bold text-emerald-500">{metrics.maxConsecutiveGain}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Maior Sequência Loss</span>
                        <span className="font-bold text-red-500">{metrics.maxConsecutiveLoss}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <Card title="Performance Mensal">
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getMonthlyPerformance(trades)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                          <XAxis dataKey="month" stroke="#525252" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#525252" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip 
                            cursor={{ fill: '#262626' }}
                            contentStyle={{ backgroundColor: '#141414', border: '1px solid #262626', borderRadius: '8px' }}
                          />
                          <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                            {getMonthlyPerformance(trades).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#10b981' : '#ef4444'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                 </Card>
                 <Card title="Distribuição de R">
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getRDistribution(trades)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                          <XAxis dataKey="range" stroke="#525252" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#525252" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip 
                            cursor={{ fill: '#262626' }}
                            contentStyle={{ backgroundColor: '#141414', border: '1px solid #262626', borderRadius: '8px' }}
                          />
                          <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                 </Card>
              </div>
            </motion.div>
          )}

          {activeTab === 'trades' && (
            <motion.div 
              key="trades"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-bg-dark/50 border-b border-border-dark">
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Data</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Ativo</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Direção</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Resultado R$</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Resultado R</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Setup</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Disciplina</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-dark">
                      {trades.map((trade) => (
                        <tr key={trade.id} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-6 py-4 text-sm whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Calendar size={14} className="text-gray-500" />
                              {new Date(trade.date).toLocaleDateString('pt-BR')}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-bold">{trade.asset}</td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
                              trade.direction === 'Compra' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                            )}>
                              {trade.direction}
                            </span>
                          </td>
                          <td className={cn(
                            "px-6 py-4 text-sm font-bold",
                            trade.result_cash >= 0 ? "text-emerald-500" : "text-red-500"
                          )}>
                            {formatCurrency(trade.result_cash)}
                          </td>
                          <td className="px-6 py-4 text-sm font-mono">{trade.result_r.toFixed(2)}R</td>
                          <td className="px-6 py-4 text-sm text-gray-400">{trade.setup}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                <div 
                                  className={cn(
                                    "h-full rounded-full",
                                    trade.discipline_note >= 8 ? "bg-emerald-500" : trade.discipline_note >= 5 ? "bg-yellow-500" : "bg-red-500"
                                  )}
                                  style={{ width: `${trade.discipline_note * 10}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold">{trade.discipline_note}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <button 
                              onClick={async () => {
                                if (confirm('Excluir este trade?')) {
                                  await fetch(`/api/trades/${trade.id}`, { 
                                    method: 'DELETE',
                                    headers: { 'Authorization': `Bearer ${token}` }
                                  });
                                  fetchTrades();
                                }
                              }}
                              className="p-2 text-gray-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.div>
          )}

          {activeTab === 'setups' && (
             <motion.div 
              key="setups"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Win Rate por Setup">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getSetupPerformance(trades)}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="winRate"
                          nameKey="setup"
                        >
                          {getSetupPerformance(trades).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#141414', border: '1px solid #262626', borderRadius: '8px' }}
                          formatter={(v: number) => formatPercent(v)}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
                <Card title="Lucro por Setup">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getSetupPerformance(trades)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={false} />
                        <XAxis type="number" stroke="#525252" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis dataKey="setup" type="category" stroke="#525252" fontSize={12} tickLine={false} axisLine={false} width={100} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#141414', border: '1px solid #262626', borderRadius: '8px' }}
                        />
                        <Bar dataKey="totalProfit" fill="#10b981" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>

              <Card className="p-0 overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-bg-dark/50 border-b border-border-dark">
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Setup</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Trades</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Win Rate</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Lucro Total</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Melhor Horário</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-dark">
                    {getSetupPerformance(trades).map((s) => (
                      <tr key={s.setup} className="hover:bg-white/[0.02]">
                        <td className="px-6 py-4 text-sm font-bold">{s.setup}</td>
                        <td className="px-6 py-4 text-sm">{s.count}</td>
                        <td className="px-6 py-4 text-sm font-bold text-brand-primary">{formatPercent(s.winRate)}</td>
                        <td className={cn("px-6 py-4 text-sm font-bold", s.totalProfit >= 0 ? "text-emerald-500" : "text-red-500")}>
                          {formatCurrency(s.totalProfit)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">{s.bestTime}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </motion.div>
          )}

          {activeTab === 'emotional' && (
            <motion.div 
              key="emotional"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-red-500/5 border-red-500/20">
                  <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-1">Trades Impulsivos</p>
                  <h2 className="text-3xl font-bold">{trades.filter(t => !t.is_planned).length}</h2>
                  <p className="text-xs text-gray-500 mt-2">Total perdido: {formatCurrency(trades.filter(t => !t.is_planned).reduce((acc, t) => acc + t.result_cash, 0))}</p>
                </Card>
                <Card className="bg-emerald-500/5 border-emerald-500/20">
                  <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1">Trades no Plano</p>
                  <h2 className="text-3xl font-bold">{trades.filter(t => t.is_planned).length}</h2>
                  <p className="text-xs text-gray-500 mt-2">Win Rate: {formatPercent(trades.filter(t => t.is_planned).length > 0 ? trades.filter(t => t.is_planned && t.result_cash > 0).length / trades.filter(t => t.is_planned).length : 0)}</p>
                </Card>
                <Card>
                  <p className="text-xs font-bold text-brand-secondary uppercase tracking-wider mb-1">Média de Disciplina</p>
                  <h2 className="text-3xl font-bold">{(trades.reduce((acc, t) => acc + t.discipline_note, 0) / (trades.length || 1)).toFixed(1)}</h2>
                  <p className="text-xs text-gray-500 mt-2">Escala de 0 a 10</p>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Performance: Disciplinado vs Impulsivo">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: 'Disciplinado', profit: trades.filter(t => t.followed_plan).reduce((acc, t) => acc + t.result_cash, 0) },
                        { name: 'Impulsivo', profit: trades.filter(t => !t.followed_plan).reduce((acc, t) => acc + t.result_cash, 0) }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                        <XAxis dataKey="name" stroke="#525252" />
                        <YAxis stroke="#525252" />
                        <Tooltip contentStyle={{ backgroundColor: '#141414', border: '1px solid #262626' }} />
                        <Bar dataKey="profit">
                          <Cell fill="#10b981" />
                          <Cell fill="#ef4444" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
                <Card title="Emoções Pre-Trade">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getEmotionData(trades)}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {getEmotionData(trades).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#10b981', '#f59e0b', '#ef4444'][index % 3]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Trade Form Modal */}
      <AnimatePresence>
        {showTradeForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTradeForm(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-card-dark border border-border-dark rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-border-dark flex justify-between items-center bg-bg-dark/50">
                <h2 className="text-xl font-bold font-display">Registrar Novo Trade</h2>
                <button onClick={() => setShowTradeForm(false)} className="text-gray-500 hover:text-white transition-colors">
                  <PlusCircle size={24} className="rotate-45" />
                </button>
              </div>
              
              <div className="p-8 overflow-y-auto flex-1">
                <TradeForm onSuccess={() => { setShowTradeForm(false); fetchTrades(); }} token={token!} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Helper Components & Functions ---

function SidebarItem({ icon: Icon, label, active, onClick }: { icon: any; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
        active 
          ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20" 
          : "text-gray-400 hover:text-white hover:bg-white/5"
      )}
    >
      <Icon size={20} />
      {label}
    </button>
  );
}

function TradeForm({ onSuccess, token }: { onSuccess: () => void; token: string }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    asset: 'WIN',
    type: 'Day Trade',
    direction: 'Compra',
    entry_time: '09:00',
    entry_price: 0,
    stop_loss: 0,
    take_profit: 0,
    exit_time: '09:15',
    exit_price: 0,
    risk_amount: 100,
    lot: 1,
    setup: 'Pullback',
    market_condition: 'Tendência',
    is_planned: true,
    emotion: 'Confiante',
    followed_plan: true,
    discipline_note: 10,
    what_did_right: '',
    what_did_wrong: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/trades', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    });
    if (res.ok) onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Identificação */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-brand-primary uppercase tracking-widest border-b border-border-dark pb-2">Identificação</h3>
          <div className="space-y-3">
            <FormGroup label="Data">
              <input type="date" className="input-field" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            </FormGroup>
            <FormGroup label="Ativo">
              <select className="input-field" value={formData.asset} onChange={e => setFormData({...formData, asset: e.target.value})}>
                <option>WIN</option>
                <option>WDO</option>
                <option>Ações</option>
                <option>Crypto</option>
                <option>Forex</option>
              </select>
            </FormGroup>
            <FormGroup label="Direção">
              <div className="flex gap-2">
                {['Compra', 'Venda'].map(d => (
                  <button 
                    key={d}
                    type="button"
                    onClick={() => setFormData({...formData, direction: d as any})}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-xs font-bold border transition-all",
                      formData.direction === d 
                        ? (d === 'Compra' ? "bg-emerald-500 border-emerald-500 text-white" : "bg-red-500 border-red-500 text-white")
                        : "border-border-dark text-gray-500 hover:border-gray-600"
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </FormGroup>
          </div>
        </div>

        {/* Entrada e Saída */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-brand-secondary uppercase tracking-widest border-b border-border-dark pb-2">Execução</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormGroup label="Entrada">
                <input type="number" step="0.01" className="input-field" value={formData.entry_price} onChange={e => setFormData({...formData, entry_price: Number(e.target.value)})} />
              </FormGroup>
              <FormGroup label="Saída">
                <input type="number" step="0.01" className="input-field" value={formData.exit_price} onChange={e => setFormData({...formData, exit_price: Number(e.target.value)})} />
              </FormGroup>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormGroup label="Stop Loss">
                <input type="number" step="0.01" className="input-field" value={formData.stop_loss} onChange={e => setFormData({...formData, stop_loss: Number(e.target.value)})} />
              </FormGroup>
              <FormGroup label="Alvo">
                <input type="number" step="0.01" className="input-field" value={formData.take_profit} onChange={e => setFormData({...formData, take_profit: Number(e.target.value)})} />
              </FormGroup>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormGroup label="Risco R$">
                <input type="number" className="input-field" value={formData.risk_amount} onChange={e => setFormData({...formData, risk_amount: Number(e.target.value)})} />
              </FormGroup>
              <FormGroup label="Lote">
                <input type="number" className="input-field" value={formData.lot} onChange={e => setFormData({...formData, lot: Number(e.target.value)})} />
              </FormGroup>
            </div>
          </div>
        </div>

        {/* Estratégia e Psicologia */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-purple-500 uppercase tracking-widest border-b border-border-dark pb-2">Mentalidade</h3>
          <div className="space-y-3">
            <FormGroup label="Setup">
              <select className="input-field" value={formData.setup} onChange={e => setFormData({...formData, setup: e.target.value})}>
                <option>Pullback</option>
                <option>Rompimento</option>
                <option>Exaustão</option>
                <option>Vwap</option>
                <option>Reversão</option>
              </select>
            </FormGroup>
            <FormGroup label="Emoção">
              <select className="input-field" value={formData.emotion} onChange={e => setFormData({...formData, emotion: e.target.value})}>
                <option>Confiante</option>
                <option>Ansioso</option>
                <option>Com Medo</option>
                <option>Eufórico</option>
              </select>
            </FormGroup>
            <FormGroup label={`Disciplina: ${formData.discipline_note}`}>
              <input 
                type="range" min="0" max="10" 
                className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-brand-primary" 
                value={formData.discipline_note} 
                onChange={e => setFormData({...formData, discipline_note: Number(e.target.value)})} 
              />
            </FormGroup>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormGroup label="O que fez certo?">
          <textarea className="input-field min-h-[80px]" value={formData.what_did_right} onChange={e => setFormData({...formData, what_did_right: e.target.value})} />
        </FormGroup>
        <FormGroup label="O que fez errado?">
          <textarea className="input-field min-h-[80px]" value={formData.what_did_wrong} onChange={e => setFormData({...formData, what_did_wrong: e.target.value})} />
        </FormGroup>
      </div>

      <div className="flex justify-end gap-4 pt-4 border-t border-border-dark">
        <button type="button" onClick={onSuccess} className="px-6 py-2.5 text-sm font-medium text-gray-400 hover:text-white transition-colors">Cancelar</button>
        <button type="submit" className="px-8 py-2.5 bg-brand-primary hover:bg-emerald-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-brand-primary/20">Salvar Trade</button>
      </div>
    </form>
  );
}

function FormGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">{label}</label>
      {children}
    </div>
  );
}

// --- Data Transformers ---

function getCapitalCurveData(trades: Trade[]) {
  let balance = 0;
  return [...trades].reverse().map((t, i) => {
    balance += t.result_cash;
    return { name: `T${i + 1}`, balance };
  });
}

function getMonthlyPerformance(trades: Trade[]) {
  const months: Record<string, number> = {};
  trades.forEach(t => {
    const month = new Date(t.date).toLocaleString('pt-BR', { month: 'short' });
    months[month] = (months[month] || 0) + t.result_cash;
  });
  return Object.entries(months).map(([month, profit]) => ({ month, profit }));
}

function getRDistribution(trades: Trade[]) {
  const ranges = ['<-2R', '-2R to -1R', '-1R to 0R', '0R to 1R', '1R to 2R', '>2R'];
  const counts = [0, 0, 0, 0, 0, 0];
  trades.forEach(t => {
    const r = t.result_r;
    if (r < -2) counts[0]++;
    else if (r < -1) counts[1]++;
    else if (r < 0) counts[2]++;
    else if (r < 1) counts[3]++;
    else if (r < 2) counts[4]++;
    else counts[5]++;
  });
  return ranges.map((range, i) => ({ range, count: counts[i] }));
}

function getSetupPerformance(trades: Trade[]) {
  const setups: Record<string, { count: number; wins: number; totalProfit: number; times: string[] }> = {};
  trades.forEach(t => {
    if (!setups[t.setup]) setups[t.setup] = { count: 0, wins: 0, totalProfit: 0, times: [] };
    setups[t.setup].count++;
    if (t.result_cash > 0) setups[t.setup].wins++;
    setups[t.setup].totalProfit += t.result_cash;
    setups[t.setup].times.push(t.entry_time);
  });

  return Object.entries(setups).map(([setup, data]) => ({
    setup,
    count: data.count,
    winRate: data.wins / data.count,
    totalProfit: data.totalProfit,
    bestTime: data.times[0] // Simplified
  })).sort((a, b) => b.totalProfit - a.totalProfit);
}

function getEmotionData(trades: Trade[]) {
  const emotions: Record<string, number> = {};
  trades.forEach(t => {
    emotions[t.emotion] = (emotions[t.emotion] || 0) + 1;
  });
  return Object.entries(emotions).map(([name, value]) => ({ name, value }));
}
