/**
 * Uint32 转 Uint8 数组
 * @param {number} n 
 */
export function uint32ToUint8Array(n) {
    return new Uint8Array(new Uint32Array(n).buffer);
}

/**
 * Uint8 数组 转 Float32
 * @param {Uint8Array} raw 
 */
export function uint8ArrayToFloat32(raw) {
    return new Float32Array(raw.buffer)[0];
}


/**
 * Uint8 数组 转 Uint16
 * @param {Uint8Array} raw 
 */
export function uint8ArrayToUint16(raw) {
    return new Uint16Array(raw.buffer)[0];
}


/**
 * Uint8 数组转 Uint32
 * @param {Uint8Array} raw 
 * @returns 
 */
export function uint8ArrayToUnit32(raw) {
    return new Uint32Array(raw.buffer)[0];
}


/**
 * 等待指定时长
 * @param {number} duration 
 */
export function waitFor(duration) {
    return new Promise(resolve => {
        setTimeout(resolve, duration);
    });
}


/**
 * uint8 数组转 hex 字符串
 * @param {Uint8Array} raw 
 */
export function uint8ArrayToHex(raw) {
    const s = [];
    raw.forEach(i => {
        const b = i.toString(16);
        s.push(b.length > 1 ? b : `0${b}`);
    });
    return s.join(' ');
}