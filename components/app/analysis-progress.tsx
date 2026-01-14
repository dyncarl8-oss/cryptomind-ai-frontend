'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

export interface StepData {
    price?: string;
    change?: string;
    candles?: number;
    rsi?: { value: number; signal: string };
    macd?: { signal: string };
    adx?: { value: number };
    stochastic?: { k: number; d: number };
    upSignals?: number;
    downSignals?: number;
    upScore?: number;
    downScore?: number;
    verdict?: string;
    confidence?: number;
    entry?: string;
    target?: string;
    stop?: string;
}

interface AnalysisStep {
    id: string;
    title: string;
    status: 'pending' | 'loading' | 'complete';
    duration?: number;
    data?: StepData;
}

interface AnalysisProgressProps {
    symbol?: string;
    timeframe?: string;
    isActive: boolean;
    className?: string;
}

function Spinner({ size = 'sm' }: { size?: 'sm' | 'md' }) {
    return (
        <div className={cn(
            'animate-spin rounded-full border-2 border-primary/30 border-t-primary',
            size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
        )} />
    );
}

function ExpandableStep({
    step,
    isExpanded,
    onToggle
}: {
    step: AnalysisStep;
    isExpanded: boolean;
    onToggle: () => void;
}) {
    const statusIcon = step.status === 'loading' ? (
        <Spinner size="sm" />
    ) : step.status === 'complete' ? (
        <div className="w-3 h-3 rounded-full bg-green-500 flex items-center justify-center">
            <svg className="w-2 h-2 text-background" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
        </div>
    ) : (
        <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
    );

    return (
        <div className={cn(
            'border-l-2 transition-all',
            step.status === 'loading' && 'border-primary',
            step.status === 'complete' && 'border-green-500',
            step.status === 'pending' && 'border-muted-foreground/20'
        )}>
            <button
                onClick={onToggle}
                disabled={step.status === 'pending'}
                className={cn(
                    'w-full flex items-center gap-2 py-1.5 px-3 text-left transition-colors',
                    step.status !== 'pending' && 'hover:bg-muted/30 cursor-pointer',
                    step.status === 'pending' && 'opacity-40'
                )}
            >
                {statusIcon}
                <span className={cn(
                    'text-xs font-mono flex-1',
                    step.status === 'loading' && 'text-primary',
                    step.status === 'complete' && 'text-foreground',
                    step.status === 'pending' && 'text-muted-foreground'
                )}>
                    {step.title}
                </span>
                {step.duration && (
                    <span className="text-[10px] text-muted-foreground font-mono">{step.duration.toFixed(1)}s</span>
                )}
                {step.status === 'complete' && step.data && (
                    <svg
                        className={cn('w-3 h-3 text-muted-foreground transition-transform', isExpanded && 'rotate-180')}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                )}
            </button>

            <AnimatePresence>
                {isExpanded && step.status === 'complete' && step.data && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="px-3 pb-2 pt-1 ml-5 text-[10px] font-mono space-y-1 text-muted-foreground border-l border-border/30">
                            {step.id === 'data' && step.data && (
                                <>
                                    <div className="flex justify-between"><span>Price:</span><span className="text-foreground">{step.data.price}</span></div>
                                    <div className="flex justify-between"><span>24h Change:</span><span className={step.data.change?.startsWith('-') ? 'text-red-400' : 'text-green-400'}>{step.data.change}</span></div>
                                    <div className="flex justify-between"><span>Data Points:</span><span className="text-foreground">{step.data.candles} candles</span></div>
                                </>
                            )}
                            {step.id === 'indicators' && step.data && (
                                <>
                                    <div className="flex justify-between"><span>RSI:</span><span className="text-foreground">{step.data.rsi?.value} ({step.data.rsi?.signal})</span></div>
                                    <div className="flex justify-between"><span>MACD:</span><span className="text-foreground">{step.data.macd?.signal}</span></div>
                                    <div className="flex justify-between"><span>ADX:</span><span className="text-foreground">{step.data.adx?.value}</span></div>
                                </>
                            )}
                            {step.id === 'signals' && step.data && (
                                <>
                                    <div className="flex justify-between"><span>UP Signals:</span><span className="text-green-400">{step.data.upSignals} (score: {step.data.upScore})</span></div>
                                    <div className="flex justify-between"><span>DOWN Signals:</span><span className="text-red-400">{step.data.downSignals} (score: {step.data.downScore})</span></div>
                                </>
                            )}
                            {step.id === 'verdict' && step.data && (
                                <div className="space-y-3 pt-1">
                                    <div className={cn(
                                        "flex flex-col items-center justify-center py-3 px-4 rounded-lg border mb-2",
                                        step.data.verdict === 'UP' ? "bg-green-500/10 border-green-500/30 text-green-400" :
                                            step.data.verdict === 'DOWN' ? "bg-red-500/10 border-red-500/30 text-red-400" :
                                                "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                                    )}>
                                        <span className="text-[10px] uppercase tracking-widest opacity-70 mb-1">Final Verdict</span>
                                        <span className="text-2xl font-bold tracking-tighter leading-none">{step.data.verdict}</span>
                                        <span className="text-[10px] mt-1 opacity-80">{step.data.confidence}% Confidence</span>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2 pt-1 border-t border-border/20">
                                        {step.data.entry && (
                                            <div className="flex justify-between items-center group">
                                                <span className="flex items-center gap-2 text-xs opacity-70">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                                                    Entry Zone
                                                </span>
                                                <span className="text-base font-bold text-green-400 bg-green-500/10 px-2 py-1 rounded-md border border-green-500/20 font-mono tracking-tight shadow-sm">{step.data.entry}</span>
                                            </div>
                                        )}
                                        {step.data.target && (
                                            <div className="flex justify-between items-center group">
                                                <span className="flex items-center gap-2 text-xs opacity-70">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                                                    Target Zone
                                                </span>
                                                <span className="text-base font-bold text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded-md border border-cyan-400/20 font-mono tracking-tight shadow-sm">{step.data.target}</span>
                                            </div>
                                        )}
                                        {step.data.stop && (
                                            <div className="flex justify-between items-center group">
                                                <span className="flex items-center gap-2 text-xs opacity-70">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                                    Stop Loss
                                                </span>
                                                <span className="text-base font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded-md border border-red-500/20 font-mono tracking-tight shadow-sm">{step.data.stop}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export function AnalysisProgress({ symbol, timeframe, isActive, finalData, className }: AnalysisProgressProps) {
    const [steps, setSteps] = useState<AnalysisStep[]>([
        { id: 'data', title: 'Data Collection', status: 'pending' },
        { id: 'indicators', title: 'Technical Analysis', status: 'pending' },
        { id: 'signals', title: 'Signal Aggregation', status: 'pending' },
        { id: 'verdict', title: 'Final Verdict', status: 'pending' },
    ]);
    const [expandedStep, setExpandedStep] = useState<string | null>(null);

    useEffect(() => {
        // CASE 1: Component is not active, don't do anything
        if (!isActive && !finalData) return;

        // CASE 2: Final Data is available - HYDRATE IMMEDIATELY
        if (finalData) {
            setSteps(prev => prev.map(s => ({
                ...s,
                status: 'complete',
                data: finalData
            })));
            setExpandedStep('verdict'); // Auto-expand verdict
            return;
        }

        // CASE 3: Simulation Loop (secondary to data)
        let isMounted = true;
        let currentStepIdx = 0;
        let timer: NodeJS.Timeout;

        const runSimulation = () => {
            if (!isMounted || currentStepIdx >= steps.length || finalData) return;

            // Set current step to loading
            setSteps(prev => prev.map((s, i) => ({
                ...s,
                status: i === currentStepIdx ? 'loading' : (i < currentStepIdx ? 'complete' : 'pending')
            })));

            // Faster timings for better feel: 0.8s, 1.2s, 1s, 0.8s
            const stepTimings = [800, 1200, 1000, 800];
            const duration = stepTimings[currentStepIdx] || 1000;

            timer = setTimeout(() => {
                if (!isMounted || finalData) return;

                // Mark current step complete
                setSteps(prev => prev.map((s, i) => {
                    if (i === currentStepIdx) {
                        return { ...s, status: 'complete', duration: duration / 1000 };
                    }
                    return s;
                }));

                // Auto-expand verdict when complete
                if (currentStepIdx === 3) {
                    setExpandedStep('verdict');
                }

                currentStepIdx++;

                if (currentStepIdx < steps.length) {
                    runSimulation();
                }
            }, duration);
        };

        runSimulation();

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [isActive, finalData]);

    if (!isActive && steps.every(s => s.status === 'pending')) return null;

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={cn('rounded-lg border border-primary/20 bg-background/50 overflow-hidden', className)}
        >
            {/* Compact Header */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30 bg-primary/5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] uppercase tracking-wider font-mono text-primary">
                    Analyzing {symbol}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono ml-auto">{timeframe}</span>
            </div>

            {/* Steps */}
            <div className="py-1">
                {steps.map((step) => (
                    <ExpandableStep
                        key={step.id}
                        step={step}
                        isExpanded={expandedStep === step.id}
                        onToggle={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                    />
                ))}
            </div>
        </motion.div>
    );
}
