import React, { useState, useMemo, useRef } from 'react';
// Import html2canvas and jspdf to fix 'Cannot find name' and 'Property does not exist on window' errors
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { MarketParams, InterventionParams, Scenario, TradeScale } from './types';
import { calculateWelfare } from './services/welfareCalculator';
import WelfareChart from './components/WelfareChart';
import WelfareTable from './components/WelfareTable';
import ControlPanel from './components/ControlPanel';

const INITIAL_MARKET: MarketParams = {
  demandIntercept: 100,
  demandSlope: 1,
  supplyIntercept: 20,
  supplySlope: 1
};

const App: React.FC = () => {
  const [market, setMarket] = useState<MarketParams>(INITIAL_MARKET);
  // Default to Market Equilibrium (NONE) to showcase CS/PS clearly first
  const [intervention, setIntervention] = useState<InterventionParams>({
    scenario: Scenario.NONE,
    value: 10,
    worldPrice: 40,
    quotaVolume: 15,
    tradeScale: TradeScale.SMALL
  });

  const reportRef = useRef<HTMLDivElement>(null);

  // 动态计算比较基准 (Baseline)
  // 1. 对于国内干预 (税收、管制) 或 垄断，基准是 "封闭市场均衡 (Autarky/Perfect Comp)"
  // 2. 对于自由贸易 (Free Trade)，基准是 "封闭市场 (Autarky)"，以展示贸易利得
  // 3. 对于贸易干预 (关税、配额、补贴)，基准必须是 "自由贸易 (Free Trade)"，以展示干预导致的扭曲成本
  const baselineSnapshot = useMemo(() => {
    let baselineScenario = Scenario.NONE;

    const isTradeIntervention = [
      Scenario.TARIFF, 
      Scenario.QUOTA, 
      Scenario.EXPORT_SUBSIDY
    ].includes(intervention.scenario);

    if (isTradeIntervention) {
      baselineScenario = Scenario.FREE_TRADE;
    }

    return calculateWelfare(market, { 
      ...intervention, 
      scenario: baselineScenario,
      value: 0, // Reset intervention value for baseline (e.g., 0 tariff)
      quotaVolume: 0 
    });
  }, [market, intervention]);

  const currentSnapshot = useMemo(() => 
    calculateWelfare(market, intervention), 
    [market, intervention]
  );

  const netWelfareChange = currentSnapshot.totalWelfare - baselineSnapshot.totalWelfare;

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Economic-Analysis-${intervention.scenario}.pdf`);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-24 text-slate-900 selection:bg-indigo-100 selection:text-indigo-700">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 py-4 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-8 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-200">∑</div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-800">EcoWelfare <span className="text-indigo-600">Lab</span></h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">高级微观经济学仿真实验平台</p>
            </div>
          </div>
          <div className="flex gap-4">
             <Badge label="模型设定" value={intervention.tradeScale === TradeScale.LARGE ? '大国模型 (Large)' : '小国模型 (Small)'} />
             <Badge label="当前场景" value={intervention.scenario.split('(')[0]} />
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-8 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* 左侧控制栏 - 占 3/12 */}
        <div className="lg:col-span-3 sticky top-24">
          <ControlPanel 
            market={market} 
            setMarket={setMarket} 
            intervention={intervention} 
            setIntervention={setIntervention} 
            equilibriumPrice={baselineSnapshot.anchors.pE} // Note: anchors.pE is constant regardless of baseline scenario
            onDownload={handleDownloadPDF}
            snapshot={currentSnapshot}
            netWelfareChange={netWelfareChange}
          />
        </div>

        {/* 右侧展示区 - 占 9/12 */}
        <div className="lg:col-span-9 space-y-8" ref={reportRef}>
          <WelfareChart 
            market={market} 
            intervention={intervention} 
            snapshot={currentSnapshot} 
            baseline={baselineSnapshot}
          />
          <div className="pb-10">
            <WelfareTable baseline={baselineSnapshot} snapshot={currentSnapshot} scenario={intervention.scenario} />
          </div>
        </div>
      </main>
    </div>
  );
};

const Badge = ({ label, value }: any) => (
  <div className="flex flex-col items-end px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</span>
    <span className="text-sm font-bold text-slate-700">{value}</span>
  </div>
);

export default App;