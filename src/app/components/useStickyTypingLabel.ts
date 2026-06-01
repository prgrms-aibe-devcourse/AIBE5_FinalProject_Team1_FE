import { useEffect, useRef, useState } from "react";

/**
 * 타이핑 라벨을 잠깐 유지(디바운스)하는 훅.
 *
 * 라벨이 비워져도 `holdMs` 동안 직전 값을 유지하므로, 끊어 입력하거나
 * 멀티유저 "입력 중" 이벤트가 띄엄띄엄 도착해도 인디케이터가 깜빡이지 않는다.
 * 공간을 미리 확보(고정 높이)한 슬롯과 함께 쓰면 레이아웃이 흔들리지 않는다.
 */
export function useStickyTypingLabel(label: string, holdMs = 1500): string {
  const [displayed, setDisplayed] = useState(label);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (label) {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setDisplayed(label);
      return;
    }

    timerRef.current = window.setTimeout(() => {
      setDisplayed("");
      timerRef.current = null;
    }, holdMs);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [label, holdMs]);

  return displayed;
}
