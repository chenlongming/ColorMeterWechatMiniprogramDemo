## API

### 注意事项

1. 调试时请不要使用微信开发者工具的真机调试功能, 由于真机调试功能会有很大延迟, 导致蓝牙丢包, 请使用预览功能测试
2. 小程序运行需要蓝牙权限, 需要确认微信蓝牙权限正常, 如果是 android 手机, 还需要定位权限

### Bluetooth 类:

*注意: 使用时请通过 `Bluetooth.shared` 方式调用, 不要通过 `new Bluetooth()` 方式创建新的实例*

#### Methods: 

##### `subscribe`, `unsubscribe` 注册和注销事件监听

事件类型: 

1. `stateUpdate`: 适配器状态变化 如: `{ type: 'stateUpdate', detail: { discovering: boolean, available: boolean } }`
2. `connected` 连接成功 如: `{ type: 'connected', detail: { deviceId: string } }`
3. `disconnect` 断开连接 如: `{ type: 'disconnect', detail: { deviceId: string } }`
4. `measure` 点击仪器上的测量按钮测量成功(不包含发送测量命令返回的测量成功) 如: `{ type: 'measure', detail: { mode: number } }`, 获取本次测量成功的仪器数据需要调用对应的获取仪器数据接口如: `getLab`, `getRGB`

示例: 

```javascript
Page({
  onLoad() {
    // 注册事件监听
    Bluetooth.shared.subscribe(this.bleListener);
  },

  bleListener(ev) {
    if (ev.type === 'measure') {
      Bluetooth.shared.getRGB(ev.detail.mode).then(res => {
        wx.showToast(`主动测量结果: R:${res.R}, G: ${res.G}, B: ${res.B}`);
      });
    }
  },
  
  onUnload() {
    // 页面销毁时注销事件监听
    Bluetooth.shared.unsubscribe(this.bleListener);
  }
});
```