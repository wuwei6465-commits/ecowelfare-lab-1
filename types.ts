
export enum Scenario {
  NONE = 'Market Equilibrium (Autarky)',
  
  // 价格管制 (Price Controls)
  CEILING = 'Price Ceiling',
  FLOOR = 'Price Floor',
  
  // 财政干预 (Fiscal Intervention)
  TAX = 'Specific Tax (Per-unit)',
  
  // 市场结构 (Market Structure)
  MONOPOLY = 'Monopoly Analysis',
  
  // 国际贸易与干预 (International Trade & Interventions)
  FREE_TRADE = 'Free Trade (Import/Export)',
  TARIFF = 'Specific Import Tariff',
  QUOTA = 'Import Quota',
  EXPORT_SUBSIDY = 'Export Subsidy'
}

export enum TradeScale {
  SMALL = 'Small Country (Price Taker)',
  LARGE = 'Large Country (Market Power)'
}

export interface MarketParams {
  demandIntercept: number; 
  demandSlope: number;     
  supplyIntercept: number; 
  supplySlope: number;     
}

export interface InterventionParams {
  scenario: Scenario;
  value: number;       
  worldPrice: number;  
  quotaVolume: number; 
  tradeScale: TradeScale;
}

// 新增：用于绘图的关键坐标点集合，避免在UI层做数学运算
export interface ChartAnchors {
  qE: number; // 均衡数量
  pE: number; // 均衡价格
  qBase: number; // 干预下的基准数量 (如Tax下的量)
  pConsumer: number; // 消费者支付价格
  pProducer: number; // 生产者收到价格
  mrIntercept?: number; // MR曲线截距 (垄断用)
  mrSlope?: number;    // MR曲线斜率 (垄断用)
  pWorld?: number;     // 世界价格 (或当前生效的外部价格)
  pWorldBase?: number; // 原始世界价格 (大国效应前)
  pWorldNew?: number;  // 新的世界价格 (大国效应后，用于出口补贴)
}

export interface WelfareSnapshot {
  consumerSurplus: number;
  producerSurplus: number;
  governmentRevenue: number; 
  totalWelfare: number;
  deadweightLoss: number;
  tradeGain?: number;       
  termsOfTradeGain?: number;
  
  // 效率损失分解 (新增)
  productionDistortion?: number; // 生产扭曲 (三角形 b)
  consumptionDistortion?: number; // 消费扭曲 (三角形 d)
  
  // 核心坐标数据
  quantity: number;        // 实际交易量
  quantityDemanded?: number;
  quantitySupplied?: number;
  consumerPrice: number;   // 消费者面对的价格
  producerPrice: number;   // 生产者面对的价格
  
  anchors: ChartAnchors;   // 绘图辅助点
}
