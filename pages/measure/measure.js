import { Bluetooth } from "../../utils/bluetooth"
import { Lab2RGB } from "../../utils/utils";

// pages/measure/measure.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    lab: '',
    rgb: '',
    spectral: ''
  },

  onLoad() {
    Bluetooth.shared.subscribe(this.bleListener);
  },

  bleListener(ev) {
    if (ev.type === 'measure') {
      // 监听用户主动点击设备测量按钮的事件, 需要通过对应的获取仪器数据方法读取本次测量结果
      Bluetooth.shared.getLab(ev.detail.mode).then(res => {
        const [r, g, b] = Lab2RGB([res.L, res.a, res.b]);
        this.setData({ 
          lab: JSON.stringify(res, null, 2) ,
          rgb: JSON.stringify({
            r,
            g,
            b
          }, null, 2)
        });
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
  },

  async measureSpectral() {
    wx.showLoading();
    try {
      const data = await Bluetooth.shared.measureAndGetSpectral();
      console.log(data);
      this.setData({ spectral: ` 是否包含光谱: ${!data.onlyLab}\n 起始波长: ${data.waveStart}nm\n 波长个数: ${data.waveCount}\n 波长间隔: ${data.interval}\n 光谱: ${data.spectral.join(', ')}` });
    } catch (e) {
      console.warn(e);
    }
    wx.hideLoading();
  }
})