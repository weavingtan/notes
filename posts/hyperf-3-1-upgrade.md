---
title: Hyperf 3.1 升级踩坑记录
date: 2025-09-18
categories: [技术]
tags: [后端, 微服务, 踩坑实录]
author: Tan
cover: images/post-hyperf.jpg
views: 856
description: 从 2.2 升级到 3.1 过程中遇到的一些问题和解决方案，供大家参考。
---

:::hero[工程演进 · 升级实录]
subtitle | 高性能微服务协程框架平滑迁移实战复盘
badge | 技术架构
:::

:::summary[升级背景]
生产集群在旧版本运行两年，由于 PHP 8.2 新特性支持与协程上下文生命周期优化诉求，团队决定将底层核心框架从 Hyperf 2.2 升级至 3.1 最新稳定版。
:::

## 核心依赖与环境前置要求

```bash
# 升级前的环境基线校验
php -v # 需要 PHP >= 8.1
composer --version
pecl list | grep swoole # 需要 Swoole >= 5.0
```

## 踩坑点一：协程上下文变量隔离

在 3.1 中，Context 的生命周期更为严谨，部分历史代码在中间件中直接注入单例对象的写法触发了协程串包风险。

```php
// 正确实践：每次请求显式从 Context 中存取局部状态
use Hyperf\Context\Context;

Context::set('user_id', $user->id);
$userId = Context::get('user_id');
```

:::metrics
-32% | 协程上下文内存开销
+24% | 并发 QPS 极限承载表现
0 事故 | 全链路平滑灰度上线
:::
