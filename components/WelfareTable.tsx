
import React from 'react';
import { WelfareSnapshot, Scenario } from '../types';

interface WelfareTableProps {
  baseline: WelfareSnapshot;
  snapshot: WelfareSnapshot;
  scenario: Scenario;
}

const WelfareTable: React.FC<WelfareTableProps> = ({ baseline, snapshot, scenario }) => {
  const format = (val: number) => val.toFixed(2);
  const formatPercent = (val: number, total: number) => {
    if (total === 0) return '0%';
    return `${((val / total) * 100).toFixed(1)}%`;
  };

  const formatChange = (current: number, base: number) => {
    const diff = current - base;
    const sign = diff > 0.01 ? '+' : (diff < -0.01 ? '' : '');
    const color = diff > 0.01 ? 'text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md' : (diff < -0.01 ? 'text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md' : 'text-slate-400');
    return <span className={`font-black text-sm ${color}`}>{sign}{format(diff)}</span>;
  };

  const isAutarky = scenario === Scenario.NONE;
  const isMonopoly = scenario === Scenario.MONOPOLY;
  const isFreeTrade = scenario === Scenario.FREE_TRADE;
  const isExportSubsidy = scenario === Scenario.EXPORT_SUBSIDY;
  const isTariffOrQuota = scenario === Scenario.TARIFF || scenario === Scenario.QUOTA;
  const isLargeCountry = (isExportSubsidy || isTariffOrQuota) && snapshot.termsOfTradeGain && Math.abs(snapshot.termsOfTradeGain) > 0.01;

  // Check if we have distortion data
  const hasDistortionData = (snapshot.productionDistortion || 0) > 0.01 || (snapshot.consumptionDistortion || 0) > 0.01;

  const isImport = snapshot.consumerPrice < baseline.consumerPrice;
  const isExport = snapshot.consumerPrice > baseline.consumerPrice;

  // Calculate total net change for the footer
  const netWelfareChange = snapshot.totalWelfare - baseline.totalWelfare;
  const isPositiveChange = netWelfareChange >= -0.01;

  // Dynamic Labels based on Scenario
  let headerTitle = "经济福利对比分析";
  let subHeaderTitle = `福利分布与政策效应 (${scenario})`;
  let colBaseTitle = "基准状态 (Autarky)";
  let colScenarioTitle = "干预后状态";

  if (isMonopoly) {
    headerTitle = "市场结构效率分析";
    subHeaderTitle = "效率比较 (EFFICIENCY COMPARISON)";
    colBaseTitle = "完全竞争市场 (Perfect Competition)";
    colScenarioTitle = "垄断市场 (Monopoly)";
  } else if (isFreeTrade) {
    headerTitle = "贸易体制福利对比";
    subHeaderTitle = isExport ? "开放经济 - 出口效应 (EXPORT REGIME)" : "开放经济 - 进口效应 (IMPORT REGIME)";
    colBaseTitle = "封闭经济 (Autarky)";
    colScenarioTitle = "自由贸易 (Free Trade)";
  } else if (isTariffOrQuota || isExportSubsidy) {
    headerTitle = "贸易干预代价分析";
    subHeaderTitle = "政策扭曲效应 (DISTORTION ANALYSIS)";
    colBaseTitle = "自由贸易 (Free Trade)";
    
    // 动态设置具体政策列名，替换笼统的“干预政策”
    if (scenario === Scenario.TARIFF) {
      colScenarioTitle = "关税实施 (With Tariff)";
    } else if (scenario === Scenario.QUOTA) {
      colScenarioTitle = "配额实施 (With Quota)";
    } else if (scenario === Scenario.EXPORT_SUBSIDY) {
      colScenarioTitle = "补贴实施 (With Subsidy)";
    } else {
      colScenarioTitle = "政策干预 (With Policy)";
    }
  }

  // --- 场景 1: Autarky (无干预) - 结构分析视图 ---
  if (isAutarky) {
    return (
      <div className="mt-10 bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="bg-white px-8 py-8 flex justify-between items-end border-b border-slate-100">
          <div>
            <h3 className="text-slate-800 font-black text-xl uppercase tracking-widest">市场均衡福利结构</h3>
            <p className="text-xs text-indigo-500 font-bold uppercase mt-2 tracking-widest">
              福利分配比例 (No Intervention)
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-400 font-black uppercase mb-1">当前社会总福利 (已最大化)</p>
            <div className="flex items-center gap-3 justify-end">
               <span className="text-4xl font-black tracking-tight text-slate-800">
                 ${format(snapshot.totalWelfare)}
               </span>
            </div>
          </div>
        </div>
        
        <table className="w-full text-left table-fixed">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100 text-xs font-black text-slate-500 uppercase tracking-wider">
              <th className="px-6 py-5 w-1/3">福利主体 (Welfare Agent)</th>
              <th className="px-6 py-5 w-1/3">均衡数值 (Equilibrium Value)</th>
              <th className="px-6 py-5 w-1/3 text-right">福利占比 (Share)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-sm font-medium">
            <tr className="hover:bg-slate-50/80 transition-colors group">
              <td className="px-6 py-6 font-bold text-slate-700 text-base group-hover:text-indigo-700 transition-colors">消费者剩余 (CS)</td>
              <td className="px-6 py-6">
                <div className="font-black text-slate-800 text-base">${format(snapshot.consumerSurplus)}</div>
              </td>
              <td className="px-6 py-6 text-right">
                <div className="inline-block bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
                  {formatPercent(snapshot.consumerSurplus, snapshot.totalWelfare)}
                </div>
              </td>
            </tr>
            <tr className="hover:bg-slate-50/80 transition-colors group">
              <td className="px-6 py-6 font-bold text-slate-700 text-base group-hover:text-indigo-700 transition-colors">生产者剩余 (PS)</td>
              <td className="px-6 py-6">
                <div className="font-black text-slate-800 text-base">${format(snapshot.producerSurplus)}</div>
              </td>
              <td className="px-6 py-6 text-right">
                <div className="inline-block bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
                  {formatPercent(snapshot.producerSurplus, snapshot.totalWelfare)}
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 border-t border-slate-100 text-slate-800">
              <td className="px-6 py-8 font-black uppercase text-sm tracking-widest text-slate-500">总福利 (Total Surplus)</td>
              <td className="px-6 py-8">
                <div className="font-black text-2xl text-slate-900">${format(snapshot.totalWelfare)}</div>
              </td>
              <td className="px-6 py-8 text-right font-bold text-emerald-600 text-sm">
                 100% (Pareto Efficient)
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  }

  // --- 场景 2: 有干预/垄断/自由贸易 - 比较静态分析视图 ---
  return (
    <div className="mt-10 bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
      <div className="bg-white px-8 py-8 flex justify-between items-end border-b border-slate-100">
        <div>
          <h3 className="text-slate-800 font-black text-xl uppercase tracking-widest">{headerTitle}</h3>
          <p className="text-xs text-indigo-500 font-bold uppercase mt-2 tracking-widest">
            {subHeaderTitle}
          </p>
        </div>
      </div>
      
      <table className="w-full text-left table-fixed">
        <thead>
          <tr className="bg-slate-50/80 border-b border-slate-100 text-xs font-black text-slate-500 uppercase tracking-wider">
            <th className="px-6 py-5 w-1/4">福利主体</th>
            <th className="px-6 py-5 w-1/4">{colBaseTitle}</th>
            <th className="px-6 py-5 w-1/4">{colScenarioTitle}</th>
            <th className="px-6 py-5 w-1/4 text-right">福利净变化</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 text-sm font-medium">
          <tr className="hover:bg-slate-50/80 transition-colors group">
            <td className="px-6 py-6 font-bold text-slate-700 text-base group-hover:text-indigo-700 transition-colors">消费者剩余 (CS)</td>
            <td className="px-6 py-6">
              <div className="font-bold text-slate-400 group-hover:text-slate-600 text-base">${format(baseline.consumerSurplus)}</div>
            </td>
            <td className="px-6 py-6">
              {isExportSubsidy && <div className="text-xs font-mono text-rose-500 mb-1 opacity-80">Loss: a + b</div>}
              {isTariffOrQuota && <div className="text-xs font-mono text-rose-500 mb-1 opacity-80">Loss: a + b + c + d</div>}
              <div className="font-black text-slate-800 text-base">${format(snapshot.consumerSurplus)}</div>
            </td>
            <td className="px-6 py-6 text-right">{formatChange(snapshot.consumerSurplus, baseline.consumerSurplus)}</td>
          </tr>
          <tr className="hover:bg-slate-50/80 transition-colors group">
            <td className="px-6 py-6 font-bold text-slate-700 text-base group-hover:text-indigo-700 transition-colors">生产者剩余 (PS)</td>
            <td className="px-6 py-6">
              <div className="font-bold text-slate-400 group-hover:text-slate-600 text-base">${format(baseline.producerSurplus)}</div>
            </td>
            <td className="px-6 py-6">
              {isExportSubsidy && <div className="text-xs font-mono text-emerald-500 mb-1 opacity-80">Gain: a + b + c</div>}
              {isTariffOrQuota && <div className="text-xs font-mono text-emerald-500 mb-1 opacity-80">Gain: a</div>}
              <div className="font-black text-slate-800 text-base">${format(snapshot.producerSurplus)}</div>
            </td>
            <td className="px-6 py-6 text-right">{formatChange(snapshot.producerSurplus, baseline.producerSurplus)}</td>
          </tr>
          
          {(isExportSubsidy || isTariffOrQuota || snapshot.governmentRevenue !== 0) && (
             <tr className="hover:bg-slate-50/80 transition-colors group">
               <td className="px-6 py-6 font-bold text-slate-700 text-base group-hover:text-indigo-700 transition-colors">政府/租金 (Gov/Rent)</td>
               <td className="px-6 py-6"><div className="font-bold text-slate-400 group-hover:text-slate-600 text-base">$0.00</div></td>
               <td className="px-6 py-6">
                 {isExportSubsidy && <div className="text-xs font-mono text-slate-400 mb-1 opacity-80">Cost: -({isLargeCountry ? 'b+c+d+e+f+g' : 'b+c+d'})</div>}
                 {isTariffOrQuota && <div className="text-xs font-mono text-emerald-500 mb-1 opacity-80">Gain: c {isLargeCountry ? '+ e' : ''}</div>}
                 <div className="font-black text-slate-800 text-base">${format(snapshot.governmentRevenue + (snapshot.termsOfTradeGain || 0))}</div>
               </td>
               <td className="px-6 py-6 text-right">{formatChange(snapshot.governmentRevenue + (snapshot.termsOfTradeGain || 0), 0)}</td>
             </tr>
          )}
        </tbody>
        
        {/* 主要统计 Footer */}
        <tfoot>
          <tr className="bg-slate-50 border-t border-slate-100 text-slate-800">
            <td className="px-6 py-8 font-black uppercase text-sm tracking-widest text-slate-500">总福利 (Total Surplus)</td>
            <td className="px-6 py-8">
              <div className="font-bold text-slate-400 text-lg">${format(baseline.totalWelfare)}</div>
            </td>
            <td className="px-6 py-8">
              <div className="font-black text-2xl text-slate-900">${format(snapshot.totalWelfare)}</div>
            </td>
            <td className="px-6 py-8 text-right">
               <div className="flex flex-col items-end gap-1">
                 <span className={`text-3xl font-black tracking-tight ${isPositiveChange ? 'text-emerald-500' : 'text-rose-500'}`}>
                   {netWelfareChange >= 0 ? '+' : ''}{format(netWelfareChange)}
                 </span>
                 {(isExportSubsidy || isTariffOrQuota) && (
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                     {isExportSubsidy ? (isLargeCountry ? 'Net: e - (b + d)' : 'Net: -(b + d)') : ''}
                     {isTariffOrQuota ? (isLargeCountry ? 'Net: e - (b + d)' : 'Net: -(b + d)') : ''}
                   </span>
                 )}
                 {isMonopoly && (
                   <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">
                     Deadweight Loss (DWL)
                   </span>
                 )}
                 {isFreeTrade && (
                   <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                     Gains from Trade
                   </span>
                 )}
               </div>
            </td>
          </tr>
          
          {/* 新增：效率损失分解 (Deadweight Loss Decomposition) - 仅当有数据时显示 */}
          {hasDistortionData && (
             <tr className="bg-rose-50/30 border-t border-slate-100">
               <td colSpan={4} className="p-0">
                 <div className="px-6 py-4 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <span className="text-xs font-black uppercase tracking-widest text-rose-800">无谓损失结构分解 (Efficiency Loss)</span>
                     <span className="text-[10px] px-2 py-0.5 bg-rose-100 text-rose-600 rounded-full font-bold">Total: -{format((snapshot.productionDistortion || 0) + (snapshot.consumptionDistortion || 0))}</span>
                   </div>
                   <div className="flex gap-8">
                     <div className="flex flex-col items-end">
                       <span className="text-[10px] uppercase font-bold text-slate-400">生产扭曲 (Production Distortion)</span>
                       <span className="text-sm font-black text-rose-600">-{format(snapshot.productionDistortion || 0)}</span>
                     </div>
                     <div className="flex flex-col items-end">
                       <span className="text-[10px] uppercase font-bold text-slate-400">消费扭曲 (Consumption Distortion)</span>
                       <span className="text-sm font-black text-rose-600">-{format(snapshot.consumptionDistortion || 0)}</span>
                     </div>
                   </div>
                 </div>
               </td>
             </tr>
          )}
        </tfoot>
      </table>
    </div>
  );
};

export default WelfareTable;
