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

  onUnload() {
    // 退出页面时断开连接
    Bluetooth.shared.disconnect();
  }
})