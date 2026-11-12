import React, { useEffect, useState } from "react";
import { useInView } from "motion/react";

interface AnimatedCounterProps {
  value: string;
  duration?: number;
  className?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 1.2,
  className = "",
}) => {
  const ref = React.useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-20px" });
  const [displayValue, setDisplayValue] = useState<string>("0");

  useEffect(() => {
    if (!isInView) return;

    // Parse numeric characters vs prefix/suffix
    const match = value.match(/([\D]*)([\d,.]+)([\D]*)/);
    if (!match) {
      setDisplayValue(value);
      return;
    }

    const prefix = match[1] || "";
    const rawNumber = parseFloat(match[2].replace(/,/g, ""));
    const suffix = match[3] || "";

    if (isNaN(rawNumber)) {
      setDisplayValue(value);
      return;
    }

    const startTime = performance.now();
    const isDecimal = match[2].includes(".");
    const hasCommas = match[2].includes(",");

    const step = (currentTime: number) => {
      const elapsed = (currentTime - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentNumber = rawNumber * easedProgress;

      let formattedNumber: string;
      if (isDecimal) {
        formattedNumber = currentNumber.toFixed(1);
      } else {
        formattedNumber = Math.round(currentNumber).toString();
      }

      if (hasCommas) {
        // Format with commas
        const parts = formattedNumber.split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        formattedNumber = parts.join(".");
      }

      setDisplayValue(`${prefix}${formattedNumber}${suffix}`);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setDisplayValue(value);
      }
    };

    requestAnimationFrame(step);
  }, [isInView, value, duration]);

  return (
    <span ref={ref} className={className}>
      {displayValue}
    </span>
  );
};
