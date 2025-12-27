
import React from 'react';
import { MarketParams, InterventionParams, Scenario, TradeScale, WelfareSnapshot } from '../types';

interface ControlPanelProps {
  market: MarketParams;
  setMarket: (m: MarketParams) => void;
  intervention: InterventionParams;
  setIntervention: (i: InterventionParams) => void;
  equilibriumPrice: number; // Receive equilibrium price to calculate max tariff
  onDownload: () => void;
  // New props for the embedded dashboard
  snapshot: WelfareSnapshot;
  netWelfareChange: number;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ 
  market, 
  setMarket, 
  intervention, 
  setIntervention, 
  equilibriumPrice, 
  onDownload,
  snapshot,
  netWelfareChange
}) => {
  const handleMarketChange = (field: keyof MarketParams, value: string) => {
    const val = parseFloat(value);
    if (!isNaN(val)) setMarket({ ...market, [field]: val });
  };

  const handleInterventionChange = (field: keyof InterventionParams, value: any) => {
    let updatedIntervention = { ...intervention, [field]: value };

    // 如果切换到非关税且非出口补贴场景，强制重置为小国模型
    if (field === 'scenario' && value !== Scenario.TARIFF && value !== Scenario.EXPORT_SUBSIDY) {
      updatedIntervention.tradeScale = TradeScale.SMALL;
    }

    // 出口补贴场景：默认设为小国，但允许用户切换
    if (field === 'scenario' && value === Scenario.EXPORT_SUBSIDY) {
      // 自动调整世界价格以确保是出口状态 (Pw > Pe)
      if (updatedIntervention.worldPrice <= equilibriumPrice) {
        updatedIntervention.worldPrice = equilibriumPrice + 15;
      }
    }

    // 针对进口配额模式的特殊逻辑：世界价格不应超过国内封闭均衡价格
    if (field === 'scenario' && value === Scenario.QUOTA) {
      if (updatedIntervention.worldPrice >= equilibriumPrice) {
        updatedIntervention.worldPrice = Math.max(0, equilibriumPrice - 5);
      }
    }

    // 针对进口关税模式的特殊逻辑：
    // 1. 世界价格不应超过国内封闭均衡价格 (否则是出口)
    // 2. 世界价格不应低于供给截距 (否则国内供给为0且无意义)
    if (field === 'scenario' && value === Scenario.TARIFF) {
      // 上限修正
      if (updatedIntervention.worldPrice >= equilibriumPrice) {
        updatedIntervention.worldPrice = Math.max(market.supplyIntercept, equilibriumPrice - 10);
      }
      // 下限修正
      if (updatedIntervention.worldPrice < market.supplyIntercept) {
        updatedIntervention.worldPrice = market.supplyIntercept + 5;
      }
    }

    setIntervention(updatedIntervention);
  };

  const maxTariff = Math.max(0, equilibriumPrice - intervention.worldPrice);

  const isTariff = intervention.scenario === Scenario.TARIFF;
  const isQuota = intervention.scenario === Scenario.QUOTA;
  const isExportSubsidy = intervention.scenario === Scenario.EXPORT_SUBSIDY;

  return (
    <div className="space-y-6">
      
      {/* 
          SECTION 1: 经济政策干预 (Economic Policy Intervention) 
          PRIORITY: TOP
          Reason: Primary user interaction point.
      */}
      <section className="p-6 bg-white rounded-2xl border border-indigo-100 shadow-lg shadow-indigo-100/50 relative overflow-hidden">
        {/* 装饰性背景 */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-50 rounded-bl-full -z-0 opacity-50"></div>
        
        <h3 className="text-xs font-black text-indigo-600 uppercase mb-5 relative z-10 flex items-center gap-2">
           <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse"></span> 
           经济政策干预控制台
        </h3>
        
        <div className="space-y-6 relative z-10">
          <select 
            value={intervention.scenario}
            onChange={(e) => handleInterventionChange('scenario', e.target.value)}
            className="w-full px-4 py-3 border border-indigo-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none bg-white text-sm font-bold text-slate-700 transition-all cursor-pointer hover:border-indigo-300 shadow-sm"
          >
            {Object.values(Scenario).map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* 大国/小国模型切换 */}
          {(isTariff || isExportSubsidy) && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Trade Model Scale</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(TradeScale).map(ts => (
                  <button
                    key={ts}
                    onClick={() => handleInterventionChange('tradeScale', ts)}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                      intervention.tradeScale === ts 
                      ? 'bg-white border-indigo-200 text-indigo-700 shadow-sm ring-1 ring-indigo-50' 
                      : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-200/50'
                    }`}
                  >
                    {ts === TradeScale.SMALL ? '小国模型 (Price Taker)' : '大国模型 (Market Power)'}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="space-y-6 pt-2">
            {intervention.scenario === Scenario.TAX && (
              <Slider label="税收强度 (Tax)" value={intervention.value} min={0} max={50} onChange={(v) => handleInterventionChange('value', v)} />
            )}

            {isTariff && (
              <Slider 
                label="进口关税强度 (Tariff)" 
                value={intervention.value > maxTariff ? maxTariff : intervention.value} 
                min={0} 
                max={maxTariff} 
                onChange={(v) => handleInterventionChange('value', v)} 
              />
            )}

            {isExportSubsidy && (
              <Slider label="出口补贴强度 (Subsidy)" value={intervention.value} min={0} max={40} onChange={(v) => handleInterventionChange('value', v)} />
            )}

            {[Scenario.FREE_TRADE, Scenario.TARIFF, Scenario.QUOTA, Scenario.EXPORT_SUBSIDY].includes(intervention.scenario) && (
              <Slider 
                label="国际价格 (Pw)" 
                value={intervention.worldPrice} 
                min={isTariff ? market.supplyIntercept : 0} 
                max={(isQuota || isTariff) ? equilibriumPrice : 100} 
                onChange={(v) => handleInterventionChange('worldPrice', v)} 
              />
            )}

            {intervention.scenario === Scenario.QUOTA && (
              <Slider label="进口配额量 (Quota)" value={intervention.quotaVolume} min={0} max={80} onChange={(v) => handleInterventionChange('quotaVolume', v)} />
            )}
            
            {[Scenario.CEILING, Scenario.FLOOR].includes(intervention.scenario) && (
              <Slider label="管制价格 (Price Control)" value={intervention.value} min={0} max={100} onChange={(v) => handleInterventionChange('value', v)} />
            )}
          </div>
        </div>
      </section>

      {/* 
          SECTION 2: 国民福利核心看板 (National Welfare Dashboard)
          PRIORITY: SECOND
          Reason: Immediate feedback loop. User changes slider -> sees impact here.
      */}
      <section className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-5 pb-3 border-b border-slate-100 flex items-center justify-between">
          <span>国民福利核心看板</span>
          <span className={`w-2 h-2 rounded-full ${netWelfareChange >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
        </h4>
        <div className="space-y-5">
           <ImpactRow label="总福利变动 (Total Δ)" value={netWelfareChange} color={netWelfareChange >= -0.01 ? 'text-emerald-500' : 'text-rose-500'} />
           <ImpactRow label="无谓损失 (DWL)" value={-snapshot.deadweightLoss} color="text-rose-500" />
           {snapshot.termsOfTradeGain! > 0.1 && (
             <ImpactRow label="贸易条件增益 (ToT)" value={snapshot.termsOfTradeGain} color="text-amber-500" />
           )}
        </div>
      </section>

      {/* 
          SECTION 3: 市场参数编辑 (Market Parameters)
          PRIORITY: THIRD
          Reason: Secondary setting, used less frequently.
      */}
      <section className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm group hover:border-indigo-200 transition-colors">
        <h3 className="text-xs font-black text-slate-400 uppercase mb-5 flex items-center gap-2 group-hover:text-indigo-500 transition-colors">
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
           供需曲线参数设定
        </h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-5">
          <ParamInput label="需求截距 (a)" value={market.demandIntercept} onChange={(v) => handleMarketChange('demandIntercept', v)} />
          <ParamInput label="需求斜率 (b)" value={market.demandSlope} onChange={(v) => handleMarketChange('demandSlope', v)} />
          <ParamInput label="供给截距 (c)" value={market.supplyIntercept} onChange={(v) => handleMarketChange('supplyIntercept', v)} />
          <ParamInput label="供给斜率 (d)" value={market.supplySlope} onChange={(v) => handleMarketChange('supplySlope', v)} />
        </div>
      </section>

      {/* 
          SECTION 4: 数学公式展示区 (Market Functions)
          PRIORITY: BOTTOM
          Reason: Informational only.
      */}
      <section className="p-6 bg-white rounded-2xl shadow-sm border border-slate-200 opacity-80 hover:opacity-100 transition-opacity">
        <div className="flex justify-between items-center mb-4">
           <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Model Equations</h3>
        </div>
        <div className="space-y-2.5 font-mono text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
          <p className="text-slate-600 flex justify-between items-center">
            <span className="text-red-500 font-bold uppercase mr-2">Demand</span> 
            <span className="font-semibold text-slate-500">P = {market.demandIntercept} - {market.demandSlope}Q</span>
          </p>
          <p className="text-slate-600 flex justify-between items-center">
            <span className="text-blue-500 font-bold uppercase mr-2">Supply</span>
            <span className="font-semibold text-slate-500">P = {market.supplyIntercept} + {market.supplySlope}Q</span>
          </p>
        </div>
      </section>

      <button 
        onClick={onDownload}
        className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-slate-200 transition-all flex items-center justify-center gap-2 group mt-2"
      >
        <svg className="w-5 h-5 transition-transform group-hover:-translate-y-0.5 text-slate-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
        下载分析报告 (PDF)
      </button>
    </div>
  );
};

const ImpactRow = ({ label, value, color }: any) => (
  <div className="flex justify-between items-center group">
    <span className="text-xs font-bold text-slate-500 uppercase group-hover:text-slate-700 transition-colors">{label}</span>
    <span className={`text-2xl font-black ${color} tabular-nums`}>
      {Math.abs(value) < 0.01 ? '0.0' : `${value > 0 ? '+' : ''}${value.toFixed(1)}`}
    </span>
  </div>
);

const ParamInput = ({ label, value, onChange }: any) => (
  <div className="space-y-2">
    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{label}</label>
    <input 
      type="number" 
      step="0.1"
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
      className="w-full px-3 py-2 text-sm font-bold border border-slate-200 bg-slate-50 rounded-lg outline-none focus:border-indigo-400 focus:bg-white transition-all text-slate-700"
    />
  </div>
);

const Slider = ({ label, value, min, max, onChange }: any) => (
  <div className="space-y-3">
    <div className="flex justify-between items-center text-xs font-bold uppercase text-slate-500">
      <span>{label}</span>
      <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 font-mono text-sm">
        {typeof value === 'number' ? value.toFixed(1) : value}
      </span>
    </div>
    <input 
      type="range" 
      min={min} 
      max={max} 
      step="0.5" 
      value={value} 
      onChange={(e) => onChange(parseFloat(e.target.value))} 
      className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-full appearance-none cursor-pointer hover:bg-slate-300 transition-colors" 
    />
  </div>
);

export default ControlPanel;
