"use client";

import { useEffect, useState } from "react";
import { differenceInSeconds, format } from "date-fns";

interface CountdownProps {
    targetDate: Date;
    onZero?: () => void;
}

export function Countdown({ targetDate, onZero }: CountdownProps) {
    const [timeLeft, setTimeLeft] = useState(() => {
        const now = new Date();
        const diff = differenceInSeconds(targetDate, now);
        return Math.max(0, diff);
    });

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date();
            const diff = differenceInSeconds(targetDate, now);

            if (diff <= 0) {
                setTimeLeft(0);
                if (onZero) onZero();
                return 0;
            }

            setTimeLeft(diff);
            return diff;
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(timer);
    }, [targetDate, onZero]);

    if (timeLeft <= 0) return <span className="text-muted-foreground font-bold text-[10px] animate-pulse">AGUARDANDO...</span>;

    const hours = Math.floor(timeLeft / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);
    const seconds = timeLeft % 60;

    return (
        <span className="font-mono font-bold text-red-600 animate-pulse">
            {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
    );
}
