export interface User {
  id: number;
  email: string;
  is_pro: boolean;
}

export interface Trade {
  id: number;
  user_id: number;
  date: string;
  asset: string;
  type: string;
  direction: 'Compra' | 'Venda';
  entry_time: string;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  exit_time: string;
  exit_price: number;
  risk_amount: number;
  lot: number;
  result_cash: number;
  result_r: number;
  setup: string;
  market_condition: string;
  is_planned: boolean;
  emotion: string;
  followed_plan: boolean;
  discipline_note: number;
  what_did_right: string;
  what_did_wrong: string;
}

export interface Metrics {
  totalTrades: number;
  winRate: number;
  avgGain: number;
  avgLoss: number;
  payoff: number;
  totalProfit: number;
  avgR: number;
  maxConsecutiveLoss: number;
  maxConsecutiveGain: number;
  expectancy: number;
}
