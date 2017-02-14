'use strict';
// coderjoe: http://stackoverflow.com/questions/1267283/how-can-i-create-a-zerofilled-value-using-javascript
const zeroPadNonLog = (num, numZeros) => {
  let n = Math.abs(num);
  let zeros = Math.max(0, numZeros - Math.floor(n).toString().length );
  let zeroString = Math.pow(10, zeros).toString().substr(1);
  if( num < 0 ) {
    zeroString = '-' + zeroString;
  }

  return zeroString + n;
};

module.exports.zeroPadNonLog = zeroPadNonLog;

const zeroPad = (num, numZeros) => {
  if( num === 0 ) { return zeroPadNonLog(num, numZeros); }
  let an = Math.abs(num);
  let digitCount = 1 + Math.floor(Math.log(an) / Math.LN10);
  if (digitCount >= numZeros) {
    return num;
  }
  let zeroString = Math.pow(10, numZeros - digitCount).toString().substr(1);
  return num < 0 ? '-' + zeroString + an : zeroString + an;
};
module.exports.zeroPad = zeroPad;
