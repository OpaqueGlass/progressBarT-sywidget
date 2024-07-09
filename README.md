## progress Bar T 进度条

> 展示进度条的思源笔记挂件。

- “自动”模式：绑定任务列表，计算任务列表第一层级完成进度；[^1]
- 手动模式：鼠标拖拽/点击设定进度；
- 时间模式：显示时间段进度；

> 当前版本： v0.2.0
> **新增**：“删除其他挂件”（若不打算再使用任务进度条挂件，此功能用于快速移除位于工作空间内的其他任务进度条挂件）；
> **新增**：（测试中功能，计算方式详见后文）“仅工作日”，计算剩余时间与进度时，跳过法定节假日与周末、并计算调休上班日；
> **改进**：在焦点位于挂件时，支持使用`F5`刷新/保存，`Ctrl+I`打开/关闭设置页面；增加快速填充任务列表块id按钮；
>
> 详见更新日志CHANGELOG.md；[更新日志](CHANGELOG.md) ；

## 快速开始（必读）

- 操作：
  - 单击进度条右侧的文字：刷新/手动模式保存；
  - 双击进度条右侧的文字：显示或隐藏设置；
  - 自动模式仅能统计挂件紧邻的列表或手动设定的列表；
  - （隐藏进度条右侧文字时，请点击显示进度百分比的文字）；

  ![click help](./README.assets/clickhelp.png)

  ![click help](/widgets/progressBarT/README.assets/clickhelp.png)
- 操作成功提示：
  - 成功刷新时，进度百分比将显示上划线；
  - 成功保存时，进度百分比将显示下划线；
- 时间模式：
  - 点击日历图标可使用日历选择器选择日期；
  - 手动输入时间模式日期时，需要满足`年月日时分之间用非数字的字符隔开`的条件，例：`2023年4月14日`、`23:23`；
- 其他常见问题：
  - 文档打开时挂件高度由长变短，影响体验？
    点击“重设挂件高度”按钮或手动拖拽保存一下高度；

> 强烈建议完整阅读此文档；遇到问题？见本文靠后的反馈bug部分向开发者反馈或提出建议。

## 设置&使用方式

### 模式说明

#### 自动模式

默认情况下（任务列表块id为空时），挂件将自动获取**下方紧邻的**任务列表块并计算其进度。（若下方没有任务列表块，则获取挂件上方紧邻的任务列表块）

> （非必需，仅在浮窗等情况下需要）使用左侧的填充图标可以快速填充临近的任务列表块id；

您也可以复制已经存在的任务列表块id（<u>不是列表项块</u>）到设置->任务列表块id中，点击“保存设置”按钮在挂件中应用更改。

![复制任务列表容器块id](README.assets/taskListId.png)

![复制任务列表容器块id](/widgets/progressBarT/README.assets/taskListId.png)

自动模式下，双击`Fn`按钮（需要点开设置才能看到）：取消/完成块id对应的**全部**任务列表项。

> 鼠标悬停在刷新按钮上，有`(API)`标注时，无法在修改任务列表块后自动刷新，需要手动点击刷新按钮计算进度。

#### 手动模式

点击进度条对应位置设定进度，然后点击刷新按钮保存进度，默认将在手动更改后0.5秒自动保存。

进度百分比下方出现下划线并随后消失，表明已经成功保存设定，请确定保存成功后再关闭文档。

#### 时间模式

设置开始时间、结束时间，然后点击“保存设置”按钮。

**挂件接受的时间字符串格式**为：（年、月、日、时、分之间需要使用任意的非数字字符隔开，小时为24小时制）

- `yyyy MM dd`（年 月 日），例如`2020.1.1` `2020年1月1日`
- `yyyy MM dd HH mm` （年 月 日 时 分），例如`2020.1.1 12.20`
- `HH mm`（将在计算进度时自动补全为挂件<u>运行时当天</u>对应时间，用于展示当天进度），例如`12.20` `12:20`

> 若为20xx年，年份数字可只写后两位。

请注意：时间模式下，进度刷新频率由`config.js`设定（请参考自定义设置），默认10分钟刷新一次；

### 自定义设置

打开`${思源data目录}/widgets/progressBarT/static/progressbar.css`，可编辑进度条显示样式，例如：

-  ~~进度条默认颜色；~~ 请注意，进度条颜色设定迁移至config.js设置；
- 按钮样式，等；

#### 在`config.js`中直接更改设置

打开`${思源data目录}/widgets/progressBarT/src/config.js`，可进行自定义设置，请参考设置项旁边的说明。以下是一些可能常用的设置项：

- 手动模式操作后自动保存延迟`saveAttrTimeout`；
- 自动模式API统计时自动计算间隔`refreshInterval`；
- 自定义挂件属性名称`manualAttrName`、`autoTargetAttrName`、`startTimeAttrName`、`endTimeAttrName`等；
- 自动模式：如果块不存在则创建块`createBlock`；
- 时间模式：定时刷新间隔`timeModeRefreshInterval`；
- 显示进度条右侧的刷新和设置按钮`showButtons`；

#### 在`custom.js`中覆盖设置

> 测试中，可能存在缺陷。

创建或编辑`${思源data目录}/widgets/custom.js`，仅支持`config.js`文件中defaultAttr（创建挂件时的默认设置）、setting（全局设置）下的设置项，以下是一个示例。

```javascript
/*方案1：若之前有config，需要添加progressBarT的部分*/
export const config = {
    token: "",
    progressBarT:{/*若之前有config，则只加入progressBarT的部分*/
        setting: { // 和config.js中setting对应
            showButtons: true
        },
        defaultAttr: {// 和config.js 中 defaultAttr对应
            frontColor: "rgba(255, 255, 255, 1)", //前景色更改
            barWidth: 12, //进度条宽度
            frontColorSelector: {//前景色颜色选择器配置（jscolor），像这样复杂的设置项，如果有更改，必须重新自定义全部属性，不能只自定义部分属性
              value: 'rgba(51,153,255,0.5)',
              position: 'bottom',
              height: 80,
              backgroundColor: '#333',
              palette: 'rgba(0,0,0,0) #2da44eff #f1993eff #0080cfff #cb406cff #ff5454ff #af481bff #269affff',//预设颜色组
              paletteCols: 11,
              hideOnPaletteClick: true
            },
        }
    }
   /*...其他挂件的自定义设置*/
};
```

```javascript
/*方案2 单独配置export*/
export const progressBarT = {
    setting: { // 和config.js中setting对应
        showButtons: true
    },
    defaultAttr: {// 和config.js 中 defaultAttr对应
        frontColor: "rgba(255, 255, 255, 1)", //前景色更改
        barWidth: 12 //进度条宽度
    }
}
```

#### 节假日信息

v0.2.0新增了在计算任务进度时“智能”地跳过中国法定节假日以及周末，目前挂件使用的法定节假日数据请悬停在“仅工作日”处查看，或直接参考：`./static/holiday.json`。

如果节假日未能涵盖实际假期，又或者需要使用其他地区的节假日信息，请创建`思源工作空间目录/data/storage/progressBarT/holiday.json`（优先生效），具体格式请参考`./static/holiday.json`。

大致说明如下：

- `holidays`：节假日，这一天将会被记为假期，不统计在剩余时间中；
- `workdays`：工作日，这一天将会被记为工作日，即使是周六或周日；
- 值均为`yyyy-MM-dd`的字符串数组；

> 请注意计算方式（未在这里列出的情况，可能存在计算问题）：
>
> 开始至结束日期间，计算开始日，但不计算结束日，即在结束日当天，将会显示当天（或 还剩0天）；（如果结束日为假日，则结束日视为最后一个工作日）
> 
> 例1 2024-06-30周日~2024-07-01周一，共1天，0工作日；
> 
> 这种情况下，在6月30日便会显示当天，且进度为NaN，这是因为6月30日并不是工作日，则时间段总工作日为0，计算进度百分比时，将出现除以0的情况；
>
> 在已经超过截止日期的情况下，超过x天的计算方式如下：时间段内最后一个工作日至当前时间的全部天数（含假日）；
>
> 例2 2024-07-04周四~2024-07-08周一，共4天，2工作日；
>
> 在这种情况下，周四显示“还有2天”，周五显示“还有1天”，周六日一均会显示当天（因为到截止日，已无工作日）；

#### 隐藏进度百分比

开发者不推荐隐藏进度百分比，因为这未经过测试，且隐藏后不能向用户反馈保存情况；

若要隐藏，可使用css自行实现，隐藏后，可以使用`Ctrl+I`打开关闭设置界面，使用`F5`刷新/保存进度；


## ⚠️注意

> 由于开发者能力有限，挂件还存在一些问题。

- 理论上，自动模式通过页面直接计算任务进度，但有些情况将切换为API统计，需手动点击刷新按钮更新进度。例如：
  - 任务列表和进度条不在同一页面；
  - 任务列表和进度条相距较远；
  - 因为挂件未更新而在新版本失效；
- 没有设置界面，需要自行设定挂件属性；
- 任务完成/取消完成勾选的变动，通过MutationObserver获取对应任务节点的class属性变化实现，频繁高亮、选中任务列表块可能导致卡顿；
- 关于`7alltask`统计子任务功能：
  - 上一层级任务（父任务）完成，其下子任务不会被认为完成，父任务、子任务统计时权重相同；
  - 在进行大量任务节点增删时，会反复触发MutaionObserver（节点变动监视）重设，可能导致卡顿；

## 反馈bug

（推荐）请到github仓库[新建issue](https://github.com/OpaqueGlass/progressBarT-sywidget/issues/new)；

如您无法访问github仓库，请[点击这里填写问卷](https://wj.qq.com/s2/12395364/b69f/)。

## 参考&感谢

开发过程中参考了以下网络博客：

| 博客原文-作者                                                | 备注           |
| ------------------------------------------------------------ | -------------- |
| https://blog.csdn.net/m0_47214030/article/details/117911609 作者：[☆*往事随風*☆](https://blog.csdn.net/m0_47214030) | 进度条鼠标拖拽 |

开发过程中参考了以下大佬的项目：

| github仓库 / 开发者 | 开源协议 | 备注 |
| ----------------| --------| --------------|
| [widget-query](https://github.com/Zuoqiu-Yingyi/widget-query) / [Zuoqiu-Yingyi](https://github.com/Zuoqiu-Yingyi) | AGPL-3.0 | 从custom.js导入自定义设置 |



### 依赖

1. [jQuery](https://jquery.com/) （本项目中通过jQuery选择页面元素）；

```
jQuery JavaScript Library v3.6.0  https://jquery.com/
Copyright OpenJS Foundation and other contributors
Released under the MIT license  https://jquery.org/license
```

2. jsColor

开源协议：[GNU GPL v3](http://www.gnu.org/licenses/gpl-3.0.txt)

官方网站：[https://jscolor.com/download/](https://jscolor.com/download/)

3. [layDate](http://www.layui.com/laydate/)

```
http://www.layui.com/laydate/
https://github.com/layui/laydate
MIT license 
```



### 图标

1. [刷新按钮图标](https://www.iconfinder.com/icons/5402417/refresh_rotate_sync_update_reload_repeat_icon)，作者：[amoghdesign](https://www.iconfinder.com/amoghdesign)，许可协议：[CC3.0 BY-NC](http://creativecommons.org/licenses/by-nc/3.0/)；

2. [设置按钮图标](https://www.iconfinder.com/icons/5925600/control_options_settings_icon)，作者：[IconPai](https://www.iconfinder.com/iconpai)，许可说明：Free for commercial use (Include link to authors website)；



[^1]: 计算默认使用DOM统计任务列表进度、配合MutationObserver在任务列表变化时触发重新统计，但在一些条件下无法使用，详见“注意”一节；
