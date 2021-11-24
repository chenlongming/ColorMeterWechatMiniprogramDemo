import { uint32ToUint8Array, uint8ArrayToHex } from "./utils";

export class Command {
    // 测量序号
    static measureId = 1;

    // 命令完整响应的长度
    responseSize = 0;
    // 命令发送的数据
    content = new Uint8Array(0);
    // 命令响应的数据
    response = new Uint8Array(0);
    // 等待响应的超时时间
    timeout = 3000;
    // 发送的数据是否需要生成和校验值
    needSign = true;
    

    /**
     * @param {Uint8Array|ArrayBuffer|number[]} content
     * @param {number} responseSize 
     * @param {number} timeout 
     * @param {boolean} needSign
     */
    constructor(content, responseSize, timeout = 3000, needSign = true) {
        if (content instanceof Uint8Array) {
            this.content = content;
        } else {
            this.content = new Uint8Array(content);
        }
        this.responseSize = responseSize;
        if (typeof timeout === 'number' && timeout >= 0) {
            this.timeout = timeout;
        }
        this.needSign = needSign;
    }
    
    /**
     * 返回一个 ArrayBuffer 数组, 用于发送
     * @returns {ArrayBuffer[]}
     */
    get data() {
        if (this.content.length === 0) throw new Error('正文内容不能为空');
        const data = [];
        const b = new Uint8Array(this.content.buffer);
        if (this.needSign) {
            b[b.length - 1] = Command.getSign(b);
        }
        for (let i = 0; i < b.length; i += 20) {
            data.push(b.slice(i, i + 20).buffer);
        }
        return data;
    }

    /** 是否接收完成 */
    get isComplete() {
        return this.response.length >= this.responseSize;
    }

    /** 是否有效 */
    get isValid() {
        return Command.getSign(this.response) === this.response[this.response.length - 1];
    }

    /**
     * 填充响应数组
     * @param {ArrayBuffer} buffer 
     */
    fillResponse(buffer) {
        this.response = new Uint8Array([...this.response, ...(new Uint8Array(buffer))]);
    }


    /**
     * 获取和校验值
     * @param {ArrayBuffer|Uint8Array} buffer 
     */
    static getSign(buffer) {
        const _b = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
        let sum = 0;
        _b.slice(0, _b.length - 1).forEach(i => sum += i);
        return new Uint8Array([sum])[0];
    }

    // 唤醒命令
    static WakeUp = new Command([0xf0], 0, 0, false);

    /**
     * 获取测量命令
     * @param {number} mode 
     */
    static measure(mode = 0) {
        Command.measureId += 1;
        const measureId = uint32ToUint8Array(Command.measureId);
        return new Command([0xbb, 1, mode, ...measureId, 0, 0xff, 0], 10, 1500);
    }

    /**
     * 获取测量数据 (Lab)
     * @param {number} mode 
     */
    static getLab(mode = 0) {
        return new Command([0xbb, 3, mode, 0, 0, 0, 0, 0, 0xff, 0], 20, 1500);
    }

    /**
     * 获取测量数据 (RGB)
     * @param {number} mode 
     */
    static getRGB(mode = 0) {
        return new Command([0xbb, 4, mode, 0, 0, 0, 0, 0, 0xff, 0], 20, 1500);
    }

    /**
     * 获取测量的光谱数据
     * @param {number} mode
     */
    static getSpectral(mode = 0) {
        return new Command([0xbb, 2, 0x10 + mode, 0, 0, 0 ,0 ,0, 0xff, 0], 200, 5000);
    }

    /**
     *  白校准
     * @param {number} check 是否判断校准成功 1 判断 0 不判断
     */
    static whiteCalibrate(check = 1) {
        return new Command([0xbb, 0x11, check, 0, 0, 0, 0, 0, 0xff, 0], 10, 1500);
    }


    /**
     * 黑校准
     * @param {number} check 是否判断校准成功
     */
    static blackCalibrate(check = 1) {
        return new Command([0xbb, 0x10, check, 0, 0, 0, 0, 0, 0xff, 0], 10, 1500);
    }


    /** 获取校准状态 */
    static GetCalibrationInf() {
        return new Command([0xbb, 0x1e, 0, 0, 0, 0, 0, 0, 0xff, 0], 20, 1500);
    };



    static GetDeviceInf() {
        return new Command([0xbb, 0x12, 0x01, 0, 0, 0, 0, 0, 0xff, 0], 200, 5000);
    };
}