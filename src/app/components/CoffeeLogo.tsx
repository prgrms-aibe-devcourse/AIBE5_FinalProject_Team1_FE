import type { CSSProperties } from "react";
import { motion, type MotionValue } from "motion/react";

interface CoffeeLogoProps {
  className?: string;
  style?: CSSProperties;
  alive?: boolean;
  eyeX?: MotionValue<number>;
  eyeY?: MotionValue<number>;
  mood?: "idle" | "focus" | "cta" | "risk" | "success";
}

export function CoffeeLogo({ className = "", style, alive = false, eyeX, eyeY, mood = "idle" }: CoffeeLogoProps) {
  const isCtaMood = mood === "cta";
  const isRiskMood = mood === "risk";
  const isSuccessMood = mood === "success";
  const floatTransition = { duration: 4.2, repeat: Infinity, ease: "easeInOut" } as const;
  const tinyTransition = { duration: 2.8, repeat: Infinity, ease: "easeInOut" } as const;
  const activityDuration = 11.5;
  const transformStyle = { transformBox: "fill-box", transformOrigin: "center" } as const;
  const eyeRadius = 7;
  const earTransition = isRiskMood
    ? { duration: 1.75, repeat: Infinity, ease: "easeInOut", times: [0, 0.24, 0.4, 0.6, 1] }
    : isCtaMood
      ? { duration: 2.05, repeat: Infinity, ease: "easeInOut", times: [0, 0.2, 0.42, 0.62, 1] }
      : { duration: isSuccessMood ? 3.4 : 5.6, repeat: Infinity, ease: "easeInOut", times: [0, 0.22, 0.4, 0.52, 0.66, 0.78, 1] };
  const leftEarAnimation = isRiskMood
    ? { rotate: [0, -9, 2.5, -5, 0], y: [0, -3, 0, -1, 0], scale: [1, 1.055, 1, 1.03, 1] }
    : isCtaMood
      ? { rotate: [0, -7, 3, -4, 0], y: [0, -2, 0, -1, 0], scale: [1, 1.04, 1, 1.025, 1] }
      : {
          rotate: [0, -2.5, 1.2, 0, -7.2, 2.4, 0],
          y: [0, 0, 0, 0, -2.4, -0.4, 0],
          scale: [1, 1, 1, 1, 1.045, 1.01, 1],
        };
  const rightEarAnimation = isRiskMood
    ? { rotate: [0, 9, -2.5, 5, 0], y: [0, -3, 0, -1, 0], scale: [1, 1.055, 1, 1.03, 1] }
    : isCtaMood
      ? { rotate: [0, 7, -3, 4, 0], y: [0, -2, 0, -1, 0], scale: [1, 1.04, 1, 1.025, 1] }
      : {
          rotate: [0, 2.4, -1.2, 0, 7, -2.2, 0],
          y: [0, 0, 0, 0, -2.3, -0.4, 0],
          scale: [1, 1, 1, 1, 1.045, 1.01, 1],
        };

  return (
    <motion.svg
      className={className}
      style={style}
      viewBox="0 0 360 320"
      role="img"
      aria-label="CodeDock logo"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="hoodieCyber" x1="88" y1="140" x2="250" y2="300" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0B1628" />
          <stop offset="0.58" stopColor="#006B6F" />
          <stop offset="1" stopColor="#20E3FF" />
        </linearGradient>

        <linearGradient id="faceGlow" x1="119" y1="132" x2="233" y2="263" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EAF7FF" />
          <stop offset="1" stopColor="#B7FFE3" />
        </linearGradient>

        <linearGradient id="mugCyber" x1="52" y1="218" x2="154" y2="292" gradientUnits="userSpaceOnUse">
          <stop stopColor="#07101D" />
          <stop offset="1" stopColor="#00A9A5" />
        </linearGradient>

        <filter id="cyanGlow" x="-30%" y="-30%" width="170%" height="170%">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#20E3FF" floodOpacity="0.70" />
          <feDropShadow dx="0" dy="0" stdDeviation="14" floodColor="#20E3FF" floodOpacity="0.22" />
        </filter>

        <filter id="greenGlow" x="-30%" y="-30%" width="170%" height="170%">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#39FF88" floodOpacity="0.85" />
          <feDropShadow dx="0" dy="0" stdDeviation="14" floodColor="#39FF88" floodOpacity="0.25" />
        </filter>

        <filter id="softShadow" x="-30%" y="-30%" width="170%" height="170%">
          <feDropShadow dx="0" dy="16" stdDeviation="13" floodColor="#000000" floodOpacity="0.38" />
        </filter>
      </defs>

      <motion.g
        filter="url(#softShadow)"
        animate={alive ? { y: [0, -3, 0], scale: [1, 1.006, 1] } : undefined}
        transition={floatTransition}
        style={{ transformBox: "fill-box", transformOrigin: "50% 64%" }}
      >
        <motion.g
          animate={alive ? { rotate: [0, -0.7, 0.6, 0] } : undefined}
          transition={{ duration: 5.4, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformBox: "fill-box", transformOrigin: "50% 80%" }}
        >
          <path
            d="M93 185c0-48 37-86 84-86s84 38 84 86v48c0 33-27 60-60 60h-48c-33 0-60-27-60-60v-48Z"
            fill="url(#hoodieCyber)"
            stroke="#20E3FF"
            strokeWidth="8"
          />
        </motion.g>

        <motion.g
          animate={alive ? { y: [0, -1.6, 0], rotate: [0, 0.6, -0.4, 0] } : undefined}
          transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformBox: "fill-box", transformOrigin: "50% 46%" }}
        >
          <motion.g
            animate={alive ? leftEarAnimation : undefined}
            transition={earTransition}
            style={{ transformBox: "fill-box", transformOrigin: "42% 100%" }}
          >
            <path d="M105 123 125 62l42 52" fill="#EAF7FF" stroke="#20E3FF" strokeWidth="8" strokeLinejoin="round" />
            <motion.path
              d="M123 111 131 84l19 24"
              fill="#B7FFE3"
              opacity="0.92"
              animate={alive ? { opacity: [0.8, 1, 0.86, 0.98, 0.88] } : undefined}
              transition={{ duration: isRiskMood ? 1.75 : 3.1, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.g>

          <motion.g
            animate={alive ? rightEarAnimation : undefined}
            transition={{ ...earTransition, delay: isRiskMood ? 0.08 : 0.14 }}
            style={{ transformBox: "fill-box", transformOrigin: "58% 100%" }}
          >
            <path d="M246 123 226 62l-42 52" fill="#EAF7FF" stroke="#20E3FF" strokeWidth="8" strokeLinejoin="round" />
            <motion.path
              d="M228 111 219 84l-19 24"
              fill="#B7FFE3"
              opacity="0.92"
              animate={alive ? { opacity: [0.82, 0.98, 0.86, 1, 0.9] } : undefined}
              transition={{ duration: isRiskMood ? 1.75 : 3.15, repeat: Infinity, ease: "easeInOut", delay: 0.12 }}
            />
          </motion.g>

          <path
            d="M121 188c0-34 25-62 56-62s56 28 56 62v36c0 24-20 44-44 44h-24c-24 0-44-20-44-44v-36Z"
            fill="url(#faceGlow)"
            stroke="#20E3FF"
            strokeWidth="7"
          />

          <motion.g style={alive ? { x: eyeX, y: eyeY } : undefined}>
            <motion.g
              animate={alive ? { scaleY: [1, 1, 0.18, 1, 1] } : undefined}
              transition={{
                duration: isRiskMood ? 2.7 : 4.8,
                repeat: Infinity,
                ease: "easeInOut",
                times: [0, 0.52, 0.56, 0.62, 1],
              }}
              style={transformStyle}
            >
              <circle cx="153" cy="174" r={eyeRadius} fill="#06111F" />
              <circle cx="201" cy="174" r={eyeRadius} fill="#06111F" />
            </motion.g>
          </motion.g>

          <motion.path
            d="M174 194c5 6 11 6 16 0"
            fill="none"
            stroke="#0B1628"
            strokeWidth="6"
            strokeLinecap="round"
            animate={alive ? { y: [0, isCtaMood ? 1.8 : 1, 0], scaleX: isCtaMood ? [1, 1.28, 1] : [1, 1.04, 1] } : undefined}
            transition={isCtaMood ? { duration: 2.15, repeat: Infinity, ease: "easeInOut" } : tinyTransition}
            style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}
          />

          <motion.path
            d="M135 193h-32M136 209h-28M219 193h32M218 209h28"
            stroke="#00A9A5"
            strokeWidth="5"
            strokeLinecap="round"
            animate={alive ? { x: [-1, 1, -1], opacity: [0.88, 1, 0.88] } : undefined}
            transition={{ duration: 3.3, repeat: Infinity, ease: "easeInOut" }}
          />

          <motion.circle
            cx="135"
            cy="216"
            r="4"
            fill={isRiskMood ? "#FFB4B4" : "#20E3FF"}
            opacity="0.35"
            animate={alive ? { scale: [1, isRiskMood ? 1.6 : 1.35, 1], opacity: [0.28, isRiskMood ? 0.62 : 0.48, 0.28] } : undefined}
            transition={{ duration: isRiskMood ? 1.6 : 2.4, repeat: Infinity, ease: "easeInOut" }}
            style={transformStyle}
          />
          <motion.circle
            cx="219"
            cy="216"
            r="4"
            fill="#39FF88"
            opacity="0.35"
            animate={alive ? { scale: [1, 1.35, 1], opacity: [0.28, 0.48, 0.28] } : undefined}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.18 }}
            style={transformStyle}
          />
        </motion.g>

        <motion.g
          animate={
            alive
              ? {
                  y: [0, -2, -1, -2, 0, 0],
                  rotate: [0, 0.8, -0.4, 0.7, 0, 0],
                }
              : undefined
          }
          transition={{
            duration: activityDuration,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.1, 0.18, 0.26, 0.36, 1],
          }}
          style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
        >
          <path d="M132 232h90c8 0 14 6 13 14l-6 34H125l-6-34c-1-8 5-14 13-14Z" fill="#050B14" stroke="#20E3FF" strokeWidth="4" />
          <motion.path
            d="M144 250h21M176 250h18M204 250h13M145 262h31M187 262h24"
            fill="none"
            stroke="#39FF88"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.6"
            animate={alive ? { opacity: [0.22, 0.9, 0.35, 0.88, 0.24, 0.22] } : undefined}
            transition={{
              duration: activityDuration,
              repeat: Infinity,
              ease: "easeInOut",
              times: [0, 0.1, 0.18, 0.26, 0.36, 1],
            }}
          />
          <motion.ellipse
            cx="144"
            cy="238"
            rx="11"
            ry="8"
            fill="#B7FFE3"
            stroke="#20E3FF"
            strokeWidth="3"
            animate={alive ? { y: [0, 2.4, -1.2, 2.2, 0, 0], rotate: [0, -6, 4, -3, 0, 0] } : undefined}
            transition={{
              duration: activityDuration,
              repeat: Infinity,
              ease: "easeInOut",
              times: [0, 0.1, 0.18, 0.26, 0.36, 1],
            }}
            style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}
          />
          <motion.ellipse
            cx="211"
            cy="238"
            rx="11"
            ry="8"
            fill="#B7FFE3"
            stroke="#20E3FF"
            strokeWidth="3"
            animate={alive ? { y: [0, -1.2, 2.4, -1, 0, 0], rotate: [0, 5, -5, 3, 0, 0] } : undefined}
            transition={{
              duration: activityDuration,
              repeat: Infinity,
              ease: "easeInOut",
              times: [0, 0.1, 0.18, 0.26, 0.36, 1],
            }}
            style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}
          />
          <path d="M107 280h140l-12 18H119l-12-18Z" fill="#050B14" stroke="#20E3FF" strokeWidth="3" />
        </motion.g>

        <motion.g
          animate={
            alive
              ? isCtaMood
                ? { y: [0, -5, 0], rotate: [0, -3.2, 1.6, 0] }
                : {
                    x: [0, 0, 28, 33, 28, 0, 0],
                    y: [0, 0, -18, -31, -19, 0, 0],
                    rotate: [0, 0, -8, -14, -7, 0, 0],
                  }
              : undefined
          }
          transition={
            isCtaMood
              ? { duration: 2.25, repeat: Infinity, ease: "easeInOut", delay: 0.1 }
              : {
                  duration: activityDuration,
                  repeat: Infinity,
                  ease: "easeInOut",
                  times: [0, 0.52, 0.62, 0.68, 0.74, 0.84, 1],
                }
          }
          style={{ transformBox: "fill-box", transformOrigin: "50% 70%" }}
        >
          <motion.path
            d="M74 209c-6-9 5-12 0-21M94 207c-5-8 6-12 1-21M112 211c-5-8 5-11 1-19"
            fill="none"
            stroke="#B7FFE3"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0"
            animate={alive ? { opacity: [0.18, 0.28, 0.72, 0.9, 0.52, 0.18, 0.18], y: [0, -2, -5, -7, -4, 0, 0] } : undefined}
            transition={
              isCtaMood
                ? { duration: 2.25, repeat: Infinity, ease: "easeInOut" }
                : {
                    duration: activityDuration,
                    repeat: Infinity,
                    ease: "easeInOut",
                    times: [0, 0.52, 0.62, 0.68, 0.74, 0.84, 1],
                  }
            }
          />
          <path
            d="M53 221h76l-7 47c-2 14-14 24-28 24H82c-14 0-26-10-28-24l-1-47Z"
            fill="url(#mugCyber)"
            stroke="#20E3FF"
            strokeWidth="7"
            strokeLinejoin="round"
          />
          <ellipse cx="91" cy="221" rx="38" ry="13" fill="#050B14" stroke="#20E3FF" strokeWidth="7" />
          <path d="M127 237h12c13 0 20 10 16 22-4 12-14 19-30 19" fill="none" stroke="#20E3FF" strokeWidth="10" strokeLinecap="round" />
          <text x="65" y="242" fill="#39FF88" fontSize="10.5" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
            PR
          </text>
          <text x="88" y="259" fill="#20E3FF" fontSize="10.5" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
            API
          </text>
          <text x="68" y="276" fill="#39FF88" fontSize="10.5" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
            ERD
          </text>
        </motion.g>

        <motion.g
          animate={alive ? { y: [0, -4, 0], scale: [1, 1.025, 1] } : undefined}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
          style={{ transformBox: "fill-box", transformOrigin: "70% 24%" }}
        >
          <path
            d="M266 54h54c16 0 27 11 27 25s-11 25-27 25h-17l-42 32 14-32h-9c-16 0-27-11-27-25s11-25 27-25Z"
            fill="#0B1628"
            stroke="#20E3FF"
            strokeWidth="7"
            strokeLinejoin="round"
          />
          <motion.circle
            cx="277"
            cy="79"
            r="4.3"
            fill="#20E3FF"
            filter="url(#cyanGlow)"
            animate={alive ? { opacity: [0.45, 1, 0.45] } : undefined}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.circle
            cx="295"
            cy="79"
            r="4.3"
            fill="#39FF88"
            filter="url(#greenGlow)"
            animate={alive ? { opacity: [0.45, 1, 0.45], scale: isSuccessMood ? [1, 1.45, 1] : 1 } : undefined}
            transition={{ duration: isSuccessMood ? 1.05 : 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
            style={transformStyle}
          />
          <motion.circle
            cx="313"
            cy="79"
            r="4.3"
            fill="#20E3FF"
            filter="url(#cyanGlow)"
            animate={alive ? { opacity: [0.45, 1, 0.45] } : undefined}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
          />
        </motion.g>
      </motion.g>
    </motion.svg>
  );
}
