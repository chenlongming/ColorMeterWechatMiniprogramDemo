import { Bluetooth } from "../../utils/bluetooth"

// pages/measure/measure.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    lab: '',
    rgb: ''
  },

  onLoad() {
    Bluetooth.shared.subscribe(this.bleListener);
  },

  bleListener(ev) {
    if (ev.type === 'measure') {
      // 监听用户主动点击设备测量按钮的事件, 需要通过对应的获取仪器数据方法读取本次测量结果
      Bluetooth.shared.getRGB(ev.detail.mode).then(res => {
        wx.showToast(`主动测量结果: R:${res.R}, G: ${res.G}, B: ${res.B}`);
      });
    }
  },


  async measureRGB() {
    const rgb = await Bluetooth.shared.measureAndGetRGB();
    this.setData({ rgb: JSON.stringify(rgb, null, 2) });
  },

  async measureLab() {
    const lab = await Bluetooth.shared.measureAndGetLab();
    this.setData({ lab: JSON.stringify(lab, null, 2) });
  },

  whiteCalibrate() {
    Bluetooth.shared.whiteCalibrate().then(console.log.bind(null, 'white'));
  },

  blackCalibrate() {
    Bluetooth.shared.blackCalibrate().then(console.log.bind(null, 'black'));
  },

  getCalibrationInf() {
    Bluetooth.shared.getCalibrationInf().then(console.log.bind(null, 'calibration'));
  },


  getDeviceInf() {
    Bluetooth.shared.getDeviceInf().then(console.log);
  },

  onUnload() {
    // 退出页面时取消订阅并且断开连接
    Bluetooth.shared.unsubscribe(this.bleListener);
    Bluetooth.shared.disconnect();
  }
})