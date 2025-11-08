// ==UserScript==
// @name            TechPowerUp CPU/GPU Specs - Simplified Chinese
// @name:zh         TechPowerUp CPU/GPU规格中文化
// @namespace       https://github.com/jc3213/userscript
// @version         0.5
// @description     Translate TechPowerUp CPU, and GPU Specs into Simplified Chinese
// @description:zh  将TechPowerUp关于CPU和GPU规格的相关网页进行中文化
// @author          jc3213
// @match           https://www.techpowerup.com/cpu-specs/*
// @match           https://www.techpowerup.com/gpu-specs/*
// ==/UserScript==

const locale = {
// 处理器
    'Physical': '芯片信息',
    'Processor': '处理器',
    'Core Config': '核心配置',
    'Performance': '规格',
    'Architecture': '架构',
    'Cores': '核心',
    'Cache': '缓存',
    'Features': '功能集',
    'Notes': '其他',
    'Socket:': '插座：',
    'Foundry:': '代工工厂：',
    'Process Size:': '制程：',
    'Transistors:': '晶体管数量：',
    'Die Size:': '芯片面积：',
    'Density': '晶体管密度',
    'Package:': '封装：',
    'I/O Process Size:': 'I/O芯片制程：',
    'I/O Die Size:': 'I/O芯片面积：',
    'I/O Transistors:': 'I/O芯片晶体管：',
    'tCaseMax:': '平均温度：',
    'tJMax:': '最大温度：',
    'Frequency:': '频率：',
    'Turbo Clock:': '睿频：',
    'P-Core Turbo:': '性能核 睿频：',
    'P-Core Boost 3.0:': '性能核 睿频3.0：',
    'E-Core Frequency:': '能效核 频率：',
    'E-Core Turbo Clock:': '能效核 睿频：',
    'Base Clock:': '外频：',
    'Multiplier:': '倍频：',
    'Multiplier Unlocked:': '可超频：',
    'TDP:': '热设计功耗：',
    'PL1:': '功耗锁1：',
    'PL2:': '功耗锁2：',
    'PL2 Tau Limit:': '功耗锁2 上限：',
    'PL2 "Extreme":	': '功耗锁2 极致：',
    'Market:': '市场：',
    'Production Status:': '生产状态：',
    'Release Date:': '发布时间：',
    'Retail Launch:': '上市时间：',
    'Launch Price:': '首发定价：',
    'Launch MSRP:': '首发定价：',
    'Bundled Cooler:': '捆绑散热器：',
    'Codename:': '研发代号：',
    'Generation:': '产品时代：',
    'Part#:': '钢印编号：',
    'PPT:': '典型功耗：',
    'Memory Support:': '内存支持：',
    'DDR4 Speed:': 'DDR4 频率：',
    'DDR5 Speed:': 'DDR5 频率：',
    'Rated Speed:': '内存频率：',
    'Memory Bus:': '内存通道：',
    'Dual-channel': '双通道',
    'Eight-channel': '八通道',
    'ECC Memory:': '内存纠错：',
    'PCI-Express:': 'PCI-E 版本：',
    'Chipsets:': '芯片组：',
    '# of Cores:': '核心数量：',
    '# of Threads:': '线程数量：',
    'Hybrid Cores:': '异构核心：',
    'SMP # CPUs:': '处理器数目：',
    'Integrated Graphics:': '核显：',
    'Cache L0-D:': '零级数据缓存',
    'Cache L0-I:': '零级指令缓存',
    'Cache L1:': '一级缓存：',
    'Cache L2:': '二级缓存：',
    'Cache L3:': '三级缓存：',
    'E-Core L1:': '能效核 一缓：',
    'E-Core L2:': '能效核 二缓：',
// 图形卡
    'Codename:': '研发代号',
    'Graphics Processor': '图形处理器',
    'Graphics Card': '发售信息',
    'Announced': '发布时间',
    'Relative Performance': '相对性能',
    'Clock Speeds': '频率',
    'Memory': '显存',
    'Render Config': '规格',
    'Theoretical Performance': '理论性能',
    'Board Design': '显示卡规格',
    'Graphics Features': '图形特性',
    'GPU Name': '芯片名称',
    'GPU Variant': '芯片变种',
    'Foundry': '代工工厂',
    'Process Size': '制程',
    'Transistors': '晶体管数量',
    'Die Size': '芯片面积',
    'MCD Process': 'MCD制程',
    'Process Type': '制程类型',
    'GCD Transistors': 'GCD晶体管数量',
    'MCD Transistors': 'MCD晶体管数量',
    'GCD Density': 'GCD晶体管密度',
    'MCD Density': 'MCD晶体管密度',
    'GCD Die Size': 'GCD芯片面积',
    'MCD Die Size': 'MCD芯片面积',
    'Chip Package': '芯片封装',
    'Release Date': '售卖时间',
    'Availability': '上市时间',
    'Generation': '产品线',
    'Predecessor': '上一代',
    'Successor': '下一代',
    'Production': '生产状态',
    'Launch Price': '首发价格',
    'Current Price': '现在价格',
    'Bus Interface': '接口界面',
    'Reviews': '评测',
    'GPU Clock': 'GPU频率',
    'Base Clock': '默认频率',
    'Shader Clock': '渲染器频率',
    'Game Clock': '游戏频率',
    'Boost Clock': '最大频率',
    'Memory Clock': '显存频率',
    'Memory Size': '显存容量',
    'Memory Type': '显存类型',
    'Memory Bus': '显存位宽',
    'Bandwidth': '显存带宽',
    'Shading Units': '通用渲染器',
    'TMUs': '纹理单元',
    'ROPs': '光栅化单元',
    'SM Count': 'SM数量',
    'Compute Units': 'CU数量',
    'Tensor Cores': 'Tensor核心',
    'RT Cores': 'RT核心',
    'L0 Cache': '零级缓存',
    'L1 Cache': '一级缓存',
    'L2 Cache': '二级缓存',
    'L3 Cache': '三级缓存',
    'Pixel Rate': '像素填充率',
    'Texture Rate': '纹理填充率',
    'FP16 (half)': '半精度(FP16)',
    'FP32 (float)': '单精度(FP32)',
    'FP64 (double)': '双精度(FP64)',
    'Slot Width': '卡槽',
    'Length': '长',
    'Width': '宽',
    'Height': '高',
    'TDP': '功耗',
    'Suggested PSU': '推荐电源',
    'Outputs': '输出端口',
    'Power Connectors': '电源接口',
    'Board Number': '主板编号',
};

const i18nMap = {
    'table': (table) => {
        [...table.children[0].children].forEach((tr) => [...tr.children].forEach(i18nElement));
    },
    'div': (table) => {
        [...table.children].forEach((tr) => [...tr.children].forEach(i18nElement));
    }
};

setTimeout(() => {
    const section = [...document.querySelectorAll('section')];

    const details = section.slice(0, -1);

    details.forEach((detail) => {
        let [li, table] = detail.children;
        i18nElement(li);
        i18nMap[table.localName]?.(table);
    });
}, 500);

function i18nElement(el) {
    let text = el.innerText;
    let i18n = locale[text];
    if (i18n) {
        el.innerText = i18n;
    } else {
        console.log(text, i18n);
    }
}
