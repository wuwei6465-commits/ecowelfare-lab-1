
import React, { useState } from 'react';
import { MarketParams, InterventionParams, WelfareSnapshot, Scenario, TradeScale } from '../types';
import { COLORS } from '../constants';

interface WelfareChartProps {
  market: MarketParams;
  intervention: InterventionParams;
  snapshot: WelfareSnapshot;
  baseline: WelfareSnapshot;
}

const WelfareChart: React.FC<WelfareChartProps> = ({ market, intervention, snapshot }) => {
  const { demandIntercept: a, demandSlope: b, supplyIntercept: c, supplySlope: d } = market;
  const { anchors } = snapshot;

  // Interaction State
  const [hoverInfo, setHoverInfo] = useState<{
    x: number;
    y: number;
    title: string;
    value?: number;
    color: string;
    desc?: string;
  } | null>(null);

  // Layout configuration
  const width = 800;
  const height = 500;
  const padding = 60;

  // Scale calculations
  const qE_real = (a - c) / (b + d);
  const maxQ = Math.max((a / b) * 1.1, qE_real * 1.5);
  const maxP = Math.max(a * 1.1, c + d * maxQ);

  const sx = (val: number) => padding + (val / maxQ) * (width - 2 * padding);
  const sy = (val: number) => height - padding - (val / maxP) * (height - 2 * padding);

  const poly = (points: number[][]) => points.map(p => `${sx(p[0])},${sy(p[1])}`).join(' ');

  // Helper: Interactive Props Generator
  const interact = (title: string, value: number | undefined, colorClass: string, desc: string = '') => ({
    onMouseMove: (e: React.MouseEvent) => {
      const container = e.currentTarget.closest('.chart-container');
      if (container) {
        const rect = container.getBoundingClientRect();
        setHoverInfo({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          title,
          value,
          color: colorClass, // Pass tailwind text color class
          desc
        });
      }
    },
    onMouseLeave: () => setHoverInfo(null),
    className: "welfare-area outline-none transition-opacity duration-200"
  });

  // Helper Component for dashed lines on the chart
  const DashedLine = ({ x, y, lx, ly, color="#94a3b8" }: { x: number; y: number; lx?: string; ly?: string; color?: string }) => (
    <g>
      <line x1={sx(x)} y1={sy(y)} x2={sx(x)} y2={sy(0)} stroke={color} strokeDasharray="4,4" />
      <line x1={sx(x)} y1={sy(y)} x2={sx(0)} y2={sy(y)} stroke={color} strokeDasharray="4,4" />
      {lx && <text x={sx(x)} y={sy(0) + 15} textAnchor="middle" className="text-xs font-bold fill-slate-500">{lx}</text>}
      {ly && <text x={sx(0) - 8} y={sy(y) + 4} textAnchor="end" className="text-xs font-bold fill-slate-500">{ly}</text>}
    </g>
  );

  // Helper to draw curly brace
  const drawBrace = (xStart: number, xEnd: number, yBase: number, direction: 'up' | 'down' | 'left', label: string) => {
    if (direction === 'left') {
      const ys = sy(xStart); 
      const ye = sy(xEnd);   
      const xb = sx(yBase);  
      const h = xb - 40; 
      const mid = (ys + ye) / 2;
      
      const path = `
        M ${xb} ${ys} 
        Q ${h + 10} ${ys} ${h + 10} ${ys + (mid - ys)/2}
        L ${h + 10} ${mid - 5}
        L ${h} ${mid}
        L ${h + 10} ${mid + 5}
        L ${h + 10} ${ye - (ye - mid)/2}
        Q ${h + 10} ${ye} ${xb} ${ye}
      `;
      return (
        <g>
          <path d={path} fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" />
          <text x={h - 10} y={mid} dominantBaseline="middle" textAnchor="end" className="text-xl font-bold fill-slate-900">{label}</text>
        </g>
      );
    }

    const xs = sx(xStart);
    const xe = sx(xEnd);
    const yb = sy(yBase);
    const w = xe - xs;
    const mid = xs + w / 2;
    const h = direction === 'up' ? -15 : 15; 
    const p = direction === 'up' ? -10 : 10; 
    const offset = Math.min(10, w / 4);

    const path = `
      M ${xs} ${yb + (direction === 'up' ? -5 : 5)} 
      Q ${xs} ${yb + h} ${xs + offset} ${yb + h} 
      L ${mid - offset} ${yb + h} 
      L ${mid} ${yb + h + p} 
      L ${mid + offset} ${yb + h} 
      L ${xe - offset} ${yb + h} 
      Q ${xe} ${yb + h} ${xe} ${yb + (direction === 'up' ? -5 : 5)}
    `;

    const labelY = yb + h + p + (direction === 'up' ? -12 : 28);

    return (
      <g>
        <path d={path} fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" />
        <text x={mid} y={labelY} textAnchor="middle" className="text-xl font-bold fill-slate-900">{label}</text>
      </g>
    );
  };

  // --- Scenarios Renderers ---

  const renderAutarky = () => {
    const { qE, pE } = anchors;
    const csY = pE + (a - pE) / 3;
    const psY = pE - (pE - c) / 3;

    return (
      <g>
        <polygon 
          points={poly([[0, a], [qE, pE], [0, pE]])} 
          fill={COLORS.consumerSurplus} 
          {...interact('Consumer Surplus (CS)', snapshot.consumerSurplus, 'text-emerald-500', 'Value consumers receive above the price paid.')}
        />
        <text x={sx(qE/3)} y={sy(csY)} textAnchor="middle" className="text-xl font-bold fill-green-700 opacity-60 pointer-events-none">CS</text>

        <polygon 
          points={poly([[0, c], [qE, pE], [0, pE]])} 
          fill={COLORS.producerSurplus} 
          {...interact('Producer Surplus (PS)', snapshot.producerSurplus, 'text-yellow-600', 'Benefit producers receive above their cost.')}
        />
        <text x={sx(qE/3)} y={sy(psY)} textAnchor="middle" className="text-xl font-bold fill-yellow-700 opacity-60 pointer-events-none">PS</text>
        
        <DashedLine x={qE} y={pE} lx="Q*" ly="P*" />
        <circle cx={sx(qE)} cy={sy(pE)} r={5} fill={COLORS.equilibrium} />
      </g>
    );
  };

  const renderTax = () => {
    const qt = anchors.qBase;
    const pc = anchors.pConsumer; 
    const pp = anchors.pProducer; 
    const qE = anchors.qE;
    const pE = anchors.pE;
    const csY = pc + (a - pc) / 3;
    const psY = pp - (pp - c) / 3;
    const dwlX = qt + (qE - qt) / 3;
    const rectY = Math.max(pc, pp);
    const rectH = Math.abs(pc - pp);

    return (
      <g>
        <polygon 
          points={poly([[0, a], [qt, pc], [0, pc]])} 
          fill={COLORS.consumerSurplus} 
          {...interact('Consumer Surplus', snapshot.consumerSurplus, 'text-emerald-500')}
        />
        <text x={sx(qt/3)} y={sy(csY)} textAnchor="middle" dominantBaseline="middle" className="text-lg font-bold fill-green-800 pointer-events-none">CS</text>
        
        <polygon 
          points={poly([[0, c], [qt, pp], [0, pp]])} 
          fill={COLORS.producerSurplus} 
          {...interact('Producer Surplus', snapshot.producerSurplus, 'text-yellow-600')}
        />
        <text x={sx(qt/3)} y={sy(psY)} textAnchor="middle" dominantBaseline="middle" className="text-lg font-bold fill-yellow-800 pointer-events-none">PS</text>
        
        <rect 
          x={sx(0)} y={sy(rectY)} width={sx(qt)-sx(0)} height={sy(0) - sy(rectH)} 
          fill={COLORS.govRevenue} 
          {...interact('Tax Revenue', snapshot.governmentRevenue, 'text-purple-500', 'Revenue collected by government.')}
        />
        <text x={sx(qt/2)} y={sy((pc+pp)/2)} textAnchor="middle" dominantBaseline="middle" className="text-lg font-bold fill-purple-800 pointer-events-none">
           Tax Rev
        </text>
        
        <polygon 
          points={poly([[qt, pc], [qt, pp], [qE, pE]])} 
          fill={COLORS.dwl} 
          {...interact('Deadweight Loss (DWL)', snapshot.deadweightLoss, 'text-rose-500', 'Efficiency loss due to market distortion.')}
        />
        <text x={sx(dwlX)} y={sy(pE)} textAnchor="middle" dominantBaseline="middle" className="text-xs font-bold fill-rose-800 pointer-events-none">DWL</text>
        
        <DashedLine x={qt} y={pc} lx="Qt" ly="Pc" />
        <line x1={sx(0)} y1={sy(pp)} x2={sx(qt)} y2={sy(pp)} stroke="#64748b" strokeDasharray="5,5" />
        <text x={padding-10} y={sy(pp)+4} textAnchor="end" className="text-xs font-bold fill-slate-500">Pp</text>
      </g>
    );
  };

  const renderMonopoly = () => {
    const qM = anchors.qBase;      
    const pM = anchors.pConsumer;  
    const mcVal = anchors.pProducer; 
    const qE = anchors.qE; 
    const pE = anchors.pE;
    const mrEndQ = a / (2 * b);
    
    // Label position for the unified PS area
    const psLabelX = qM / 2.5;
    const psLabelY = (pM + c) / 2;

    return (
      <g>
        <line x1={sx(0)} y1={sy(a)} x2={sx(mrEndQ)} y2={sy(0)} stroke="#a855f7" strokeWidth="2" strokeDasharray="8,4" />
        <text x={sx(mrEndQ)} y={sy(0) - 20} className="text-sm font-bold fill-purple-500">MR</text>
        
        {/* CS: Triangle above Monopoly Price */}
        <polygon 
          points={poly([[0, a], [qM, pM], [0, pM]])} 
          fill={COLORS.consumerSurplus} 
          {...interact('Consumer Surplus', snapshot.consumerSurplus, 'text-emerald-500')}
        />
        <text x={sx(qM * 0.4)} y={sy(pM + (a-pM)*0.3)} className="text-lg font-bold fill-green-800 pointer-events-none">CS</text>
        
        {/* Unified PS: Trapezoid from Monopoly Price down to Supply Curve (MC) */}
        <polygon 
          points={poly([[0, pM], [qM, pM], [qM, mcVal], [0, c]])} 
          fill={COLORS.producerSurplus} 
          {...interact('Producer Surplus', snapshot.producerSurplus, 'text-yellow-600')}
        />
        <text x={sx(psLabelX)} y={sy(psLabelY)} className="text-xl font-bold fill-yellow-800 pointer-events-none" textAnchor="middle">PS</text>
        
        {/* DWL */}
        <polygon 
          points={poly([[qM, pM], [qE, pE], [qM, mcVal]])} 
          fill={COLORS.dwl} 
          {...interact('Deadweight Loss (DWL)', snapshot.deadweightLoss, 'text-rose-500')}
        />
        <text x={sx((qM+qE)/2)} y={sy(pE)} className="text-sm font-bold fill-rose-700 pointer-events-none">DWL</text>
        
        <DashedLine x={qM} y={pM} lx="Qm" ly="Pm" color="#a855f7" />
        <circle cx={sx(qM)} cy={sy(mcVal)} r={4} fill="#a855f7" />
        <circle cx={sx(qM)} cy={sy(pM)} r={4} fill="#a855f7" />
      </g>
    );
  };

  const renderFreeTrade = () => {
    const pw = anchors.pWorld || 0;
    const { qE, pE } = anchors;
    const isExport = pw > pE;
    const qd_w = Math.max(0, (a - pw) / b);
    const qs_w = Math.max(0, (pw - c) / d);
    const colorLineRed = "#ef4444";
    const colorDashed = "#64748b";

    if (isExport) {
      const cA = { x: qd_w/3, y: pw + (a-pw)/3 };
      const cB = { x: qE * 0.4, y: (pE + pw)/2 }; 
      const cC = { x: qE/3, y: c + (pE-c)/3 };
      const cD = { x: (qE + qd_w + qs_w)/3, y: (pE + 2*pw)/3 };
      return (
        <g>
          {/* A: CS (Green) */}
          <polygon 
            points={poly([[0, a], [qd_w, pw], [0, pw]])} 
            fill={COLORS.consumerSurplus} stroke="none" 
            {...interact('Area A: Consumer Surplus', snapshot.consumerSurplus, 'text-emerald-500')}
          />
          <text x={sx(cA.x)} y={sy(cA.y)} className="text-2xl font-bold fill-green-800 opacity-70 pointer-events-none" textAnchor="middle">A</text>
          
          {/* B: Old CS -> New PS (Yellow) */}
          <polygon 
            points={poly([[0, pw], [qd_w, pw], [qE, pE], [0, pE]])} 
            fill={COLORS.producerSurplus} stroke="none" 
            {...interact('Area B: Gain from Trade (to PS)', undefined, 'text-yellow-600', 'Transferred from Consumers to Producers.')}
          />
          <text x={sx(cB.x)} y={sy(cB.y)} className="text-2xl font-bold fill-yellow-800 opacity-70 pointer-events-none" textAnchor="middle">B</text>
          
          {/* C: Old PS (Yellow) */}
          <polygon 
            points={poly([[0, pE], [qE, pE], [0, c]])} 
            fill={COLORS.producerSurplus} stroke="none" 
            {...interact('Area C: Original PS', undefined, 'text-yellow-600')}
          />
          <text x={sx(cC.x)} y={sy(cC.y)} className="text-2xl font-bold fill-yellow-800 opacity-70 pointer-events-none" textAnchor="middle">C</text>
          
          {/* D: New PS (Yellow) */}
          <polygon 
            points={poly([[qE, pE], [qs_w, pw], [qd_w, pw]])} 
            fill={COLORS.producerSurplus} stroke="none" 
            {...interact('Area D: Net Trade Gain', snapshot.tradeGain, 'text-yellow-600', 'Additional PS generated by exports.')}
          />
          <text x={sx(cD.x)} y={sy(cD.y)} className="text-2xl font-bold fill-yellow-800 opacity-70 pointer-events-none" dominantBaseline="middle" textAnchor="middle">D</text>
          
          <line x1={sx(0)} y1={sy(pE)} x2={sx(qE)} y2={sy(pE)} stroke={colorDashed} strokeWidth="2" strokeDasharray="6,4" />
          <text x={padding - 10} y={sy(pE)} textAnchor="end" className="text-xl font-bold fill-slate-500">P<tspan dy="5" fontSize="12">D</tspan></text>
          <line x1={sx(0)} y1={sy(pw)} x2={sx(maxQ)} y2={sy(pw)} stroke={colorLineRed} strokeWidth="3" />
          <text x={padding - 10} y={sy(pw)} textAnchor="end" className="text-xl font-bold fill-black">P<tspan dy="5" fontSize="12">W</tspan></text>
          {drawBrace(qd_w, qs_w, pw, 'up', '出口')}
          <circle cx={sx(qE)} cy={sy(pE)} r={6} fill="black" />
          <circle cx={sx(qd_w)} cy={sy(pw)} r={6} fill="black" />
          <circle cx={sx(qs_w)} cy={sy(pw)} r={6} fill="black" />
        </g>
      );
    } else {
      const cA = { x: qE/3, y: pE + (a-pE)/3 };
      const cB = { x: qE * 0.4, y: (pE + pw)/2 };
      const cC = { x: qs_w/3, y: c + (pw-c)/3 };
      const cD = { x: (qE + qs_w + qd_w)/3, y: (pE + 2*pw)/3 };
      return (
        <g>
          {/* A: Old CS (Green) */}
          <polygon 
            points={poly([[0, a], [qE, pE], [0, pE]])} 
            fill={COLORS.consumerSurplus} stroke="none" 
            {...interact('Area A: Original CS', undefined, 'text-emerald-500')}
          />
          <text x={sx(cA.x)} y={sy(cA.y)} className="text-2xl font-bold fill-green-800 opacity-70 pointer-events-none" textAnchor="middle">A</text>
          
          {/* B: Old PS -> New CS (Green) */}
          <polygon 
            points={poly([[0, pE], [qE, pE], [qs_w, pw], [0, pw]])} 
            fill={COLORS.consumerSurplus} stroke="none" 
            {...interact('Area B: Gain from Trade (to CS)', undefined, 'text-emerald-500', 'Transferred from Producers to Consumers.')}
          />
          <text x={sx(cB.x)} y={sy(cB.y)} className="text-2xl font-bold fill-green-800 opacity-70 pointer-events-none" textAnchor="middle">B</text>
          
          {/* C: PS (Yellow) */}
          <polygon 
            points={poly([[0, pw], [qs_w, pw], [0, c]])} 
            fill={COLORS.producerSurplus} stroke="none" 
            {...interact('Area C: Producer Surplus', snapshot.producerSurplus, 'text-yellow-600')}
          />
          <text x={sx(cC.x)} y={sy(cC.y)} className="text-2xl font-bold fill-yellow-800 opacity-70 pointer-events-none" textAnchor="middle">C</text>
          
          {/* D: New CS (Green) */}
          <polygon 
            points={poly([[qE, pE], [qd_w, pw], [qs_w, pw]])} 
            fill={COLORS.consumerSurplus} stroke="none" 
            {...interact('Area D: Net Trade Gain', snapshot.tradeGain, 'text-emerald-500', 'Additional CS generated by imports.')}
          />
          <text x={sx(cD.x)} y={sy(cD.y)} className="text-2xl font-bold fill-green-800 opacity-70 pointer-events-none" dominantBaseline="middle" textAnchor="middle">D</text>
          
          <line x1={sx(0)} y1={sy(pE)} x2={sx(qE)} y2={sy(pE)} stroke={colorDashed} strokeWidth="2" strokeDasharray="6,4" />
          <text x={padding - 10} y={sy(pE)} textAnchor="end" className="text-xl font-bold fill-slate-500">P<tspan dy="5" fontSize="12">D</tspan></text>
          <line x1={sx(0)} y1={sy(pw)} x2={sx(maxQ)} y2={sy(pw)} stroke={colorLineRed} strokeWidth="3" />
          <text x={padding - 10} y={sy(pw)} textAnchor="end" className="text-xl font-bold fill-black">P<tspan dy="5" fontSize="12">W</tspan></text>
          {drawBrace(qs_w, qd_w, pw, 'down', '进口')}
          <circle cx={sx(qE)} cy={sy(pE)} r={6} fill="black" />
          <circle cx={sx(qs_w)} cy={sy(pw)} r={6} fill="black" />
          <circle cx={sx(qd_w)} cy={sy(pw)} r={6} fill="black" />
        </g>
      );
    }
  };

  const renderTariff = () => {
    const pw = anchors.pWorldBase || anchors.pWorld || 0; 
    const pt = anchors.pConsumer; 
    const pw_active = anchors.pWorld || pw; 
    
    const qs_low = Math.max(0, (pw - c) / d); 
    const qs_high = Math.max(0, (pt - c) / d); 
    const qd_low = Math.max(0, (a - pw) / b); 
    const qd_high = Math.max(0, (a - pt) / b); 

    const isLarge = intervention.tradeScale === TradeScale.LARGE;
    const isQuota = intervention.scenario === Scenario.QUOTA;

    return (
      <g>
        {/* Area 'a': PS Gain */}
        <polygon 
          points={poly([[0, pw], [0, pt], [qs_high, pt], [qs_low, pw]])} 
          fill={COLORS.producerSurplus} stroke="none" 
          {...interact('Area a: PS Gain', undefined, 'text-yellow-600', 'Surplus transferred from Consumers to Producers.')}
        />
        <text x={sx(qs_high / 2)} y={sy((pw + pt) / 2)} className="text-xl font-black fill-yellow-900 pointer-events-none" textAnchor="middle" dominantBaseline="middle">a</text>

        {/* Area 'b': Production Distortion */}
        <polygon 
          points={poly([[qs_low, pw], [qs_high, pt], [qs_high, pw]])} 
          fill={COLORS.dwl} stroke="none" 
          {...interact('Area b: Production Distortion', snapshot.productionDistortion, 'text-rose-500', 'Efficiency loss due to overproduction.')}
        />
        <text x={sx((qs_low + qs_high + qs_high) / 3)} y={sy((pw + pt + pw) / 3)} className="text-lg font-black fill-rose-900 pointer-events-none" textAnchor="middle" dominantBaseline="middle">b</text>

        {/* Area 'c': Revenue */}
        <rect 
          x={sx(qs_high)} y={sy(pt)} width={sx(qd_high) - sx(qs_high)} height={sy(pw) - sy(pt)} 
          fill={COLORS.govRevenue} stroke="none" 
          {...interact(isQuota ? 'Area c: Quota Rent' : 'Area c: Tariff Revenue', snapshot.governmentRevenue, 'text-purple-500')}
        />
        <text x={sx((qs_high + qd_high) / 2)} y={sy((pt + pw) / 2)} className="text-xl font-black fill-purple-900 pointer-events-none" textAnchor="middle" dominantBaseline="middle">c</text>

        {/* Area 'd': Consumption Distortion */}
        <polygon 
          points={poly([[qd_high, pt], [qd_low, pw], [qd_high, pw]])} 
          fill={COLORS.dwl} stroke="none" 
          {...interact('Area d: Consumption Distortion', snapshot.consumptionDistortion, 'text-rose-500', 'Efficiency loss due to underconsumption.')}
        />
        <text x={sx((qd_high + qd_low + qd_high) / 3)} y={sy((pt + pw + pw) / 3)} className="text-lg font-black fill-rose-900 pointer-events-none" textAnchor="middle" dominantBaseline="middle">d</text>

        {/* Area 'e': Terms of Trade Gain */}
        {isLarge && pw_active < pw && (
          <>
            <rect 
              x={sx(qs_high)} y={sy(pw)} width={sx(qd_high) - sx(qs_high)} height={sy(pw_active) - sy(pw)} 
              fill={COLORS.govRevenue} stroke="none" 
              {...interact('Area e: Terms of Trade Gain', snapshot.termsOfTradeGain, 'text-emerald-500')}
            />
            <text x={sx((qs_high + qd_high) / 2)} y={sy((pw + pw_active) / 2)} className="text-lg font-black fill-purple-900 pointer-events-none" textAnchor="middle" dominantBaseline="middle">e</text>
            
             <line x1={sx(0)} y1={sy(pw_active)} x2={sx(maxQ)} y2={sy(pw_active)} stroke="#b45309" strokeDasharray="4,2" />
             <text x={padding - 10} y={sy(pw_active)} textAnchor="end" className="text-xs font-bold fill-amber-700">P*</text>
          </>
        )}

        <line x1={sx(0)} y1={sy(pt)} x2={sx(maxQ)} y2={sy(pt)} stroke="#0f172a" strokeDasharray="2,2" />
        <text x={padding - 10} y={sy(pt)} textAnchor="end" className="text-xs font-bold">Pt</text>
        
        <line x1={sx(0)} y1={sy(pw)} x2={sx(maxQ)} y2={sy(pw)} stroke="#ef4444" strokeDasharray="4,2" />
        <text x={padding - 10} y={sy(pw)} textAnchor="end" className="text-xs font-bold fill-red-500">Pw</text>

        <line x1={sx(qs_high)} y1={sy(pt)} x2={sx(qs_high)} y2={sy(0)} stroke="#94a3b8" strokeDasharray="2,2" />
        <line x1={sx(qd_high)} y1={sy(pt)} x2={sx(qd_high)} y2={sy(0)} stroke="#94a3b8" strokeDasharray="2,2" />
        
        {drawBrace(qs_high, qd_high, 0, 'down', isQuota ? 'Import Quota' : 'Imports')}
      </g>
    );
  };

  const renderControl = () => {
    const q = anchors.qBase;
    const p = anchors.pConsumer; 
    const { qE, pE } = anchors;
    const pDemanded = a - b * q; 
    const pSupplied = c + d * q;
    return (
       <g>
         {intervention.scenario === Scenario.CEILING ? (
           <>
             <polygon 
               points={poly([[0, a], [q, pDemanded], [q, p], [0, p]])} 
               fill={COLORS.consumerSurplus} 
               {...interact('Consumer Surplus', snapshot.consumerSurplus, 'text-emerald-500')}
             />
             <text x={sx(q/2)} y={sy((a + p)/2)} textAnchor="middle" dominantBaseline="middle" className="text-lg font-bold fill-green-800 pointer-events-none">CS</text>
             
             <polygon 
               points={poly([[0, c], [q, p], [0, p]])} 
               fill={COLORS.producerSurplus} 
               {...interact('Producer Surplus', snapshot.producerSurplus, 'text-yellow-600')}
             />
             <text x={sx(q/3)} y={sy((c + 2*p)/3)} textAnchor="middle" dominantBaseline="middle" className="text-lg font-bold fill-yellow-800 pointer-events-none">PS</text>
             
             <polygon 
               points={poly([[q, pDemanded], [qE, pE], [q, p]])} 
               fill={COLORS.dwl} 
               {...interact('Deadweight Loss', snapshot.deadweightLoss, 'text-rose-500')}
             />
             <text x={sx((2*q + qE)/3)} y={sy((pDemanded + pE + p)/3)} textAnchor="middle" dominantBaseline="middle" className="text-xs font-bold fill-rose-800 pointer-events-none">DWL</text>
           </>
         ) : (
           <>
             <polygon 
               points={poly([[0, a], [q, p], [0, p]])} 
               fill={COLORS.consumerSurplus} 
               {...interact('Consumer Surplus', snapshot.consumerSurplus, 'text-emerald-500')}
             />
             <text x={sx(q/3)} y={sy(p + (a-p)/3)} className="text-lg font-bold fill-green-800 pointer-events-none">CS</text>
             
             <polygon 
               points={poly([[0, c], [q, pSupplied], [q, p], [0, p]])} 
               fill={COLORS.producerSurplus} 
               {...interact('Producer Surplus', snapshot.producerSurplus, 'text-yellow-600')}
             />
             <text x={sx(q/2)} y={sy((c + p)/2)} textAnchor="middle" dominantBaseline="middle" className="text-lg font-bold fill-yellow-800 pointer-events-none">PS</text>
             
             <polygon 
               points={poly([[q, p], [qE, pE], [q, pSupplied]])} 
               fill={COLORS.dwl} 
               {...interact('Deadweight Loss', snapshot.deadweightLoss, 'text-rose-500')}
             />
             <text x={sx((2*q + qE)/3)} y={sy((p + pE + pSupplied)/3)} textAnchor="middle" dominantBaseline="middle" className="text-xs font-bold fill-rose-800 pointer-events-none">DWL</text>
           </>
         )}
         <DashedLine x={q} y={p} lx="Qc" ly="Pc" />
       </g>
    );
  };

  const renderExportSubsidy = () => {
    const pw = anchors.pWorldBase || 0; 
    const ps = anchors.pConsumer || 0;  
    const ps_star = anchors.pWorldNew || pw; 
    
    const isLarge = intervention.tradeScale === TradeScale.LARGE;

    const x1 = Math.max(0, (a - ps) / b); 
    const x2 = Math.max(0, (a - pw) / b); 
    const x3 = Math.max(0, (pw - c) / d); 
    const x4 = Math.max(0, (ps - c) / d); 
    
    const x_d_star = Math.max(0, (a - ps_star) / b); 
    const x_s_star = Math.max(0, (ps_star - c) / d); 

    const demandTop = [[0, a], [x2, pw]];
    const demandBottom = [[x_d_star, ps_star], [maxQ, a - b * maxQ]];

    const supplyBottom = [[0, c], [x_s_star, ps_star]];
    const supplyTop = [[x3, pw], [maxQ, c + d * maxQ]];
    
    return (
      <g>
        {/* ROW 1: Ps to Pw */}
        
        {/* a: Rect 0 -> X1 */}
        <rect 
          x={sx(0)} y={sy(ps)} width={sx(x1)-sx(0)} height={sy(pw)-sy(ps)} 
          fill={COLORS.producerSurplus} stroke="none" 
          {...interact('Area a: CS to PS Transfer', undefined, 'text-yellow-600')}
        />
        <text x={sx(x1/2)} y={sy((ps+pw)/2)} className="text-xl font-black fill-yellow-900 pointer-events-none" textAnchor="middle" dominantBaseline="middle">a</text>
        
        {/* b: DWL Demand */}
        <polygon 
          points={poly([[x1, ps], [x2, pw], [x1, pw]])} 
          fill={COLORS.dwl} stroke="none" 
          {...interact('Area b: Consumption Distortion', snapshot.consumptionDistortion, 'text-rose-500')}
        />
        <text x={sx(x1 + (x2-x1)/3)} y={sy(pw + (ps-pw)/3)} className="text-xl font-black fill-rose-900 pointer-events-none" textAnchor="middle" dominantBaseline="middle">b</text>
        
        {/* c: Transfer */}
        <polygon 
          points={poly([[x1, ps], [x4, ps], [x3, pw], [x2, pw]])} 
          fill={COLORS.producerSurplus} stroke="none" 
          {...interact('Area c: Gov Subsidy to PS', undefined, 'text-yellow-600')}
        />
        <text x={sx((x1+x2+x3+x4)/4)} y={sy((ps+pw)/2)} className="text-xl font-black fill-yellow-900 pointer-events-none" textAnchor="middle" dominantBaseline="middle">c</text>
        
        {/* d: DWL Supply */}
        <polygon 
          points={poly([[x3, pw], [x4, ps], [x4, pw]])} 
          fill={COLORS.dwl} stroke="none" 
          {...interact('Area d: Production Distortion', snapshot.productionDistortion, 'text-rose-500')}
        />
        <text x={sx(x4 - (x4-x3)/3)} y={sy(pw + (ps-pw)/3)} className="text-xl font-black fill-rose-900 pointer-events-none" textAnchor="middle" dominantBaseline="middle">d</text>

        {/* ROW 2: Pw to Ps* (Large Country) */}
        {isLarge && (
          <>
            <polygon 
              points={poly([[x1, pw], [x2, pw], [x_d_star, ps_star], [x1, ps_star]])} 
              fill={COLORS.producerSurplus} stroke="black" strokeWidth="2" 
              {...interact('Area e: CS Transfer', undefined, 'text-yellow-600')}
            />
            <text x={sx((x1+x2)/2)} y={sy((pw+ps_star)/2)} className="text-xl font-black fill-yellow-900 pointer-events-none" textAnchor="middle" dominantBaseline="middle">e</text>
            
            <polygon 
              points={poly([[x2, pw], [x3, pw], [x_s_star, ps_star], [x_d_star, ps_star]])} 
              fill={COLORS.producerSurplus} stroke="black" strokeWidth="2" 
              {...interact('Area f: Old PS', undefined, 'text-yellow-600')}
            />
            <text x={sx((x2+x3)/2)} y={sy((pw+ps_star)/2)} className="text-xl font-black fill-yellow-900 pointer-events-none" textAnchor="middle" dominantBaseline="middle">f</text>
            
            <polygon 
              points={poly([[x3, pw], [x4, pw], [x4, ps_star], [x_s_star, ps_star]])} 
              fill={COLORS.producerSurplus} stroke="black" strokeWidth="2" 
              {...interact('Area g: Extra PS', undefined, 'text-yellow-600')}
            />
            <text x={sx((x3+x4)/2)} y={sy((pw+ps_star)/2)} className="text-xl font-black fill-yellow-900 pointer-events-none" textAnchor="middle" dominantBaseline="middle">g</text>

            <line x1={sx(x1)} y1={sy(ps)} x2={sx(x1)} y2={sy(ps_star)} stroke="black" strokeWidth="2" />
            <line x1={sx(x4)} y1={sy(ps)} x2={sx(x4)} y2={sy(ps_star)} stroke="black" strokeWidth="2" />

             <line x1={sx(0)} y1={sy(ps_star)} x2={sx(maxQ)} y2={sy(ps_star)} stroke="black" strokeWidth="2" />
             <text x={padding-10} y={sy(ps_star)} textAnchor="end" className="text-lg font-bold">P*<tspan dy="5" fontSize="12">S</tspan></text>
          </>
        )}

        {!isLarge && (
           <>
              <line x1={sx(x1)} y1={sy(ps)} x2={sx(x1)} y2={sy(pw)} stroke="black" strokeWidth="2" />
              <line x1={sx(x4)} y1={sy(ps)} x2={sx(x4)} y2={sy(pw)} stroke="black" strokeWidth="2" />
           </>
        )}

        <line x1={sx(0)} y1={sy(ps)} x2={sx(maxQ)} y2={sy(ps)} stroke="black" strokeWidth="2" />
        <text x={padding-10} y={sy(ps)} textAnchor="end" className="text-lg font-bold">P<tspan dy="5" fontSize="12">S</tspan></text>
        
        <line x1={sx(0)} y1={sy(pw)} x2={sx(maxQ)} y2={sy(pw)} stroke="#ef4444" strokeWidth="2" strokeDasharray="8,4" />
        <text x={padding-10} y={sy(pw)} textAnchor="end" className="text-lg font-bold fill-red-600">P<tspan dy="5" fontSize="12">W</tspan></text>
        
        <line x1={sx(x1)} y1={sy(ps)} x2={sx(x1)} y2={sy(0)} stroke="#64748b" strokeDasharray="5,5" strokeWidth="1.5" />
        <line x1={sx(x4)} y1={sy(ps)} x2={sx(x4)} y2={sy(0)} stroke="#64748b" strokeDasharray="5,5" strokeWidth="1.5" />

        <polyline points={poly(demandTop)} fill="none" stroke="#1e3a8a" strokeWidth="4" strokeLinecap="round" />
        <polyline points={poly(demandBottom)} fill="none" stroke="#1e3a8a" strokeWidth="4" strokeLinecap="round" />
        <text x={sx(maxQ) - 10} y={sy(a - b * maxQ) - 10} className="text-xl font-black fill-blue-900">D</text>

        <polyline points={poly(supplyBottom)} fill="none" stroke="#1e3a8a" strokeWidth="4" strokeLinecap="round" />
        <polyline points={poly(supplyTop)} fill="none" stroke="#1e3a8a" strokeWidth="4" strokeLinecap="round" />
        <text x={sx(maxQ) - 20} y={sy(c + d * maxQ) - 10} className="text-xl font-black fill-blue-900">S</text>
        
        {drawBrace(x1, x4, 0, 'down', '出口')}

      </g>
    );
  };

  const renderScenarioLayer = () => {
    switch(intervention.scenario) {
      case Scenario.TAX:
        return renderTax();
      case Scenario.MONOPOLY:
        return renderMonopoly();
      case Scenario.FREE_TRADE:
        return renderFreeTrade();
      case Scenario.TARIFF:
      case Scenario.QUOTA:
        return renderTariff();
      case Scenario.EXPORT_SUBSIDY:
        return renderExportSubsidy();
      case Scenario.CEILING:
      case Scenario.FLOOR:
        return renderControl();
      default:
        return renderAutarky();
    }
  };

  const isExportSubsidy = intervention.scenario === Scenario.EXPORT_SUBSIDY;
  const isTariffOrQuota = intervention.scenario === Scenario.TARIFF || intervention.scenario === Scenario.QUOTA;

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden p-6 relative chart-container group">
      <h3 className="text-center font-black text-slate-300 uppercase tracking-widest mb-4">Market Equilibrium Analysis</h3>
      
      {/* SVG Rendering */}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible cursor-crosshair">
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="#cbd5e1" />
          </marker>
        </defs>

        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#cbd5e1" strokeWidth="2" markerEnd="url(#arrow)" />
        <line x1={padding} y1={height - padding} x2={padding} y2={padding} stroke="#cbd5e1" strokeWidth="2" markerEnd="url(#arrow)" />
        <text x={width - padding} y={height - padding + 35} textAnchor="end" className="text-sm font-bold fill-slate-500">Quantity, Q</text>
        <text x={padding} y={padding - 20} textAnchor="middle" className="text-sm font-bold fill-slate-500">Price, P</text>

        {renderScenarioLayer()}

        {!isExportSubsidy && !isTariffOrQuota && (
          <>
            <line x1={sx(0)} y1={sy(a)} x2={sx(a/b)} y2={sy(0)} stroke={intervention.scenario === Scenario.FREE_TRADE ? "#1e3a8a" : COLORS.demand} strokeWidth="4" strokeLinecap="round" />
            <text x={sx(a/b)} y={sy(0) - 10} className={`text-lg font-black ${intervention.scenario === Scenario.FREE_TRADE ? "fill-blue-900" : "fill-red-500"}`}>D</text>

            <line x1={sx(0)} y1={sy(c)} x2={sx(maxQ)} y2={sy(c + d * maxQ)} stroke={intervention.scenario === Scenario.FREE_TRADE ? "#1e3a8a" : COLORS.supply} strokeWidth="4" strokeLinecap="round" />
            <text x={sx(maxQ) - 20} y={sy(c + d * maxQ) - 10} className={`text-lg font-black ${intervention.scenario === Scenario.FREE_TRADE ? "fill-blue-900" : "fill-blue-500"}`}>S</text>
          </>
        )}
        
        {isTariffOrQuota && (
           <>
            <line x1={sx(0)} y1={sy(a)} x2={sx(a/b)} y2={sy(0)} stroke="#1e3a8a" strokeWidth="4" strokeLinecap="round" />
            <text x={sx(a/b)} y={sy(0) - 10} className="text-lg font-black fill-blue-900">D</text>
            <line x1={sx(0)} y1={sy(c)} x2={sx(maxQ)} y2={sy(c + d * maxQ)} stroke="#1e3a8a" strokeWidth="4" strokeLinecap="round" />
            <text x={sx(maxQ) - 20} y={sy(c + d * maxQ) - 10} className="text-lg font-black fill-blue-900">S</text>
           </>
        )}

      </svg>
      
      {/* Dynamic Tooltip Overlay */}
      {hoverInfo && (
        <div 
          className="absolute z-50 pointer-events-none transition-all duration-75 ease-out"
          style={{ left: hoverInfo.x, top: hoverInfo.y, transform: 'translate(-50%, -110%)' }}
        >
          <div className="bg-slate-900/90 backdrop-blur-md text-white px-4 py-3 rounded-xl shadow-2xl border border-white/10 flex flex-col items-center gap-1 min-w-[140px]">
             <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{hoverInfo.title}</span>
             {hoverInfo.value !== undefined && (
               <span className={`text-2xl font-black ${hoverInfo.color} drop-shadow-sm`}>
                 ${hoverInfo.value.toFixed(2)}
               </span>
             )}
             {hoverInfo.desc && (
               <span className="text-[10px] text-slate-300 max-w-[160px] text-center leading-tight mt-1 border-t border-white/10 pt-1">
                 {hoverInfo.desc}
               </span>
             )}
             {/* Tooltip Arrow */}
             <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900/90 rotate-45 border-r border-b border-white/10"></div>
          </div>
        </div>
      )}

      {/* Static Legend Fallback */}
      {intervention.scenario === Scenario.NONE && (
        <div className="mt-8 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <h4 className="text-xs font-black text-slate-700 uppercase mb-3 border-b border-slate-200 pb-2">概念定义 (Definitions)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600 font-medium">
             <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                   <span className="w-3 h-3 rounded-full bg-green-500/40 border border-green-600"></span>
                   <span className="font-bold text-slate-800">消费者剩余 (Consumer Surplus)</span>
                </div>
                <p className="pl-5 text-slate-500">消费者愿意支付的最高价格与实际支付价格之间的差额。</p>
             </div>
             <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                   <span className="w-3 h-3 rounded-full bg-yellow-500/40 border border-yellow-600"></span>
                   <span className="font-bold text-slate-800">生产者剩余 (Producer Surplus)</span>
                </div>
                <p className="pl-5 text-slate-500">生产者实际获得的价格与生产边际成本之间的差额。</p>
             </div>
          </div>
        </div>
      )}
      
      {/* Other legends maintained... */}
      {isExportSubsidy && (
        <div className="mt-8 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <h4 className="text-xs font-black text-slate-700 uppercase mb-3 border-b border-slate-200 pb-2">图例说明 (Legend)</h4>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs text-slate-600 font-medium">
             <div className="flex items-start gap-2"><span className="font-bold text-yellow-600">a</span> <span>消费者剩余转移 (CS to PS)</span></div>
             <div className="flex items-start gap-2"><span className="font-bold text-rose-500">b</span> <span>需求端无谓损失 (Demand DWL)</span></div>
             <div className="flex items-start gap-2"><span className="font-bold text-yellow-600">c</span> <span>转移给生产者的补贴 (Gov to PS)</span></div>
             <div className="flex items-start gap-2"><span className="font-bold text-rose-500">d</span> <span>供给端无谓损失 (Supply DWL)</span></div>
             {/* ... Large country items ... */}
          </div>
        </div>
      )}
      
      {isTariffOrQuota && (
        <div className="mt-8 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <h4 className="text-xs font-black text-slate-700 uppercase mb-3 border-b border-slate-200 pb-2">图例说明 (Legend)</h4>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs text-slate-600 font-medium">
             <div className="flex items-start gap-2"><span className="font-bold text-yellow-600">a</span> <span>生产者剩余增加 (PS Gain)</span></div>
             <div className="flex items-start gap-2"><span className="font-bold text-rose-500">b</span> <span>生产效率损失 (Production DWL)</span></div>
             <div className="flex items-start gap-2"><span className="font-bold text-purple-600">c</span> <span>{intervention.scenario === Scenario.QUOTA ? '配额租金 (Quota Rent)' : '政府关税收入 (Gov Revenue)'}</span></div>
             <div className="flex items-start gap-2"><span className="font-bold text-rose-500">d</span> <span>消费效率损失 (Consumption DWL)</span></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WelfareChart;
