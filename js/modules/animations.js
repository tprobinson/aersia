// Animation functions
import Logger from './logger.js';

// export function easeOutBounce(t, b, c, d) {
//   if ((t = t / d) < (1 / 2.75)) {
//     return c * (7.5625 * t * t) + b;
//   } else if (t < (2 / 2.75)) {
//     return c * (7.5625 * (t = t - (1.5 / 2.75)) * t + 0.75) + b;
//   } else if (t < (2.5 / 2.75)) {
//     return c * (7.5625 * (t = t - (2.25 / 2.75)) * t + 0.9375) + b;
//   }
//   return c * (7.5625 * (t = t - (2.625 / 2.75)) * t + 0.984375) + b;
// }

export function easeInOut(now, beginX, targetX, beginY, targetY ) {
  // y = -x^2 + 1
  return ( -1 * Math.pow(((now - beginX) / targetX) - 1, 2) + 1 )
  // scaled up to the amount that we need to move.
		* (Math.abs(targetY - beginY));
}


// returns click as decimal (.77) of the total object's width
export function clickPercent(e, obj) {
  return (e.pageX - obj.getBoundingClientRect().left) / obj.offsetWidth;
}

export function scrollToSmooth(el, targetScroll, duration) {
  // const   scrollHeight = window.scrollY,
  const beginScroll = el.scrollTop;
  const beginTime = Date.now();

  Logger.get('animation').info(`Beginning animation: ${beginTime} ${beginScroll} to ${targetScroll}`);

  const step = () => {
    // Get our time diff to scale against.
    let now = Date.now();
    if( now <= beginTime + duration ) {
      // This is probably overcomplicated, but this gets the amount we need to add to the initial scroll for our time
      const mod = easeInOut( now, beginTime, duration, beginScroll, targetScroll );
      Logger.get('animation').debug(`anim: ${now - beginTime} + ${mod}`);

      // Set the scroll absolutely
      if( beginScroll < targetScroll ) {
        el.scrollTop = beginScroll + mod;
      } else {
        el.scrollTop = beginScroll - mod;
      }

      // Queue the next frame
      requestAnimationFrame(step);
    } else {
      // Final frame, don't schedule another.
      Logger.get('animation').debug(`Ending animation: end: ${now > (beginTime + duration)} s: ${el.scrollTop}`);
      el.scrollTop = targetScroll;
    }
  };
  requestAnimationFrame(step);
}
