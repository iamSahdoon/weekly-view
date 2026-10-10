import { motion as Motion, useReducedMotion } from "motion/react";
import { useState } from "react";

// A block whose content the person switches in place: the day under the week strip,
// the day tab on Team updates (polish, 2026-10-10; design §8.2 #23). The new content
// fades in from 8px on the side it came from (a later day from the right, an earlier
// one from the left), 180ms --ease-out. Nothing waits for an exit, so the switch is
// never slower than it was. First paint is still; under reduced motion it is a fade
// only (MotionConfig drops the transform).
//
//   swapKey  what identifies the content (the weekday)
//   order    its position, so the direction can be told (0–4); optional

const EASE = [0.2, 0, 0, 1];

export function ContentSwap({ swapKey, order, className, children }) {
  // Derived from the previous render (React's "storing information from previous
  // renders" pattern): which way the content moved, and whether it has moved yet.
  const [previous, setPrevious] = useState({ key: swapKey, order });
  const [motion, setMotion] = useState({ moved: false, direction: 0 });
  if (previous.key !== swapKey) {
    setPrevious({ key: swapKey, order });
    setMotion({
      moved: true,
      direction:
        order != null && previous.order != null
          ? Math.sign(order - previous.order)
          : 0,
    });
  }
  const { moved, direction } = motion;
  // Reduced motion: a fade only, nothing travels.
  const offset = useReducedMotion() ? 0 : direction * 8;

  return (
    <Motion.div
      key={swapKey}
      className={className}
      initial={moved ? { opacity: 0, x: offset } : false}
      // `x` (not a transform string) so the element is left with no transform at
      // rest: a lingering one would trap sticky and fixed children.
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.18, ease: EASE }}
    >
      {children}
    </Motion.div>
  );
}
