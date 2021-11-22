/**
 * Uint32 转 Uint8 数组
 * @param {number} n 
 */
export function uint32ToUint8Array(n) {
    return new Uint8Array(new Uint32Array([n]).buffer);
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


// 二进制转字符串(ascii)
export function bufferToString(buffer) {
    let str = "";
    for (let code of buffer) {
        if (code === 0) break;
        str += utf82string(code);
    }
    return str;
}


/**
 * Lab 转 RGB
 * @param {[number, number, number]} lab 
 * @returns [number, number, number]
 */
export function Lab2RGB(lab) {
    const [l, a, b] = lab;

    let y = (l + 16) / 116;
    let x = a / 500 + y;
    let z = y - b / 200;

    y = y > 6 / 29 ? Math.pow(y, 3) : (y - 16 / 116) / 7.787;
    x = x > 6 / 29 ? Math.pow(x, 3) : (x - 16 / 116) / 7.787;
    z = z > 6 / 29 ? Math.pow(z, 3) : (z - 16 / 116) / 7.787;

    x *= 0.95047;
    z *= 1.08883;

    let red = 3.2406 * x - 1.5372 * y - 0.4986 * z;
    let green = -0.9689 * x + 1.8758 * y + 0.0415 * z;
    let blue = 0.0557 * x - 0.2040 * y + 1.0570 * z;

    red = red > 0.0031308 ? 1.055 * Math.pow(red, 1 / 2.4) - 0.055 : 12.92 * red;
    green = green > 0.0031308 ? 1.055 * Math.pow(green, 1 / 2.4) - 0.055 : 12.92 * green;
    blue = blue > 0.0031308 ? 1.055 * Math.pow(blue, 1 / 2.4) - 0.055 : 12.92 * blue;

    return [
        Math.max(Math.min(Math.round(red * 255), 255), 0),
        Math.max(Math.min(Math.round(green * 255), 255), 0),
        Math.max(Math.min(Math.round(blue * 255), 255), 0)
    ];
}


/**
 * 字符转 utf-8 编码(只处理单个字符)
 * @param {string} char 
 * @returns number
 */
export function string2utf8(char) {
    const unicode = char.charCodeAt(0);
    let utf8code = unicode;
    if (unicode >= 0x80 && unicode <= 0x07ff) {
        // 110xxxxx 10xxxxxx
        utf8code = ((0xc0 + (unicode >> 6)) << 8) + (unicode & 0x3f) + 0x80;
    } else if (unicode >= 0x0800 && unicode <= 0xffff) {
        // 1110xxxx 10xxxxxx 10xxxxxx
        utf8code = ((0xe0 + (unicode >> 12)) << 16) + ((0x80 + ((unicode >> 6) & 0x3f)) << 8) + (unicode & 0x3f) + 0x80;
    } else if (unicode >= 0x010000 && unicode <= 0x10ffff) {
        // 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
        utf8code = ((0xf0 + (unicode >> 18)) << 24) + ((0x80 + ((unicode >> 12) & 0x3f)) << 16) + ((0x80 + ((unicode >> 6) & 0x3f)) << 8) + (unicode & 0x3f) + 0x80;
    }
    return utf8code;
}

/**
 * utf-8 编码转字符
 * @param {number} code 
 * @returns string
 */
export function utf82string(code) {
    if (code >= 0xf0000000) {
        // 四字节 utf-8 编码
        const utf8code = (((code >> 24) & 7) << 21) + (((code >> 16) & 0x3f) << 12) + (((code >> 8) & 0x3f) << 6) + (code & 0x3f);
        return String.fromCharCode(utf8code);
    } else if (code >= 0xe00000 && code < 0xf0000000) {
        // 三字节 utf-8 编码
        const utf8code = (((code >> 16) & 0xf) << 12) + (((code >> 8) & 0x3f) << 6) + (code & 0x3f);
        return String.fromCharCode(utf8code);
    } else if (code >= 0xc000 && code < 0xe00000) {
        // 两字节 utf-8 编码
        const utf8code = (((code >> 8) & 0x1f) << 6) + (code & 0x3f);
        return String.fromCharCode(utf8code);
    } else if (code < 0xc000) {
        // 兼容 Unicode 的编码, 直接返回
        return String.fromCharCode(code);
    }
    return '';
}