## 更新日志

### v0.1.2 (2022年12月22日)

- 改进：时间模式时间段输出显示文案，支持显示相隔日期；
- 新增：（beta）支持从`widgets/custom.js`导入用户设置，避免升级后设置丢失；
- 改进：默认隐藏右侧的刷新和设置按钮；
- 改进：除首次插入外，不再重设挂件宽高；

### v0.1.1 (2022年10月17日)

- 修复：子项包括无序列表时，错误计算任务总数的问题；[#5](https://github.com/OpaqueGlass/progressBarT-sywidget/issues/5)

### v0.1.0 (2022年10月2日)

- 新增：支持自动定位紧邻的任务列表块；
- 改进：支持在挂件中设置属性、外观；
- 改进：外观变更，将提示词移动至设置区（时间模式除外），减少视觉干扰；
- 修复：进度条内部#process溢出问题；

### v0.0.1

从这里开始。

- 自动模式
  - DOM模式支持观察任务列表变化，当任务列表发生新增、删除时自动计算进度；（在未来的软件更新中可能不再适用）
  - 支持Fn按钮设定任务全为未完成；
- 手动模式
  - 支持点击、拖拽设定进度；
- 时间模式
  - 支持计算时间进度；