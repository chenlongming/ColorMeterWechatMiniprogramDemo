import { Command } from "./command";
import { uint8ArrayToFloat32, uint8ArrayToHex, uint8ArrayToUint16, uint8ArrayToUnit32, waitFor } from "./utils";

/**
 * `Bluetooth` 类封装了微信小程序蓝牙相关的操作:
 * 
 * 1. 小程序 api Promise 化
 * 2. 封装了蓝牙的通信过程, 简化使用方式
 * 3. 封装蓝牙事件, 通过 `subscribe` 方法注册蓝牙事件监听
 * 
 * 该类只是为了演示小程序蓝牙相关的操作流程, 不建议直接用于正式项目
 */
export class Bluetooth {
    /** 请通过 Bluetooth.shared 获取实例, 用于保持全局唯一单例, 不要通过 new Bluetooth() 来获取实例 */
    static shared = new Bluetooth();

    /** 事件监听器 */ 
    listeners = new Set();

    /** 正在扫描设备 */
    discovering = false;
    /** 蓝牙是否可用 */
    available = true;

    /** 当前连接的设备 */
    connected = null;

    /** 正在连接的设备 */
    connecting = null;

    serviceRule = /^0000FFE0/;
    serviceId = null;

    characteristicRule = /^0000FFE1/;
    characteristicId = null;

    /** 正在执行的命令 */
    command = null;
    responseResolve = null;
    responseReject = null;
    responseTimer = null;

    /** 是否显示蓝牙调试信息 */
    debug = true;

    
    constructor() {
        this.init();
    }

    /** 初始化蓝牙 */
    init() {
        this.openAdapter();
        // 绑定事件通知
        wx.onBluetoothAdapterStateChange(res => {
            this.emit({ type: 'stateUpdate', detail: res });
        });
        wx.onBLEConnectionStateChange(res => {
            this.emit({ type: res.connected ? 'connected' : 'disconnect', detail: res });
        });
        wx.onBLECharacteristicValueChange(({ value }) => this.notifySubscriber(value));
        this.subscribe(ev => {
            if (ev.type === 'stateUpdate') {
                // 蓝牙状态发生的变化
                this.discovering = ev.detail.discovering;
                this.available = ev.detail.available;
            } else if (ev.type === 'disconnect' && this.connected && this.connected.deviceId === ev.detail.deviceId) {
                // 断开连接
                this.connected = null;
                wx.showToast({ icon: 'none', title: '蓝牙连接已断开' });
            } else if (ev.type === 'connected' && this.connecting) {
                // 连接成功
                this.connected = this.connecting;
                this.connecting = null;
                wx.showToast({ title: '蓝牙已连接' });
            }
        });
    }

    /**
     * 注册蓝牙事件监听器
     * 事件类型: 
     * 
     * 1. 适配器状态变化 { type: 'stateUpdate', detail: { discovering: boolean, available: boolean } } 
     * 2. 连接成功 { type: 'connected', detail: { deviceId: string } }
     * 3. 断开连接 { type: 'disconnect', detail: { deviceId: string } }
     * 4. 仪器测量成功(不包含发送测量命令返回的测量成功, 获取本次测量成功的仪器数据需要调用对应的获取仪器数据接口如: `getLab`, `getRGB`) { type: 'measure', detail: { mode: number } }
     * 
     * @param {(ev: {type: string; detail: any}) => void} cb 
     */
    subscribe(cb) {
        if (cb) {
            this.listeners.add(cb);
        }
    }

    /** 注销事件监听 */
    unsubscribe(cb) {
        if (cb) {
            this.listeners.delete(cb);
        }
    }

    /**
     * 推送事件
     * @param {{type: string; data: any}} event 
     */
    emit(event) {
        this.listeners.forEach(cb => {
            cb && cb(event);
        });
    }
    
    /** 打开蓝牙适配器 */
    openAdapter() {
        return new Promise((resolve, reject) => {
            wx.openBluetoothAdapter({
                success: resolve,
                fail: reject
            });
        });
    }

    /** 
     * 获取蓝牙适配器状态 
     * @returns {Promise<{discovering: boolean; available: boolean}>}
     */
    getAdapterState() {
        return new Promise((resolve, reject) => {
            wx.getBluetoothAdapterState({
                success: resolve,
                fail: reject
            })
        })
    }

    /**
     * 启动设备扫描
     * @param {(res: { devices: { name: string, deviceId: string, RSSI: number }[] }) => void} cb 
     * @param {number} duration 
     */
    startScan(cb, duration = 30000) {
        wx.onBluetoothDeviceFound(cb);
        return new Promise((resolve, reject) => {
            wx.startBluetoothDevicesDiscovery({
                allowDuplicatesKey: true,
                success: resolve,
                fail: reject
            });

            if (duration > 0) {
                setTimeout(() => {
                    wx.offBluetoothDeviceFound(cb);
                    wx.stopBluetoothDevicesDiscovery();
                }, duration);
            }
        });
    }

    /**
     * 连接设备
     * @param {{ name: string, deviceId: string, RSSI: number }} device 
     */
    async connect(device) {
        try {
            this.connecting = device;
            await this.createConnection(device.deviceId);
            await this.discoverService(device.deviceId);
            await this.discoverCharacteristic(device.deviceId);
            await this.notifyCharacteristicValueChange(device.deviceId);
        } catch (e) {
            this.connecting = null;
            throw e;
        }
    }

    /** 断开当前连接的设备 */
    async disconnect() {
        if (!this.connected || !this.connecting) return;
        if (this.connected) {
            await this.closeConnection(this.connected.deviceId);
            this.connected = null;
            this.resetCommand();
            this.serviceId = null;
            this.characteristicId = null;
        }

        if (this.connecting) {
            await this.closeConnection(this.connecting.deviceId);
            this.connecting = null;
        }
    }

    /** 创建 BLE 连接 */
    createConnection(deviceId) {
        return new Promise((resolve, reject) => {
            wx.createBLEConnection({
                deviceId,
                timeout: 2000,
                success: resolve,
                fail: reject
            });
        });
    }


    /** 关闭 BLE 连接 */
    closeConnection(deviceId) {
        return new Promise((resolve, reject) => {
            wx.closeBLEConnection({
                deviceId,
                success: resolve,
                fail: reject
            });
        });
    }

    /** 搜索服务 */
    discoverService(deviceId) {
        return new Promise((resolve, reject) => {
            wx.getBLEDeviceServices({
                deviceId,
                success: ({ services }) => {
                    const service = services.find(i => this.serviceRule.test(i.uuid));
                    if (!service) {
                        reject(new Error('服务不可用'));
                    } else {
                        this.serviceId = service.uuid;
                        resolve(service);
                    }
                },
                fail: reject
            });
        });
    }


    /** 搜索特征 */
    discoverCharacteristic(deviceId) {
        return new Promise((resolve, reject) => {
            wx.getBLEDeviceCharacteristics({
                deviceId,
                serviceId: this.serviceId,
                success: ({ characteristics }) => {
                    const characteristic = characteristics.find(i => this.characteristicRule.test(i.uuid));
                    if (!characteristic) {
                        reject(new Error('特征不可用'));
                    } else {
                        this.characteristicId = characteristic.uuid;
                        resolve(characteristic);
                    }
                },
                fail: reject
            })
        });
    }

    /** 启动特征通知 */
    notifyCharacteristicValueChange(deviceId, state = true) {
        return new Promise((resolve, reject) => {
            wx.notifyBLECharacteristicValueChange({
                deviceId,
                serviceId: this.serviceId,
                characteristicId: this.characteristicId,
                state,
                success: resolve,
                fail: reject
            });
        });
    }


    /**
     * 通知订阅器
     * @param {ArrayBuffer} buffer 
     */
    notifySubscriber(buffer) {
        if (this.command) {
            if (this.debug) {
                console.log(`[BLE RESP] ${uint8ArrayToHex(new Uint8Array(buffer))}`);
            }
            this.command.fillResponse(buffer);
            if (this.command.isComplete) {
                if (this.command.isValid && this.responseResolve) {
                    this.responseResolve(this.command.response);
                    // console.log(uint8ArrayToHex(this.command.response));
                } else if (!this.command.isValid) {
                    this.responseReject(new Error('无效数据'));
                }
                this.resetCommand();
            }
        } else {
            const uint8Array = new Uint8Array(buffer);
            if (uint8Array[0] === 0xbb && uint8Array[1] === 1 && uint8Array[3] === 0) {
                const ev = { type: 'measure', detail: { mode: uint8Array[2] } };
                this.emit(ev);
            }
        }
    }


    /**
     * 发送命令
     * @param {Command}} command 
     * @returns {Promise<Uint8Array>}
     */
    exec(command) {
        return new Promise(async (resolve, reject) => {
            if (this.command) {
                reject(new Error('正在执行其他命令'));
            } else {
                try {
                    this.command = command;
                    const data = command.data;
                    for (let i = 0; i < data.length; i++) {
                        await this.sendData(data[i]);
                    }

                    if (command.responseSize <= 0) {
                        resolve();
                        this.resetCommand();
                    } else {
                        this.responseReject = reject;
                        this.responseResolve = resolve;
                        this.responseTimer = setTimeout(() => {
                            reject(new Error('命令响应超时'));
                            this.resetCommand();
                        }, command.timeout);
                    }
                } catch (e) {
                    reject(e);
                }
            }
            
        });
    }


    /**
     * 发送命令
     * @param {ArrayBuffer} buffer 
     */
    sendData(buffer) {
        if (this.debug) {
            console.log(`[BLE SEND] ${uint8ArrayToHex(new Uint8Array(buffer))}`);
        }
        return new Promise((resolve, reject) => {
            wx.writeBLECharacteristicValue({
                deviceId: this.connected.deviceId,
                serviceId: this.serviceId,
                characteristicId: this.characteristicId,
                value: buffer,
                success: resolve,
                fail: reject
            })
        });
    }


    resetCommand() {
        if (this.responseTimer) {
            clearTimeout(this.responseTimer);
        }
        this.command = null;
        this.responseResolve = null;
        this.responseReject = null;
        this.responseTimer = null;
    }

    /**
     * 测量
     * @param {number} mode 
     * @returns {Promise}
     */
    async measure(mode = 0) {
        await this.exec(Command.WakeUp);
        await waitFor(50);
        return await this.exec(Command.measure(mode));
    }

    /**
     * 获取测量的 lab 值
     * @param {number} mode 
     * @returns {Promise<{ L: number, a: number, b: number }>}
     */
    async getLab(mode = 0) {
        await this.exec(Command.WakeUp);
        await waitFor(50);
        const data = await this.exec(Command.getLab(mode));
        return {
            L: uint8ArrayToFloat32(data.slice(5, 9)),
            a: uint8ArrayToFloat32(data.slice(9, 13)),
            b: uint8ArrayToFloat32(data.slice(13, 17)),
        };
    }

    /**
     * 测量并获取 lab 值
     * @param {number} mode 
     * @returns {Promise<{L: number, a: number, b: number}>}
     */
    async measureAndGetLab(mode = 0) {
        await this.measure(mode);
        await waitFor(50);
        return await this.getLab(mode);
    }

    /**
     * 获取测量的 RGB 值
     * @param {number} mode 
     * @returns {Promise<{R: number, G: number, B: number}>}
     */
    async getRGB(mode = 0) {
        await this.exec(Command.WakeUp);
        await waitFor(50);
        const data = await this.exec(Command.getRGB(mode));
        return {
            R: uint8ArrayToUint16(data.slice(5, 7)),
            G: uint8ArrayToUint16(data.slice(7, 9)),
            B: uint8ArrayToUint16(data.slice(9, 11))
        }
    }

    /**
     * 测量并获取 RGB 值
     * @param {number} mode 
     * @returns {Promise<{R: number, G: number, B: number}>}
     */
    async measureAndGetRGB(mode = 0) {
        await this.measure(mode);
        await waitFor(50);
        return await this.getRGB(mode);
    }


    async getSpectral(mode = 0) {
        await this.exec(Command.WakeUp);
        await waitFor(50);
        const data = await this.exec(Command.getSpectral(mode));
        const onlyLab = data[3] === 1;
        if (onlyLab) {
            return {
                onlyLab,
                L: uint8ArrayToFloat32(data.slice(184, 188)),
                a: uint8ArrayToFloat32(data.slice(188, 192)),
                b: uint8ArrayToFloat32(data.slice(192, 196))
            }
        } else {
            const waveStart = uint8ArrayToUint16(data.slice(4, 6).reverse());
            const interval = data[6];
            const waveCount = data[7];
            const spectral = [];
            for (let i = 0; i < waveCount; i++) {
                const s = i * 4 + 8;
                const e = s + 4;
                spectral.push(uint8ArrayToFloat32(data.slice(s, e)));
            }

            return {
                onlyLab,
                waveStart,
                waveCount,
                interval,
                spectral,
                L: uint8ArrayToFloat32(data.slice(184, 188)),
                a: uint8ArrayToFloat32(data.slice(188, 192)),
                b: uint8ArrayToFloat32(data.slice(192, 196)),
            }
        }
    }

    async measureAndGetSpectral(mode = 0) {
        await this.measure(mode);
        await waitFor(50);
        return await this.getSpectral(mode);
    }

    /**
     * 白校准
     * @param {number} check 是否判断校准成功
     */
    async whiteCalibrate(check = 0) {
        await this.exec(Command.WakeUp);
        await waitFor(50);
        const data = await this.exec(Command.whiteCalibrate(check));
        return {
            success: check === 0 || (check === 1 && data[2]) === 0,
            timestamp: uint8ArrayToUnit32(data.slice(3, 7))
        };
    }

    /**
     * 黑校准
     * @param {number} check 是否判断校准成功
     * @returns 
     */
    async blackCalibrate(check = 0) {
        await this.exec(Command.WakeUp);
        await waitFor(50);
        const data = await this.exec(Command.blackCalibrate(check));
        return {
            success: check === 0 || (check === 1 && data[2]) === 0,
            timestamp: uint8ArrayToUnit32(data.slice(3, 7))
        };
    }

    /** 获取校准信息 */
    async getCalibrationInf() {
        await this.exec(Command.WakeUp);
        await waitFor(50);
        const data = await this.exec(Command.GetCalibrationInf);
        return {
            whiteCalibrated: data[2] === 1,
            whiteCalibrationTimestamp: uint8ArrayToUnit32(data.slice(3, 7)),
            blackCalibrated: data[7] === 1,
            blackCalibrationTimestamp: uint8ArrayToUnit32(data.slice(8, 12))
        };
    }


    async getDeviceInf() {
        await this.exec(Command.WakeUp);
        await waitFor(50);
        const data = await this.exec(Command.GetDeviceInf);
        return {
            code: uint8ArrayToUint16(data.slice(5, 7))
        };
    }
}