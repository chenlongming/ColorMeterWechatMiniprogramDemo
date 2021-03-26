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

  async measureSpectral() {
    const spectral = await Bluetooth.shared.measureAndGetSpectral();
    console.log(spectral);
  },

  onUnload() {
    // 退出页面时断开连接
    Bluetooth.shared.disconnect();
  }
})