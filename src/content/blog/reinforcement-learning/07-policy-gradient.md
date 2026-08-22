---
title: '策略梯度：直接学习策略'
description: '介绍策略梯度方法的核心思想、参数化策略与目标函数，以及策略梯度定理的表达式与直觉解释。'
pubDate: '2026-08-19'
tags:
  - 强化学习
  - 策略梯度
  - 策略梯度定理
---

## 策略梯度

之前说过，强化学习可以分成两大类方法：

1. 基于价值函数的方法。典型有之前讲过的动态规划、蒙特卡洛方法和 TD 方法等。

2. 基于策略的方法。这一类方法一般称为策略梯度（Policy Gradient）方法。

基于价值的方法本质上是在间接学习策略。它们先学习价值函数 $V(s)$ 或者 $Q(s, a)$，然后通过贪婪策略从中导出最优策略 $\pi^*$。即如果我知道了在当前状态 $s$ 下每个动作的价值 $Q(s, a)$，我就可以选择价值最大的动作。往复循环，自然就有了最优策略 $\pi^*$。

基于策略的方法则是直接学习策略 $\pi$，不依赖价值函数。为此需要将策略 $\pi$ 参数化，记为 $\pi_\theta$。其中 $\theta$ 是策略的参数。通过优化 $\theta$ 来找到最优策略 $\pi^*$。

值得一提的是，策略梯度方法一般用神经网络来表示策略 $\pi_\theta$。神经网络的输入是状态 $s$，输出是动作 $a$ 的概率分布。如果是离散动作空间，输出就是每个动作的概率。有几个动作就在输出层设计几个神经元，用 Softmax 激活函数实现概率归一化。如果是连续动作空间，输出就是动作的均值和方差。输出层一般是两个神经元，一个表示均值 $\mu$，一个表示方差 $\sigma^2$，然后用高斯分布来采样动作。

形式化地说，就是要找到一个最优参数 $\theta^*$，使得在参数化策略 $\pi_\theta$ 下的目标函数 $J(\theta)$ 最大化：

$$
\theta^* = \arg\max_\theta J(\theta)
$$

这里的目标函数 $J(\theta)$ 是人为设计的，用于衡量策略 $\pi_\theta$ 的好坏。

最简单、最直观的目标函数就是期望累积奖励：

$$
J(\theta) = \mathbb{E}_{\tau \sim \pi_\theta} [R(\tau)]
$$

这里的 $\tau$ 表示一个 Rollout（或者说一个 trajectory），$\tau \sim \pi_\theta$ 表示 Rollout 是按照策略 $\pi_\theta$ 生成的，$R(\tau)$ 表示 Rollout 的累积奖励。

使用期望累积奖励来衡量策略的好坏是很自然的。因为强化学习的目标就是最大化累积奖励，所以我们希望选择一个策略 $\pi_\theta$，使得在这个策略下生成的 Rollout 的累积奖励尽可能大。

## 策略梯度定理

为了寻找最优参数 $\theta^*$，我们可以使用梯度上升法（Gradient Ascent）来优化目标函数 $J(\theta)$。更新公式为：

$$
\theta \leftarrow \theta + \alpha \nabla_\theta J(\theta)
$$

为此需要计算目标函数的梯度 $\nabla_\theta J(\theta)$。

根据 $J(\theta)$ 的定义，梯度可以表示为：

$$
\nabla_\theta J(\theta) = \nabla_\theta \mathbb{E}_{\tau \sim \pi_\theta} [R(\tau)]
$$

对上式进行展开，目标函数的梯度可以最终表示为：

$$
\nabla_\theta J(\theta) = \mathbb{E}_{\tau \sim \pi_\theta} \left[ \sum_{t=0}^{T} R(\tau) \nabla_\theta \log \pi_\theta(a_t \mid s_t) \right]
$$

具体的推导过程比较复杂，这里不做展开。感兴趣的读者可以自行查阅相关资料。

这个公式就是著名的策略梯度定理（Policy Gradient Theorem）。它告诉我们，目标函数的梯度可以表示为 Rollout 的累积奖励 $R(\tau)$ 与策略 $\pi_\theta$ 的对数梯度 $\nabla_\theta \log \pi_\theta(a_t \mid s_t)$ 的乘积的期望。

因为梯度总是指向函数值增加最快的方向，所以 $\nabla_\theta \log \pi_\theta(a_t \mid s_t)$ 的方向就是函数 $\log \pi_\theta(a_t \mid s_t)$ 的函数值增大得最快的方向。由于 $\log$ 是单调递增的，所以函数值增大的方向也是函数 $\pi_\theta(a_t \mid s_t)$ 的增大的方向。根据策略函数的定义可以知道，这个方向就是增加动作 $a_t$ 在状态 $s_t$ 下被选择的概率的方向。

于是，梯度的正负方向由累积奖励 $R(\tau)$ 的正负决定。如果一个 Rollout 的累积奖励 $R(\tau)$ 是正数，就会增加 Rollout 中每个动作 $a_t$ 在状态 $s_t$ 下被选择的概率；反之，如果一个 Rollout 的累积奖励 $R(\tau)$ 是负数，就会减少 Rollout 中每个动作 $a_t$ 在状态 $s_t$ 下被选择的概率。$R(\tau)$ 的绝对值决定了更新的幅度。

这个结论和我们的直觉是一致的：如果一个 Rollout 的累积奖励是正数，说明这个 Rollout 是好的，就应该增加 Rollout 中每个动作被选择的概率；反之，如果一个 Rollout 的累积奖励是负数，说明这个 Rollout 是坏的，就应该减少 Rollout 中每个动作被选择的概率。
