/**
 * 집중 모드(타자기 모드 3번) 전용 스포트라이트 그라데이션 마스크 적용 유틸리티.
 * - 가운데(뷰포트 세로 50%, 커서 줄): 100% 선명 (opacity 1)
 * - 위 4줄 / 아래 4줄 (총 약 9줄): 멀어질수록 점진적 투명화
 * - 4줄을 벗어나는 영역: 완전히 투명(보이지 않음)
 */
export function applyFocusSpotlightMask(
  targetEl: HTMLElement | null,
  enabled: boolean,
  viewportHeight: number,
  paperTy: number,
  lineHeightPx: number,
  glideTransition: boolean
): void {
  if (!targetEl) return;

  if (!enabled) {
    targetEl.style.webkitMaskImage = "";
    targetEl.style.maskImage = "";
    targetEl.style.webkitMaskSize = "";
    targetEl.style.maskSize = "";
    targetEl.style.webkitMaskRepeat = "";
    targetEl.style.maskRepeat = "";
    targetEl.style.webkitMaskPosition = "";
    targetEl.style.maskPosition = "";
    targetEl.style.transition = "";
    return;
  }

  const safeLineHeight = Math.max(18, lineHeightPx || 27.2);
  // 가운데 커서 줄(1줄) + 위 4줄 + 아래 4줄 = 총 9줄 영역
  const maskHeight = Math.round(safeLineHeight * 9);

  const gradient = `linear-gradient(to bottom,
    rgba(0, 0, 0, 0) 0%,
    rgba(0, 0, 0, 0.10) 4%,
    rgba(0, 0, 0, 0.28) 12%,
    rgba(0, 0, 0, 0.52) 24%,
    rgba(0, 0, 0, 0.78) 36%,
    rgba(0, 0, 0, 1) 44%,
    rgba(0, 0, 0, 1) 56%,
    rgba(0, 0, 0, 0.78) 64%,
    rgba(0, 0, 0, 0.52) 76%,
    rgba(0, 0, 0, 0.28) 88%,
    rgba(0, 0, 0, 0.10) 96%,
    rgba(0, 0, 0, 0) 100%
  )`;

  // 뷰포트의 세로 50% 위치가 targetEl 내부 어디에 해당하는지 계산
  const focusCenterYInTarget = viewportHeight / 2 - paperTy - targetEl.offsetTop;
  const maskTopY = Math.round(focusCenterYInTarget - maskHeight / 2);

  targetEl.style.webkitMaskImage = gradient;
  targetEl.style.maskImage = gradient;
  targetEl.style.webkitMaskSize = `100% ${maskHeight}px`;
  targetEl.style.maskSize = `100% ${maskHeight}px`;
  targetEl.style.webkitMaskRepeat = "no-repeat";
  targetEl.style.maskRepeat = "no-repeat";

  if (glideTransition) {
    targetEl.style.transition =
      "-webkit-mask-position 0.22s cubic-bezier(0.22, 1, 0.36, 1), mask-position 0.22s cubic-bezier(0.22, 1, 0.36, 1)";
  } else {
    targetEl.style.transition = "none";
  }

  targetEl.style.webkitMaskPosition = `0px ${maskTopY}px`;
  targetEl.style.maskPosition = `0px ${maskTopY}px`;
}
