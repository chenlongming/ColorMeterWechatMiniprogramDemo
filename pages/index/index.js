// index.js
// 获取应用实例
import { Bluetooth } from '../../utils/bluetooth';

const app = getApp()
Page({
  data: {
    discovering: false,
    devices: []
  },

  onLoad () {
    // this.init();
  },

  async init() {
    Bluetooth.shared.subscribe(ev => {
      if (ev.type === 'stateUpdate') {
        this.setData({ discovering: ev.detail.discovering });
      }
    });
  },

  startScan () {
    if (Bluetooth.shared.discovering) {
      wx.showToast({ icon: 'none', title: '正在扫描中' });
    } else if (!Bluetooth.shared.available) {
      wx.showToast({ icon: 'none', title: '蓝牙不可用' });
    } else {
      // 清空掉上一次搜索的结果
      this.setData({ devices: [] });

      // 开始扫描
      Bluetooth.shared.startScan(res => {
        res.devices.forEach(device => {
          // 排除掉已搜索到的设备和名称不合法的设备, 将新发现的设备添加到列表中
          if (/^CM/.test(device.name) && !this.data.devices.find(i => i.deviceId === device.deviceId)) {
            this.setData({ devices: [ ...this.data.devices, device ] });
          }
        });
      }, 10000);
    }
  },

  async connect(ev) {
    try {
      const device = ev.currentTarget.dataset.device;
      await Bluetooth.shared.connect(device);
      wx.navigateTo({
        url: '/pages/measure/measure'
      });
    } catch(e) {
      console.error(e);
      wx.showToast({ title: '连接失败', icon: 'none' });
    }
  }
})
