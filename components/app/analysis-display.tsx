'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

interface AnalysisData {
    symbol: string;
    timeframe: string;
    currentPrice: number;
    change24h: number;
    indicators: {
        rsi: { value: number; signal: string };
        macd: { signal: string };
        adx: { value: number; trendStrength: string };
        stochastic?: { k: number; d: number; signal: string };
        bollinger?: { width: number; signal: string };
    };
    signals: {
        up: number;
        down: number;
        neutral: number;
        upScore: number;
        downScore: number;
        alignment: number;
    };
    verdict: {
        direction: 'UP' | 'DOWN' | 'NEUTRAL';
        confidence: number;
        quality: number;
    };
    targets: {
        entry: string;
        target: string;
        stopLoss: string;
        riskReward: number;
    };
}

interface AnalysisStep {
    id: string;
    title: string;
    status: 'pending' | 'loading' | 'complete';
    duration?: number;
    content?: React.ReactNode;
}

interface AnalysisDisplayProps {
    analysisText?: string;
    className?: string;
}

// Parse analysis text from the AI into structured data
function parseAnalysisText(text: string): AnalysisData | null {
    try {
        // Extract symbol and timeframe
        const symbolMatch = text.match(/Analysis complete for ([A-Z]+\/[A-Z]+) on ([A-Z0-9]+) timeframe/i);
        if (!symbolMatch) return null;

        // Extract current price
        const priceMatch = text.match(/Current Price: \$([0-9.]+)/);
        // Extract 24h change
        const changeMatch = text.match(/24h Change: ([+-]?[0-9.]+)%/);
        // Extract RSI
        const rsiMatch = text.match(/RSI: ([0-9.]+) \(([A-Z]+)\)/);
        // Extract MACD
        const macdMatch = text.match(/MACD: ([A-Z]+)/);
        // Extract ADX
        const adxMatch = text.match(/ADX: ([0-9.]+) \(([A-Za-z]+) trend\)/);
        // Extract signals
        const upSignalsMatch = text.match(/UP signals: (\d+) \(score: ([0-9.]+)\)/);
        const downSignalsMatch = text.match(/DOWN signals: (\d+) \(score: ([0-9.]+)\)/);
        // Extract verdict
        const verdictMatch = text.match(/FINAL VERDICT: ([A-Z]+)/);
        const confidenceMatch = text.match(/Confidence: (\d+)%/);
        const qualityMatch = text.match(/Quality Score: (\d+)%/);
        // Extract targets
        const entryMatch = text.match(/Entry: ([^\n]+)/);
        const targetMatch = text.match(/Target: ([^\n]+)/);
        const stopMatch = text.match(/Stop Loss: ([^\n]+)/);
        const rrMatch = text.match(/Risk\/Reward: ([0-9.]+):1/);

        return {
            symbol: symbolMatch[1],
            timeframe: symbolMatch[2],
            currentPrice: parseFloat(priceMatch?.[1] || '0'),
            change24h: parseFloat(changeMatch?.[1] || '0'),
            indicators: {
                rsi: {
                    value: parseFloat(rsiMatch?.[1] || '50'),
                    signal: rsiMatch?.[2] || 'NEUTRAL'
                },
                macd: { signal: macdMatch?.[1] || 'NEUTRAL' },
                adx: {
                    value: parseFloat(adxMatch?.[1] || '25'),
                    trendStrength: adxMatch?.[2] || 'Weak'
                }
            },
            signals: {
                up: parseInt(upSignalsMatch?.[1] || '0'),
                down: parseInt(downSignalsMatch?.[1] || '0'),
                neutral: 9 - parseInt(upSignalsMatch?.[1] || '0') - parseInt(downSignalsMatch?.[1] || '0'),
                upScore: parseFloat(upSignalsMatch?.[2] || '0'),
                downScore: parseFloat(downSignalsMatch?.[2] || '0'),
                alignment: 0
            },
            verdict: {
                direction: (verdictMatch?.[1] as 'UP' | 'DOWN' | 'NEUTRAL') || 'NEUTRAL',
                confidence: parseInt(confidenceMatch?.[1] || '50'),
                quality: parseInt(qualityMatch?.[1] || '50')
            },
            targets: {
                entry: entryMatch?.[1] || 'N/A',
                target: targetMatch?.[1] || 'N/A',
                stopLoss: stopMatch?.[1] || 'N/A',
                riskReward: parseFloat(rrMatch?.[1] || '0')
            }
        };
    } catch {
        return null;
    }
}

function IndicatorBadge({ label, value, signal, strength }: { label: string; value: string | number; signal: string; strength?: number }) {
    const signalColor = signal === 'UP' || signal === 'OVERSOLD' ? 'text-green-400' :
        signal === 'DOWN' || signal === 'OVERBOUGHT' ? 'text-red-400' :
            'text-yellow-400';

    return (
        <div className="glass rounded-lg p-3 border border-border/30">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{label}</div>
            <div className={cn('text-lg font-bold font-mono', signalColor)}>{signal}</div>
            <div className="text-sm text-foreground/70 font-mono">{value}</div>
        </div>
    );
}

export function AnalysisDisplay({ analysisText, className }: AnalysisDisplayProps) {
    const [data, setData] = useState<AnalysisData | null>(null);
    const [steps, setSteps] = useState<AnalysisStep[]>([]);
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        if (!analysisText) return;

        const parsed = parseAnalysisText(analysisText);
        if (parsed) {
            setData(parsed);

            // Simulate step progression
            const stepList: AnalysisStep[] = [
                { id: 'data', title: 'Data Collection', status: 'complete', duration: 1.5 },
                { id: 'indicators', title: 'Technical Analysis', status: 'complete', duration: 3.0 },
                { id: 'signals', title: 'Signal Aggregation', status: 'complete', duration: 2.0 },
                { id: 'verdict', title: 'Final Verdict', status: 'complete', duration: 1.0 },
            ];
            setSteps(stepList);
            setCurrentStep(stepList.length);
        }
    }, [analysisText]);

    if (!data) return null;

    const directionColor = data.verdict.direction === 'UP' ? 'text-green-400' :
        data.verdict.direction === 'DOWN' ? 'text-red-400' :
            'text-yellow-400';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn('glass rounded-2xl border border-primary/20 p-6 space-y-6', className)}
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold text-primary font-mono">{data.symbol}</h3>
                    <p className="text-sm text-muted-foreground font-mono">{data.timeframe} Timeframe</p>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-bold text-foreground font-mono">${data.currentPrice.toFixed(5)}</div>
                    <div className={cn('text-sm font-mono', data.change24h >= 0 ? 'text-green-400' : 'text-red-400')}>
                        {data.change24h >= 0 ? '+' : ''}{data.change24h.toFixed(2)}%
                    </div>
                </div>
            </div>

            {/* Analysis Steps */}
            <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-3">
                    Live AI Analysis
                </div>
                {steps.map((step, index) => (
                    <motion.div
                        key={step.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={cn(
                            'flex items-center justify-between py-2 px-3 rounded-lg transition-colors',
                            step.status === 'complete' ? 'bg-green-500/10' : 'bg-muted/20'
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                'w-2 h-2 rounded-full',
                                step.status === 'complete' ? 'bg-green-400' :
                                    step.status === 'loading' ? 'bg-primary animate-pulse' :
                                        'bg-muted-foreground/30'
                            )} />
                            <span className="text-sm font-mono text-foreground">{step.title}</span>
                        </div>
                        {step.duration && (
                            <span className="text-xs text-muted-foreground font-mono">{step.duration}s</span>
                        )}
                    </motion.div>
                ))}
            </div>

            {/* Indicators Grid */}
            <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-3">
                    Key Indicators
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <IndicatorBadge
                        label="RSI"
                        value={data.indicators.rsi.value.toFixed(1)}
                        signal={data.indicators.rsi.signal}
                    />
                    <IndicatorBadge
                        label="MACD"
                        value="Signal"
                        signal={data.indicators.macd.signal}
                    />
                    <IndicatorBadge
                        label="ADX"
                        value={data.indicators.adx.value.toFixed(1)}
                        signal={data.indicators.adx.trendStrength === 'Strong' ? 'UP' : 'NEUTRAL'}
                    />
                </div>
            </div>

            {/* Signal Summary */}
            <div className="flex gap-4 justify-center">
                <div className="text-center">
                    <div className="text-2xl font-bold text-green-400 font-mono">{data.signals.up}</div>
                    <div className="text-[10px] uppercase text-muted-foreground font-mono">UP</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-red-400 font-mono">{data.signals.down}</div>
                    <div className="text-[10px] uppercase text-muted-foreground font-mono">DOWN</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-400 font-mono">{data.signals.neutral}</div>
                    <div className="text-[10px] uppercase text-muted-foreground font-mono">NEUTRAL</div>
                </div>
            </div>

            {/* Verdict */}
            <div className="glass rounded-xl p-4 border border-primary/30 text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-2">
                    Final Verdict
                </div>
                <div className={cn('text-4xl font-bold font-mono', directionColor)}>
                    {data.verdict.direction}
                </div>
                <div className="flex justify-center gap-6 mt-3">
                    <div>
                        <div className="text-lg font-bold text-foreground font-mono">{data.verdict.confidence}%</div>
                        <div className="text-[10px] uppercase text-muted-foreground font-mono">Confidence</div>
                    </div>
                    <div>
                        <div className="text-lg font-bold text-foreground font-mono">{data.verdict.quality}%</div>
                        <div className="text-[10px] uppercase text-muted-foreground font-mono">Quality</div>
                    </div>
                </div>
            </div>

            {/* Trade Targets */}
            {data.verdict.direction !== 'NEUTRAL' && (
                <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-3">
                        Trade Targets
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="glass rounded-lg p-3 border border-green-500/30">
                            <div className="text-[10px] uppercase text-green-400 font-mono">Entry</div>
                            <div className="text-sm font-mono text-foreground">{data.targets.entry}</div>
                        </div>
                        <div className="glass rounded-lg p-3 border border-primary/30">
                            <div className="text-[10px] uppercase text-primary font-mono">Target</div>
                            <div className="text-sm font-mono text-foreground">{data.targets.target}</div>
                        </div>
                        <div className="glass rounded-lg p-3 border border-red-500/30">
                            <div className="text-[10px] uppercase text-red-400 font-mono">Stop Loss</div>
                            <div className="text-sm font-mono text-foreground">{data.targets.stopLoss}</div>
                        </div>
                    </div>
                    <div className="text-center mt-3">
                        <span className="text-sm text-muted-foreground font-mono">Risk/Reward: </span>
                        <span className="text-sm font-bold text-primary font-mono">{data.targets.riskReward}:1</span>
                    </div>
                </div>
            )}

            {/* Disclaimer */}
            <div className="text-[10px] text-center text-muted-foreground/50 font-mono pt-2 border-t border-border/30">
                ⚠️ AI analysis for educational purposes only. Not financial advice.
            </div>
        </motion.div>
    );
}
