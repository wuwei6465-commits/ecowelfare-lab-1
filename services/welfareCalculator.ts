
import { MarketParams, InterventionParams, Scenario, WelfareSnapshot, TradeScale, ChartAnchors } from '../types';

export const calculateWelfare = (
  market: MarketParams,
  intervention: InterventionParams
): WelfareSnapshot => {
  const { demandIntercept: a, demandSlope: b, supplyIntercept: c, supplySlope: d } = market;
  const { scenario, worldPrice, quotaVolume, tradeScale, value } = intervention;

  // 1. 基础均衡 (Autarky Equilibrium)
  // a - bQ = c + dQ => Q(b+d) = a - c
  const qE = Math.max(0, (a - c) / (b + d)); 
  const pE = a - b * qE;       

  // 辅助计算函数
  const getQd = (p: number) => Math.max(0, (a - p) / b);
  const getQs = (p: number) => Math.max(0, (p - c) / d);
  const getPd = (q: number) => Math.max(0, a - b * q);
  const getPs = (q: number) => c + d * q;

  // 初始化核心变量
  let qTransacted = qE; 
  let pc = pE;          
  let pp = pE;          
  let gov = 0;
  let totGain = 0;      
  let dwl = 0;
  
  // 新增：扭曲分解
  let prodDistortion = 0;
  let consDistortion = 0;
  
  // 锚点数据 (用于绘图)
  const anchors: ChartAnchors = {
    qE, pE, qBase: qE, pConsumer: pE, pProducer: pE,
    mrIntercept: a, mrSlope: 2 * b,
    pWorld: worldPrice, pWorldBase: worldPrice
  };

  // --- 场景计算隔离 ---

  switch (scenario) {
    case Scenario.TAX: {
      // 征税: Demand Price = Supply Price + Tax
      // a - bQ = c + dQ + Tax
      const qTax = Math.max(0, (a - c - value) / (b + d));
      qTransacted = qTax;
      pc = getPd(qTax); // 消费者付高价
      pp = getPs(qTax); // 生产者拿低价
      gov = value * qTax;
      
      anchors.qBase = qTax;
      anchors.pConsumer = pc;
      anchors.pProducer = pp;
      break;
    }

    case Scenario.CEILING: {
      // 价格上限 (有效当 Price < Pe)
      if (value < pE) {
        pc = value;
        pp = value;
        qTransacted = getQs(value); // 短边原则：供给不足
        // 此时存在短缺，DWL计算比较复杂，基于实际交易量
      }
      anchors.qBase = qTransacted;
      anchors.pConsumer = pc;
      anchors.pProducer = pp; // 在黑市理论中可能不同，但这里简化为管制价
      break;
    }

    case Scenario.FLOOR: {
      // 价格下限 (有效当 Price > Pe)
      if (value > pE) {
        pc = value;
        pp = value;
        qTransacted = getQd(value); // 短边原则：需求不足
      }
      anchors.qBase = qTransacted;
      anchors.pConsumer = pc;
      anchors.pProducer = pp;
      break;
    }

    case Scenario.MONOPOLY: {
      // MR = MC
      // MR: a - 2bQ
      // MC: c + dQ
      const qM = Math.max(0, (a - c) / (2 * b + d));
      qTransacted = qM;
      pc = getPd(qM); // 垄断定价 P_m (在需求曲线上)
      pp = getPs(qM); // 这里的pp我们暂存为 MC 在 Qm 处的值，用于画图
      
      anchors.qBase = qM;
      anchors.pConsumer = pc; // P_m
      anchors.pProducer = pp; // MC value
      break;
    }

    case Scenario.FREE_TRADE: {
      // 自由贸易：直接接受世界价格
      pc = worldPrice;
      pp = worldPrice;
      // 交易量分为 Qd 和 Qs
      const qd = getQd(worldPrice);
      const qs = getQs(worldPrice);
      qTransacted = Math.max(qd, qs); // 为了UI显示，通常取最大那个，但具体CS/PS计算分开
      
      anchors.pConsumer = worldPrice;
      anchors.pProducer = worldPrice;
      anchors.qBase = qTransacted;
      break;
    }

    case Scenario.TARIFF: {
      if (worldPrice < pE) {
         // 仅讨论进口关税
         const isLarge = tradeScale === TradeScale.LARGE;
         // 简单的大国效应模型：关税一部分由外国承担（世界价格下降）
         const termsShift = isLarge ? value * 0.3 : 0; 
         const pWorldActive = worldPrice - termsShift; // P*
         const pTariff = pWorldActive + value; // Pt = P* + t
         
         pc = pTariff;
         pp = pTariff;
         
         const qd = getQd(pTariff);
         const qs = getQs(pTariff);
         const imports = Math.max(0, qd - qs);
         
         gov = value * imports;
         if (isLarge) totGain = termsShift * imports;

         // 扭曲计算 (相对 P* 或 小国的 Pw)
         // 生产扭曲 (b): 0.5 * (Qs_tariff - Qs_world) * (Pt - P_world_active)
         const qsWorld = getQs(pWorldActive);
         const qdWorld = getQd(pWorldActive);
         
         prodDistortion = 0.5 * Math.abs(qs - qsWorld) * Math.abs(pTariff - pWorldActive);
         // 消费扭曲 (d): 0.5 * (Qd_world - Qd_tariff) * (Pt - P_world_active)
         consDistortion = 0.5 * Math.abs(qdWorld - qd) * Math.abs(pTariff - pWorldActive);

         anchors.pWorldBase = worldPrice;
         anchors.pWorld = pWorldActive;
         anchors.pConsumer = pTariff;
         anchors.pProducer = pTariff;
      }
      break;
    }

    case Scenario.QUOTA: {
      if (worldPrice < pE) {
         const pQuota = (d*a + b*c - b*d*quotaVolume) / (b + d);
         
         // 限制：价格必须在 [Pw, Pe] 之间
         let effectiveP = pQuota;
         if (effectiveP < worldPrice) effectiveP = worldPrice;
         if (effectiveP > pE) effectiveP = pE;

         pc = effectiveP;
         pp = effectiveP;
         
         const qd = getQd(effectiveP);
         const qs = getQs(effectiveP);
         const quotaRent = (effectiveP - worldPrice) * (qd - qs);
         
         gov = quotaRent; 
         
         // 扭曲计算 (相对 Pw)
         const qsWorld = getQs(worldPrice);
         const qdWorld = getQd(worldPrice);
         prodDistortion = 0.5 * Math.abs(qs - qsWorld) * Math.abs(effectiveP - worldPrice);
         consDistortion = 0.5 * Math.abs(qdWorld - qd) * Math.abs(effectiveP - worldPrice);

         anchors.pConsumer = effectiveP;
         anchors.pProducer = effectiveP;
         anchors.pWorld = worldPrice;
      }
      break;
    }

    case Scenario.EXPORT_SUBSIDY: {
      // 出口补贴
      const subsidy = value;
      const isLarge = tradeScale === TradeScale.LARGE;

      const worldPriceDrop = isLarge ? subsidy * 0.4 : 0; 
      const pWorldNew = worldPrice - worldPriceDrop; // P*
      const pDomestic = pWorldNew + subsidy; // Ps = P* + s

      pc = pDomestic;
      pp = pDomestic;
      
      const qd = getQd(pDomestic);
      const qs = getQs(pDomestic);
      const exports = Math.max(0, qs - qd);
      
      // 政府支出 = 补贴 * 出口量
      gov = -subsidy * exports;

      // TOT Loss
      const totLoss = (worldPrice - pWorldNew) * exports;
      totGain = -totLoss; // Negative gain

      // 扭曲计算 (相对 P*)
      const qsWorld = getQs(pWorldNew);
      const qdWorld = getQd(pWorldNew);
      
      // 消费扭曲 (b in diagram): 因价格由 P* 升至 Ps，需求减少造成的损失
      consDistortion = 0.5 * Math.abs(qdWorld - qd) * Math.abs(pDomestic - pWorldNew);
      // 生产扭曲 (d in diagram): 因价格由 P* 升至 Ps，供给增加(超过有效水平)造成的损失
      prodDistortion = 0.5 * Math.abs(qs - qsWorld) * Math.abs(pDomestic - pWorldNew);

      anchors.pWorldBase = worldPrice; 
      anchors.pWorldNew = pWorldNew;   
      anchors.pConsumer = pDomestic;   
      anchors.pProducer = pDomestic;
      break;
    }
  }

  // --- 面积积分逻辑 (Area Calculation) ---
  
  // CS
  const currentQd = [Scenario.FREE_TRADE, Scenario.TARIFF, Scenario.QUOTA, Scenario.EXPORT_SUBSIDY].includes(scenario) ? getQd(pc) : qTransacted;
  let cs = 0.5 * (a - pc) * currentQd;
  // Ceiling 特殊 CS 计算 (梯形 + 矩形)
  if (scenario === Scenario.CEILING && value < pE) {
      const pWilling = getPd(currentQd);
      cs = 0.5 * (a - pWilling) * currentQd + (pWilling - pc) * currentQd;
  }

  // PS
  const currentQs = [Scenario.FREE_TRADE, Scenario.TARIFF, Scenario.QUOTA, Scenario.EXPORT_SUBSIDY].includes(scenario) ? getQs(pp) : qTransacted;
  let ps = 0.5 * (pp - c) * currentQs;
  // Monopoly PS Calculation (Split into pure PS and Profit if needed, but numerically sum is same)
  if (scenario === Scenario.MONOPOLY) {
      ps = (pc * qTransacted) - (0.5 * (pp + c) * qTransacted);
  }

  // DWL Calculation
  const wTotal = cs + ps + gov + totGain;
  
  // 基准福利 (Max Potential Welfare)
  let maxWelfare = 0;
  // 对于出口补贴，基准通常是自由贸易(无补贴)下的福利，即世界价格为 Pw 时的福利
  if (scenario === Scenario.EXPORT_SUBSIDY) {
      const qdF = getQd(worldPrice);
      const qsF = getQs(worldPrice);
      maxWelfare = 0.5 * (a - worldPrice) * qdF + 0.5 * (worldPrice - c) * qsF;
  } else if ([Scenario.FREE_TRADE, Scenario.TARIFF, Scenario.QUOTA].includes(scenario) && worldPrice < pE) {
      const qdF = getQd(worldPrice);
      const qsF = getQs(worldPrice);
      maxWelfare = 0.5 * (a - worldPrice) * qdF + 0.5 * (worldPrice - c) * qsF;
  } else if ([Scenario.FREE_TRADE].includes(scenario) && worldPrice > pE) {
      const qdF = getQd(worldPrice);
      const qsF = getQs(worldPrice);
      maxWelfare = 0.5 * (a - worldPrice) * qdF + 0.5 * (worldPrice - c) * qsF;
  } else {
      maxWelfare = 0.5 * (a - c) * qE;
  }
  
  dwl = Math.max(0, maxWelfare - wTotal);

  return {
    consumerSurplus: Math.max(0, cs),
    producerSurplus: Math.max(0, ps),
    governmentRevenue: gov,
    totalWelfare: wTotal,
    quantity: qTransacted,
    quantityDemanded: currentQd,
    quantitySupplied: currentQs,
    consumerPrice: pc,
    producerPrice: pp,
    deadweightLoss: dwl,
    termsOfTradeGain: totGain,
    productionDistortion: prodDistortion,
    consumptionDistortion: consDistortion,
    anchors // Pass strict anchors to UI
  };
};
