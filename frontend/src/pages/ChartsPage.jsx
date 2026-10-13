import React, { useState, useEffect, useRef } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  AreaSeries,
  LineStyle,
} from 'lightweight-charts';
import {
  Activity,
  Layers,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Plus,
  Minus,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  Eye,
  BarChart2,
  Maximize2,
  TrendingUp,
  Crosshair,
  RotateCcw,
} from 'lucide-react';
import { api } from '../services/api';
import { SUPPORTED_INDICES } from '../services/constants';
import { formatTradingSymbol } from '../services/formatters';

export default function ChartsPage({
  user,
  account,
  ticks = {},
  addToast,
  onRefreshAccount,
}) {
  // Instrument selection
  const [instrumentCategory, setInstrumentCategory] = useState('indices'); // 'indices' | 'options'
  const [selectedSymbol, setSelectedSymbol] = useState('NIFTY 50');
  const [selectedOptionStrike, setSelectedOptionStrike] = useState(22700);
  const [selectedOptionType, setSelectedOptionType] = useState('CE'); // 'CE' | 'PE'
  const [selectedOptionExpiry, setSelectedOptionExpiry] = useState('13 OCT 2026');

  // Chart configuration
  const [timeframe, setTimeframe] = useState('5m');
  const [chartType, setChartType] = useState('candles'); // 'candles' | 'line' | 'area'
  const [showVolume, setShowVolume] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Crosshair hover bar data for live legend
  const [currentBar, setCurrentBar] = useState(null);

  // Telemetry (positions & orders)
  const [positions, setPositions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [optionChainData, setOptionChainData] = useState(null);

  // Quick trade ticket state
  const [side, setSide] = useState('BUY');
  const [orderType, setOrderType] = useState('MARKET');
  const [productType, setProductType] = useState('INTRADAY');
  const [quantity, setQuantity] = useState(25);
  const [limitPrice, setLimitPrice] = useState('');
  const [triggerPrice, setTriggerPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bottom Tab
  const [bottomTab, setBottomTab] = useState('positions');

  // Chart refs
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const mainSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);

  // Determine Underlying Index Key & Specs
  let baseIndexKey = 'NIFTY50';
  let indexName = 'NIFTY 50';
  let lotSize = 25;
  if (selectedSymbol.includes('BANK')) {
    baseIndexKey = 'BANKNIFTY';
    indexName = 'BANK NIFTY';
    lotSize = 15;
  } else if (selectedSymbol.includes('FIN')) {
    baseIndexKey = 'FINNIFTY';
    indexName = 'FIN NIFTY';
    lotSize = 25;
  } else if (selectedSymbol.includes('MID')) {
    baseIndexKey = 'MIDCAPNIFTY';
    indexName = 'MIDCAP NIFTY';
    lotSize = 50;
  } else if (selectedSymbol.includes('SENSEX')) {
    baseIndexKey = 'SENSEX';
    indexName = 'BSE SENSEX';
    lotSize = 10;
  }

  // Update lot size when index changes
  useEffect(() => {
    setQuantity(lotSize);
  }, [baseIndexKey, lotSize]);

  // Index Live Spot
  const currentTick = ticks[baseIndexKey] || { ltp: 22702.05, ch: 141.20, chp: 0.62 };
  const indexLtp = Number(currentTick.ltp || (optionChainData?.spot_price) || 22702.05);
  const indexCh = Number(currentTick.ch !== undefined ? currentTick.ch : 141.20);
  const indexChp = Number(currentTick.chp !== undefined ? currentTick.chp : 0.62);

  // Is current chart viewing an un-tradable Index or a tradable Option?
  const isViewingIndex = instrumentCategory === 'indices';

  // Find Option Contract Details if viewing option
  const activeStrikes = optionChainData?.strikes || [];
  const currentOptionRow = activeStrikes.find((s) => s.strike_price === selectedOptionStrike);
  const currentOptionContract = currentOptionRow
    ? (selectedOptionType === 'CE' ? currentOptionRow.call : currentOptionRow.put)
    : null;

  // Active chart LTP & Change
  const ltp = isViewingIndex
    ? indexLtp
    : (currentOptionContract?.ltp || (selectedOptionType === 'CE' ? 25.35 : 1.60));
  const ch = isViewingIndex
    ? indexCh
    : (currentOptionContract?.ch !== undefined ? currentOptionContract.ch : 17.85);
  const chp = isViewingIndex
    ? indexChp
    : (currentOptionContract?.chp !== undefined ? currentOptionContract.chp : 238.0);

  // Active Trading Symbol name
  const tradingSymbolDisplay = isViewingIndex
    ? `${indexName} (INDEX)`
    : `${baseIndexKey} ${selectedOptionExpiry.split(' ')[0]} ${selectedOptionStrike} ${selectedOptionType}`;

  // Fetch telemetry (positions, orders & option chain)
  const fetchTelemetry = async () => {
    try {
      const [posData, ordData] = await Promise.all([
        api.dhan.getPositions().catch(() => []),
        api.dhan.getOrders().catch(() => []),
      ]);
      setPositions(Array.isArray(posData) ? posData : []);
      setOrders(Array.isArray(ordData) ? ordData : []);
    } catch (err) {
      console.error('Failed to load telemetry:', err);
    }
  };

  const fetchOptionChain = async () => {
    try {
      const chain = await api.dhan.getOptionChain(baseIndexKey);
      if (chain) {
        setOptionChainData(chain);
        if (chain.atm_strike && !selectedOptionStrike) {
          setSelectedOptionStrike(chain.atm_strike);
        }
      }
    } catch (err) {
      console.error('Failed to load option chain:', err);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    fetchOptionChain();
    const interval = setInterval(fetchTelemetry, 3000);
    return () => clearInterval(interval);
  }, [baseIndexKey]);

  // Active Positions & Orders
  const activePositions = positions.filter((p) => p.netQty !== 0);
  const pendingOrders = orders.filter((o) => ['PENDING', 'TRANSIT'].includes(o.orderStatus));

  // Initialize and Render Real TradingView Lightweight Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Clean up existing chart instance
    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
      chartInstanceRef.current = null;
    }

    const container = chartContainerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 520;

    // 1. Create Chart with TradingView Dark Theme
    const chart = createChart(container, {
      width,
      height,
      layout: {
        background: { type: ColorType.Solid, color: '#090d14' },
        textColor: '#94a3b8',
        fontSize: 11,
        fontFamily: "'JetBrains Mono', 'Inter', monospace",
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.04)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.04)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          width: 1,
          color: 'rgba(255, 255, 255, 0.25)',
          style: LineStyle.Dashed,
          labelBackgroundColor: '#1e293b',
        },
        horzLine: {
          width: 1,
          color: 'rgba(255, 255, 255, 0.25)',
          style: LineStyle.Dashed,
          labelBackgroundColor: '#1e293b',
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
        scaleMargins: {
          top: 0.08,
          bottom: showVolume ? 0.22 : 0.08,
        },
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    chartInstanceRef.current = chart;

    // 2. Add Main Price Series (Candles / Line / Area)
    let mainSeries;
    if (chartType === 'candles') {
      mainSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#10b981',
        downColor: '#f43f5e',
        borderVisible: false,
        wickUpColor: '#10b981',
        wickDownColor: '#f43f5e',
      });
    } else if (chartType === 'area') {
      mainSeries = chart.addSeries(AreaSeries, {
        topColor: 'rgba(16, 185, 129, 0.35)',
        bottomColor: 'rgba(16, 185, 129, 0.02)',
        lineColor: '#10b981',
        lineWidth: 2,
      });
    } else {
      mainSeries = chart.addSeries(LineSeries, {
        color: '#10b981',
        lineWidth: 2,
      });
    }
    mainSeriesRef.current = mainSeries;

    // 3. Add Volume Histogram Series
    let volumeSeries = null;
    if (showVolume) {
      volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume_scale',
      });
      volumeSeries.priceScale().applyOptions({
        scaleMargins: {
          top: 0.82,
          bottom: 0,
        },
      });
      volumeSeriesRef.current = volumeSeries;
    }

    // 4. Fetch Real Historical OHLCV Data from Backend
    setIsLoading(true);
    const querySymbol = isViewingIndex
      ? selectedSymbol
      : `${baseIndexKey} ${selectedOptionExpiry.split(' ')[0]} ${selectedOptionStrike} ${selectedOptionType}`;

    api.fyers
      .getHistory(querySymbol, timeframe)
      .then((res) => {
        if (res && Array.isArray(res.candles) && res.candles.length > 0) {
          const sorted = [...res.candles].sort((a, b) => a.time - b.time);

          if (chartType === 'candles') {
            mainSeries.setData(
              sorted.map((c) => ({
                time: c.time,
                open: Number(c.open),
                high: Number(c.high),
                low: Number(c.low),
                close: Number(c.close),
              }))
            );
          } else {
            mainSeries.setData(
              sorted.map((c) => ({
                time: c.time,
                value: Number(c.close),
              }))
            );
          }

          if (volumeSeries) {
            volumeSeries.setData(
              sorted.map((c) => ({
                time: c.time,
                value: Number(c.volume || 0),
                color: c.close >= c.open ? 'rgba(16, 185, 129, 0.35)' : 'rgba(244, 63, 94, 0.35)',
              }))
            );
          }

          const last = sorted[sorted.length - 1];
          setCurrentBar(last);
          chart.timeScale().fitContent();
        }
      })
      .catch((err) => {
        console.error('Failed to load historical candles:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });

    // 5. Crosshair hover subscription for legend update
    chart.subscribeCrosshairMove((param) => {
      if (param.time) {
        const seriesData = param.seriesData.get(mainSeries);
        if (seriesData) {
          setCurrentBar(seriesData);
        }
      }
    });

    // 6. Draw Real-time Position Entry and Order Price Lines
    activePositions.forEach((pos) => {
      if (pos.buyAvg > 0) {
        mainSeries.createPriceLine({
          price: Number(pos.buyAvg),
          color: '#10b981',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `POS: ${pos.tradingSymbol} (${pos.netQty})`,
        });
      }
      if (pos.stopLoss > 0) {
        mainSeries.createPriceLine({
          price: Number(pos.stopLoss),
          color: '#f43f5e',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: `SL: ₹${pos.stopLoss}`,
        });
      }
      if (pos.takeProfit > 0) {
        mainSeries.createPriceLine({
          price: Number(pos.takeProfit),
          color: '#10b981',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: `TARGET: ₹${pos.takeProfit}`,
        });
      }
    });

    pendingOrders.forEach((ord) => {
      const p = ord.price || ord.triggerPrice;
      if (p > 0) {
        mainSeries.createPriceLine({
          price: Number(p),
          color: '#fbbf24',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `LIMIT #${ord.orderId}`,
        });
      }
    });

    // 7. Auto-Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width: newWidth, height: newHeight } = entries[0].contentRect;
      chart.applyOptions({ width: newWidth, height: newHeight });
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartInstanceRef.current = null;
    };
  }, [
    selectedSymbol,
    instrumentCategory,
    selectedOptionStrike,
    selectedOptionType,
    selectedOptionExpiry,
    timeframe,
    chartType,
    showVolume,
    activePositions.length,
    pendingOrders.length,
  ]);

  // Handle Square Off Position
  const handleExitPosition = async (pos) => {
    try {
      const oppSide = pos.netQty > 0 ? 'SELL' : 'BUY';
      await api.dhan.placeOrder({
        dhanClientId: localStorage.getItem('anvil_client_id') || '1000000001',
        correlationId: `exit_${Date.now()}`,
        transactionType: oppSide,
        exchangeSegment: pos.exchangeSegment || 'NSE_FNO',
        productType: pos.productType || 'INTRADAY',
        orderType: 'MARKET',
        validity: 'DAY',
        securityId: pos.securityId,
        tradingSymbol: pos.tradingSymbol,
        quantity: Math.abs(pos.netQty),
        price: 0,
      });
      addToast('success', `Squared off ${pos.tradingSymbol}`);
      fetchTelemetry();
      if (onRefreshAccount) onRefreshAccount();
    } catch (err) {
      addToast('error', err.message || 'Exit failed.');
    }
  };

  // Handle Cancel Order
  const handleCancelOrder = async (orderId) => {
    try {
      await api.dhan.cancelOrder(orderId);
      addToast('success', `Cancelled order #${orderId}`);
      fetchTelemetry();
      if (onRefreshAccount) onRefreshAccount();
    } catch (err) {
      addToast('error', err.message || 'Cancel failed.');
    }
  };

  // Handle Order Placement from Ticket
  const handleExecuteTicket = async () => {
    if (isViewingIndex) {
      addToast('error', 'Index is not a tradable instrument. Please select an Option contract (CE/PE) below.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        dhanClientId: localStorage.getItem('anvil_client_id') || '1000000001',
        correlationId: `chart_${Date.now()}`,
        transactionType: side,
        exchangeSegment: 'NSE_FNO',
        productType: productType,
        orderType: orderType,
        validity: 'DAY',
        securityId: currentOptionContract?.security_id || `${selectedOptionStrike}01`,
        tradingSymbol: currentOptionContract?.trading_symbol || `${baseIndexKey} 26 OCT ${selectedOptionStrike} ${selectedOptionType}`,
        quantity: parseInt(quantity) || lotSize,
        price: orderType === 'LIMIT' ? parseFloat(limitPrice) || ltp : 0,
        triggerPrice: ['STOP_LOSS', 'STOP_LOSS_MARKET'].includes(orderType) ? parseFloat(triggerPrice) || 0 : 0,
        boProfitValue: parseFloat(takeProfit) || 0,
        boStopLossValue: parseFloat(stopLoss) || 0,
      };

      const res = await api.dhan.placeOrder(payload);
      addToast('success', `Order placed: #${res.orderId} [${res.orderStatus}]`);
      fetchTelemetry();
      if (onRefreshAccount) onRefreshAccount();
    } catch (err) {
      addToast('error', err.message || 'Order failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Reset Chart Zoom & View
  const handleResetChartView = () => {
    if (chartInstanceRef.current) {
      chartInstanceRef.current.timeScale().fitContent();
      chartInstanceRef.current.timeScale().resetTimeScale();
      addToast('info', 'Chart view and zoom reset to default (Fit Content).');
    }
  };

  // Handle Reset Order Ticket Fields
  const handleResetTicket = () => {
    setSide('BUY');
    setOrderType('MARKET');
    setProductType('INTRADAY');
    setQuantity(lotSize);
    setLimitPrice('');
    setTriggerPrice('');
    setStopLoss('');
    setTakeProfit('');
    addToast('info', 'Order ticket fields reset to default values.');
  };

  // Handle Reset Ledger / Positions
  const handleResetAccount = async () => {
    if (!window.confirm('Reset sandbox ledger? All open positions will be squared off, pending orders cancelled, and margin restored to initial SOD balance.')) {
      return;
    }
    try {
      await api.account.resetLedger();
      addToast('success', 'Sandbox session and ledger reset to SOD limit (₹5,00,000)!');
      setPositions([]);
      setOrders([]);
      fetchTelemetry();
      if (onRefreshAccount) onRefreshAccount();
    } catch (err) {
      addToast('error', err.message || 'Failed to reset ledger.');
    }

  };


  return (
    <div id="tradingview-charts-page" className="charts-container-responsive" style={{ color: '#f8fafc' }}>
      
      {/* 1. TradingView Top Control Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '10px 16px',
          background: 'rgba(19, 23, 34, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '10px',
          marginBottom: '16px',
        }}
      >
        {/* Left: Instrument Selector & Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Category Toggle: Indices vs Options */}
          <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.5)', padding: '3px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <button
              onClick={() => setInstrumentCategory('indices')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: instrumentCategory === 'indices' ? '#06b6d4' : 'transparent',
                color: instrumentCategory === 'indices' ? '#000000' : '#94a3b8',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              UNDERLYING INDICES
            </button>
            <button
              onClick={() => setInstrumentCategory('options')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: instrumentCategory === 'options' ? '#10b981' : 'transparent',
                color: instrumentCategory === 'options' ? '#000000' : '#94a3b8',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              OPTION CONTRACTS (CE/PE)
            </button>
          </div>

          {/* Index Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.04)', padding: '5px 12px', borderRadius: '7px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <Activity size={15} color="#06b6d4" />
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.86rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="NIFTY 50" style={{ background: '#131722' }}>NIFTY 50</option>
              <option value="BANK NIFTY" style={{ background: '#131722' }}>BANK NIFTY</option>
              <option value="FIN NIFTY" style={{ background: '#131722' }}>FIN NIFTY</option>
              <option value="MIDCAP NIFTY" style={{ background: '#131722' }}>MIDCAP NIFTY</option>
              <option value="SENSEX" style={{ background: '#131722' }}>BSE SENSEX</option>
            </select>
          </div>

          {/* Option Strike & Type Pickers (Visible when in Options mode) */}
          {instrumentCategory === 'options' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Strike Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255, 255, 255, 0.04)', padding: '5px 10px', borderRadius: '7px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>STRIKE:</span>
                <select
                  value={selectedOptionStrike}
                  onChange={(e) => setSelectedOptionStrike(Number(e.target.value))}
                  style={{ background: 'transparent', border: 'none', color: '#fbbf24', fontWeight: 800, fontSize: '0.86rem', outline: 'none', cursor: 'pointer' }}
                >
                  {activeStrikes.length > 0 ? (
                    activeStrikes.map((s) => (
                      <option key={s.strike_price} value={s.strike_price} style={{ background: '#131722' }}>
                        {s.strike_price} {s.is_atm ? '(ATM)' : ''}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value={22650} style={{ background: '#131722' }}>22650</option>
                      <option value={22700} style={{ background: '#131722' }}>22700 (ATM)</option>
                      <option value={22750} style={{ background: '#131722' }}>22750</option>
                    </>
                  )}
                </select>
              </div>

              {/* CE / PE Buttons */}
              <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.5)', padding: '2px', borderRadius: '6px' }}>
                <button
                  onClick={() => setSelectedOptionType('CE')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '5px',
                    border: 'none',
                    background: selectedOptionType === 'CE' ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
                    color: selectedOptionType === 'CE' ? '#10b981' : '#94a3b8',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  CALL (CE)
                </button>
                <button
                  onClick={() => setSelectedOptionType('PE')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '5px',
                    border: 'none',
                    background: selectedOptionType === 'PE' ? 'rgba(244, 63, 94, 0.25)' : 'transparent',
                    color: selectedOptionType === 'PE' ? '#f43f5e' : '#94a3b8',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  PUT (PE)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Center: Timeframe & Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Timeframe Pills */}
          <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.4)', borderRadius: '6px', padding: '2px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            {['1m', '3m', '5m', '15m', '1h', '1D'].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  background: timeframe === tf ? 'rgba(6, 182, 212, 0.25)' : 'transparent',
                  color: timeframe === tf ? '#06b6d4' : '#94a3b8',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Chart Style Toggle */}
          <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.4)', borderRadius: '6px', padding: '2px' }}>
            {['candles', 'line', 'area'].map((mode) => (
              <button
                key={mode}
                onClick={() => setChartType(mode)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  background: chartType === mode ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                  color: chartType === mode ? '#ffffff' : '#64748b',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'capitalize',
                  cursor: 'pointer',
                }}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Volume Indicator Toggle */}
          <button
            onClick={() => setShowVolume(!showVolume)}
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              border: 'none',
              background: showVolume ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.04)',
              color: showVolume ? '#10b981' : '#64748b',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            VOL
          </button>
        </div>

        {/* Right: Reset View, Telemetry & Status Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Reset Chart View Button */}
          <button
            id="reset-chart-view-btn"
            title="Reset Chart Zoom & Scales (Fit Content)"
            onClick={handleResetChartView}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#38bdf8',
              borderRadius: '6px',
              padding: '5px 11px',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <RotateCcw size={13} />
            <span>Reset View</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
            TRADINGVIEW V5 ENGINE
          </div>

          <button
            title="Refresh Quotes & Telemetry"
            onClick={() => {
              fetchTelemetry();
              fetchOptionChain();
              setTimeframe((t) => t);
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#94a3b8',
              borderRadius: '6px',
              padding: '6px',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* 2. Main Visual Workspace: Chart + Order Ticket */}
      <div className="charts-workspace-grid">
        
        {/* TradingView Chart Container Card */}
        <div
          style={{
            background: 'rgba(19, 23, 34, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Chart Header Bar: Symbol, Live Price & Dynamic OHLC Legend */}
          <div
            style={{
              padding: '12px 18px',
              background: '#0d111a',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            {/* Symbol & Price */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#ffffff' }}>
                {tradingSymbolDisplay}
              </span>
              <span style={{ fontSize: '1.15rem', fontWeight: 900, color: ch >= 0 ? '#10b981' : '#f43f5e', fontFamily: 'var(--font-mono)' }}>
                ₹{Number(ltp).toFixed(2)}
              </span>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: ch >= 0 ? '#10b981' : '#f43f5e', fontFamily: 'var(--font-mono)' }}>
                {ch >= 0 ? `+${ch.toFixed(2)}` : ch.toFixed(2)} ({chp >= 0 ? `+${chp.toFixed(2)}%` : `${chp.toFixed(2)}%`})
              </span>
            </div>

            {/* TradingView Dynamic OHLC Crosshair Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>
              {currentBar ? (
                <>
                  <span>O: <strong style={{ color: '#ffffff' }}>₹{Number(currentBar.open || currentBar.value || ltp).toFixed(2)}</strong></span>
                  <span>H: <strong style={{ color: '#10b981' }}>₹{Number(currentBar.high || currentBar.value || ltp).toFixed(2)}</strong></span>
                  <span>L: <strong style={{ color: '#f43f5e' }}>₹{Number(currentBar.low || currentBar.value || ltp).toFixed(2)}</strong></span>
                  <span>C: <strong style={{ color: (currentBar.close || currentBar.value || ltp) >= (currentBar.open || ltp) ? '#10b981' : '#f43f5e' }}>₹{Number(currentBar.close || currentBar.value || ltp).toFixed(2)}</strong></span>
                  {currentBar.volume && (
                    <span>VOL: <strong style={{ color: '#06b6d4' }}>{Number(currentBar.volume).toLocaleString('en-IN')}</strong></span>
                  )}
                </>
              ) : (
                <span>Hover over candlesticks to inspect historical bar details</span>
              )}
            </div>
          </div>

          {/* Interactive Lightweight Chart Container */}
          <div
            ref={chartContainerRef}
            className="tradingview-chart-box"
          >
            {isLoading && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(9, 13, 20, 0.75)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 20,
                  gap: '8px',
                  color: '#06b6d4',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                }}
              >
                <RefreshCw size={16} className="animate-spin" />
                <span>Loading Historical Bars...</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Instant Execution Terminal Ticket */}
        <div
          style={{
            background: 'rgba(19, 23, 34, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Header with Reset Form Button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#ffffff', marginBottom: '2px' }}>
                Execution Terminal
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                {tradingSymbolDisplay}
              </div>
            </div>

            <button
              id="reset-ticket-btn"
              title="Reset Order Ticket Form"
              onClick={handleResetTicket}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '5px',
                color: '#94a3b8',
                padding: '4px 8px',
                fontSize: '0.7rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <RotateCcw size={11} />
              <span>Reset</span>
            </button>
          </div>

          {/* CRITICAL RULE: INDEX NON-TRADABLE BANNER */}
          {isViewingIndex ? (
            <div
              style={{
                background: 'rgba(234, 179, 8, 0.08)',
                border: '1px solid rgba(234, 179, 8, 0.3)',
                borderRadius: '8px',
                padding: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#eab308', fontWeight: 800, fontSize: '0.78rem', marginBottom: '4px' }}>
                <AlertTriangle size={15} />
                <span>INDEX IS NON-TRADABLE</span>
              </div>
              <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                Underlying Indian index <strong>{indexName}</strong> cannot be bought or sold directly. Select an active Option Contract below to execute trades.
              </p>

              {/* Quick 1-Click Strike Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button
                  onClick={() => {
                    setInstrumentCategory('options');
                    setSelectedOptionType('CE');
                    setSelectedOptionStrike(22700);
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>Trade ATM Call (22700 CE)</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>₹25.35 →</span>
                </button>

                <button
                  onClick={() => {
                    setInstrumentCategory('options');
                    setSelectedOptionType('PE');
                    setSelectedOptionStrike(22700);
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(244, 63, 94, 0.4)',
                    background: 'rgba(244, 63, 94, 0.15)',
                    color: '#f43f5e',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>Trade ATM Put (22700 PE)</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>₹1.60 →</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Option Mode Active: Buy / Sell Toggle */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  onClick={() => setSide('BUY')}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: side === 'BUY' ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: side === 'BUY' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                    color: side === 'BUY' ? '#10b981' : '#94a3b8',
                    fontWeight: 800,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                  }}
                >
                  BUY / LONG
                </button>
                <button
                  onClick={() => setSide('SELL')}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: side === 'SELL' ? '2px solid #f43f5e' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: side === 'SELL' ? 'rgba(244, 63, 94, 0.2)' : 'transparent',
                    color: side === 'SELL' ? '#f43f5e' : '#94a3b8',
                    fontWeight: 800,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                  }}
                >
                  SELL / SHORT
                </button>
              </div>

              {/* Product & Order Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', marginBottom: '4px' }}>PRODUCT</label>
                  <select
                    value={productType}
                    onChange={(e) => setProductType(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#0b0e15',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#ffffff',
                      padding: '8px',
                      borderRadius: '6px',
                      fontSize: '0.76rem',
                    }}
                  >
                    <option value="INTRADAY">MIS (Intraday)</option>
                    <option value="CNC">NRML (Carry)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', marginBottom: '4px' }}>ORDER TYPE</label>
                  <select
                    value={orderType}
                    onChange={(e) => setOrderType(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#0b0e15',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#ffffff',
                      padding: '8px',
                      borderRadius: '6px',
                      fontSize: '0.76rem',
                    }}
                  >
                    <option value="MARKET">Market</option>
                    <option value="LIMIT">Limit</option>
                    <option value="STOP_LOSS">Stop Loss (SL)</option>
                  </select>
                </div>
              </div>

              {/* Quantity Stepper */}
              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', color: '#64748b', marginBottom: '4px' }}>
                  QUANTITY (LOT SIZE: {lotSize})
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => setQuantity((q) => Math.max(lotSize, q - lotSize))}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#ffffff',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      cursor: 'pointer',
                    }}
                  >
                    <Minus size={14} />
                  </button>
                  <input
                    type="number"
                    step={lotSize}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || lotSize)}
                    style={{
                      flex: 1,
                      background: '#0b0e15',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#ffffff',
                      padding: '8px',
                      borderRadius: '6px',
                      textAlign: 'center',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                    }}
                  />
                  <button
                    onClick={() => setQuantity((q) => q + lotSize)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#ffffff',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Stop Loss (SL) & Take Profit (TP) Webhook Trigger Inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', color: '#f43f5e', marginBottom: '4px' }}>
                    STOP LOSS (SL ₹)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="e.g. 15.00"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#0b0e15',
                      border: '1px solid rgba(244, 63, 94, 0.3)',
                      color: '#ffffff',
                      padding: '8px',
                      borderRadius: '6px',
                      fontSize: '0.76rem',
                      fontFamily: 'var(--font-mono)',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', color: '#10b981', marginBottom: '4px' }}>
                    TARGET (TP ₹)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="e.g. 45.00"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#0b0e15',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: '#ffffff',
                      padding: '8px',
                      borderRadius: '6px',
                      fontSize: '0.76rem',
                      fontFamily: 'var(--font-mono)',
                    }}
                  />
                </div>
              </div>

              <div style={{ fontSize: '0.66rem', color: '#64748b', lineHeight: 1.3 }}>
                ⚡ Auto SL/TP bracket triggers real-time market order & dispatches Dhan v2 webhook postback.
              </div>

              {/* Execute Button */}
              <button
                onClick={handleExecuteTicket}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: side === 'BUY' ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #f43f5e, #e11d48)',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  boxShadow: side === 'BUY' ? '0 4px 14px rgba(16, 185, 129, 0.3)' : '0 4px 14px rgba(244, 63, 94, 0.3)',
                }}
              >
                {isSubmitting ? 'Submitting...' : `${side} ${quantity} QTY @ ₹${Number(ltp).toFixed(2)}`}
              </button>
            </>
          )}
        </div>
      </div>

      {/* 3. Bottom Active Telemetry Workspace (Positions & Orders) */}
      <div
        style={{
          background: 'rgba(19, 23, 34, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '10px',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: '#131722' }}>
          <button
            onClick={() => setBottomTab('positions')}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: bottomTab === 'positions' ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
              color: bottomTab === 'positions' ? '#06b6d4' : '#64748b',
              fontWeight: 800,
              fontSize: '0.78rem',
              cursor: 'pointer',
              borderBottom: bottomTab === 'positions' ? '2px solid #06b6d4' : 'none',
            }}
          >
            ACTIVE POSITIONS ({activePositions.length})
          </button>
          <button
            onClick={() => setBottomTab('orders')}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: bottomTab === 'orders' ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
              color: bottomTab === 'orders' ? '#fbbf24' : '#64748b',
              fontWeight: 800,
              fontSize: '0.78rem',
              cursor: 'pointer',
              borderBottom: bottomTab === 'orders' ? '2px solid #fbbf24' : 'none',
            }}
          >
            PENDING ORDERS ({pendingOrders.length})
          </button>

          {/* Reset Sandbox Ledger Button */}
          <button
            id="reset-sandbox-ledger-btn"
            title="Reset sandbox positions and ledger"
            onClick={handleResetAccount}
            style={{
              marginLeft: 'auto',
              marginRight: '12px',
              alignSelf: 'center',
              padding: '5px 12px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <RotateCcw size={12} />
            <span>Reset Ledger</span>
          </button>
        </div>

        <div style={{ overflowX: 'auto', padding: '12px 18px' }}>
          {bottomTab === 'positions' ? (
            <table className="trading-table" style={{ width: '100%', fontSize: '0.76rem' }}>
              <thead>
                <tr>
                  <th>INSTRUMENT</th>
                  <th>QTY</th>
                  <th>BUY AVG</th>
                  <th>SL / TP</th>
                  <th>REALIZED</th>
                  <th>UNREALIZED P&L</th>
                  <th style={{ textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {activePositions.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                      No active open positions.
                    </td>
                  </tr>
                ) : (
                  activePositions.map((p) => {
                    const unpnl = p.unrealizedProfit || 0;
                    return (
                      <tr key={p.securityId}>
                        <td style={{ fontWeight: 700, color: '#ffffff' }}>{p.tradingSymbol}</td>
                        <td style={{ color: p.netQty > 0 ? '#10b981' : '#f43f5e', fontWeight: 700 }}>
                          {p.netQty > 0 ? `+${p.netQty}` : p.netQty}
                        </td>
                        <td>₹{Number(p.buyAvg || 0).toFixed(2)}</td>
                        <td>
                          {p.stopLoss > 0 ? `SL: ₹${p.stopLoss}` : '—'} / {p.takeProfit > 0 ? `TP: ₹${p.takeProfit}` : '—'}
                        </td>
                        <td style={{ color: p.realizedProfit >= 0 ? '#10b981' : '#f43f5e' }}>
                          ₹{Number(p.realizedProfit || 0).toFixed(2)}
                        </td>
                        <td style={{ color: unpnl >= 0 ? '#10b981' : '#f43f5e', fontWeight: 800 }}>
                          {unpnl >= 0 ? '+' : ''}₹{Number(unpnl).toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => handleExitPosition(p)}
                            style={{
                              background: 'rgba(244, 63, 94, 0.15)',
                              border: '1px solid rgba(244, 63, 94, 0.4)',
                              color: '#f43f5e',
                              borderRadius: '4px',
                              padding: '3px 8px',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Square Off
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            <table className="trading-table" style={{ width: '100%', fontSize: '0.76rem' }}>
              <thead>
                <tr>
                  <th>ORDER ID</th>
                  <th>INSTRUMENT</th>
                  <th>SIDE</th>
                  <th>TYPE</th>
                  <th>QTY</th>
                  <th>TRIGGER / LIMIT PRICE</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {pendingOrders.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                      No pending limit or trigger orders.
                    </td>
                  </tr>
                ) : (
                  pendingOrders.map((o) => (
                    <tr key={o.orderId}>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>#{o.orderId}</td>
                      <td style={{ fontWeight: 700, color: '#ffffff' }}>{o.tradingSymbol}</td>
                      <td style={{ color: o.transactionType === 'BUY' ? '#10b981' : '#f43f5e', fontWeight: 700 }}>
                        {o.transactionType}
                      </td>
                      <td>{o.orderType}</td>
                      <td>{o.quantity}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>₹{Number(o.price || o.triggerPrice || 0).toFixed(2)}</td>
                      <td>
                        <span className="pill-badge badge-amber" style={{ fontSize: '0.62rem' }}>PENDING</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => handleCancelOrder(o.orderId)}
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            color: '#94a3b8',
                            borderRadius: '4px',
                            padding: '3px 8px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
