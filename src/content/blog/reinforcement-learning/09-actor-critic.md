---
title: 'Actor-Critic：结合价值方法与策略方法'
description: '介绍 Actor-Critic 方法如何用价值函数作为基线，通过优势函数与 TD 误差更新策略，并得到 A2C 算法。'
pubDate: '2026-08-19'
tags:
  - 强化学习
  - Actor-Critic
  - 优势函数
  - A2C
---

## Actor-Critic 方法

问题在于基线的选择。一个简单的选择是将基线设为当前状态的价值函数 $V(s_t)$，即：

$$
\nabla_\theta J(\theta) = \mathbb{E}_{\tau \sim \pi_\theta} \left[ \sum_{t=0}^{T} (Q(s_t, a_t) - V(s_t)) \nabla_\theta \log \pi_\theta(a_t \mid s_t) \right]
$$

由于 $V(s_t)$ 表示了状态 $s_t$ 期望的累积奖励，所以 $Q(s_t, a_t) - V(s_t)$ 就是优势函数（Advantage Function）$A(s_t, a_t)$，表示了在状态 $s_t$ 下选择动作 $a_t$ 相对于平均水平的好坏程度。于是策略梯度定理的表达式可以改写为：

$$
\nabla_\theta J(\theta) = \mathbb{E}_{\tau \sim \pi_\theta} \left[ \sum_{t=0}^{T} A(s_t, a_t) \nabla_\theta \log \pi_\theta(a_t \mid s_t) \right]
$$

之前说过，基于策略的方法是直接学习策略，不依赖价值函数的，但这里却又引入了值函数 $V(s_t)$。事实上，这是用一个巧妙的方法将基于价值的方法和基于策略的方法结合起来。

具体做法是，用一个 Critic 来学习值函数 $V(s_t)$，然后用这个值函数来计算优势函数 $A(s_t, a_t)$，再用优势函数来更新策略 $\pi_\theta$。这种方法一般称为 Actor-Critic 方法。

公式里同时涉及了 $Q(s_t, a_t)$ 和 $V(s_t)$，看似需要两个模型分别学习不同的函数，但实际上可以只用一个模型来学习 $V(s_t)$，然后用 TD 方法来估计 $Q(s_t, a_t)$，这样可以得到 TD 误差：

$$
\delta_t = r_t + \gamma V(s_{t+1}) - V(s_t)
$$

用 TD 误差 $\delta_t$ 来代替优势函数 $A(s_t, a_t)$，就得到了最终的 Actor-Critic 方法的梯度估计公式：

$$
\nabla_\theta J(\theta) = \mathbb{E}_{\tau \sim \pi_\theta} \left[ \sum_{t=0}^{T} \delta_t \nabla_\theta \log \pi_\theta(a_t \mid s_t) \right]
$$

这个算法就是 Advantage Actor-Critic（A2C）算法。
