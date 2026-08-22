---
title: 'REINFORCE：第一个策略梯度算法'
description: '介绍基于策略梯度定理的 REINFORCE 算法，以及引入基线减少梯度估计方差的方法。'
pubDate: '2026-08-19'
tags:
  - 强化学习
  - 策略梯度
  - REINFORCE
  - 基线
---

## REINFORCE 算法

策略梯度定理的表达式中有一项是 $R(\tau)$，它表示整个 Rollout 的累积奖励。如果将整个 Rollout 的累积奖励以当前时刻 $t$ 为界拆成两部分：$R(\tau) = R(\tau_{0:t}) + R(\tau_{t+1:T})$，那么策略梯度定理的表达式可以改写为：

$$
\begin{align*}
\nabla_\theta J(\theta) &= \mathbb{E}_{\tau \sim \pi_\theta} \left[ \sum_{t=0}^{T} [R(\tau_{t+1:T}) + R(\tau_{0:t})] \nabla_\theta \log \pi_\theta(a_t \mid s_t) \right] \\
&= \mathbb{E}_{\tau \sim \pi_\theta} \left[ \sum_{t=0}^{T} R(\tau_{t+1:T}) \nabla_\theta \log \pi_\theta(a_t \mid s_t) \right] + \mathbb{E}_{\tau \sim \pi_\theta} \left[ \sum_{t=0}^{T} R(\tau_{0:t}) \nabla_\theta \log \pi_\theta(a_t \mid s_t) \right] \\
&= \mathbb{E}_{\tau \sim \pi_\theta} \left[ \sum_{t=0}^{T} R(\tau_{t+1:T}) \nabla_\theta \log \pi_\theta(a_t \mid s_t) \right] + \sum_{t=0}^{T} \mathbb{E}_{\tau \sim \pi_\theta} \left[ R(\tau_{0:t}) \nabla_\theta \log \pi_\theta(a_t \mid s_t) \right] && & \small\text{（和的期望等于期望的和）}
\end{align*}
$$

对于第二项来说，由于 $t$ 之前的轨迹 $\tau_{0:t}$ 已经确定了，所以对 $\tau$ 求条件期望等价于对后续的随机变量 $a_t$ 求期望。因此，对于累加和中的每一项都有：

$$
\begin{align*}
&  && \mathbb{E}_{\tau \sim \pi_\theta} \left[R(\tau_{0:t}) \nabla_\theta \log \pi_\theta(a_t \mid s_t) \right] && & \\ 
&= && \mathbb{E}_{a_t \sim \pi_\theta}[R(\tau_{0:t}) \nabla_\theta \log \pi_\theta(a_t \mid s_t)] && & \\
&= && R(\tau_{0:t}) \mathbb{E}_{a_t \sim \pi_\theta}[\nabla_\theta \log \pi_\theta(a_t \mid s_t)] && & \small\text{（}R(\tau_{0:t})\text{ 与 }a_t\text{ 无关，提出期望）} \\
&= && R(\tau_{0:t}) \sum_{a_t} \pi_\theta(a_t \mid s_t) \nabla_\theta \log \pi_\theta(a_t \mid s_t) && & \small\text{（期望的定义）} \\
&= && R(\tau_{0:t}) \sum_{a_t} \pi_\theta(a_t \mid s_t) \frac{\nabla_\theta \pi_\theta(a_t \mid s_t)}{\pi_\theta(a_t \mid s_t)} && & \small\text{（对数求导公式）} \\
&= && R(\tau_{0:t}) \sum_{a_t} \nabla_\theta \pi_\theta(a_t \mid s_t) \\
&= && R(\tau_{0:t}) \nabla_\theta \sum_{a_t} \pi_\theta(a_t \mid s_t) && & \small\text{（求导的线性性质，求和与求导交换）} \\
&= && R(\tau_{0:t}) \nabla_\theta 1 \\
&= && 0 && & \small\text{（常数导数为零）}
\end{align*}
$$

也就是说，如果只考虑当前时刻 $t$ 之后的累积奖励 $R(\tau_{t+1:T})$，策略梯度定理的表达式仍然成立，对参数更新的方向没有影响。

于是可以用 $R(\tau_{t+1:T})$ 来替代 $R(\tau)$，得到一个新的梯度计算公式：

$$
\nabla_\theta J(\theta) = \mathbb{E}_{\tau \sim \pi_\theta} \left[ \sum_{t=0}^{T} R(\tau_{t+1:T}) \nabla_\theta \log \pi_\theta(a_t \mid s_t) \right]
$$

这样做的好处在于剔除了 $t$ 之前的轨迹对梯度估计的影响，减少了梯度估计的方差，提高了训练效率。

进一步地，$R(\tau_{t+1:T})$ 就是从当前时刻 $t$ 开始的累积奖励，给定 $s_t$ 和 $a_t$，这个条件期望就是状态价值函数 $V(s_t)$ 或者动作价值函数 $Q(s_t, a_t)$。于是策略梯度定理的表达式可以进一步改写为：

$$
\nabla_\theta J(\theta) = \mathbb{E}_{\tau \sim \pi_\theta} \left[ \sum_{t=0}^{T} Q(s_t, a_t) \nabla_\theta \log \pi_\theta(a_t \mid s_t) \right]
$$

如果用 MC（Monte Carlo）方法来估计这个期望，就得到了 REINFORCE 算法。对应的梯度估计为：

$$
\nabla_\theta J(\theta) = \sum_{t=0}^{T} G(t) \nabla_\theta \log \pi_\theta(a_t \mid s_t)
$$

参数更新公式为：

$$
\theta \leftarrow \theta + \alpha \sum_{t=0}^{T} G(t) \nabla_\theta \log \pi_\theta(a_t \mid s_t)
$$

根据随机梯度下降法（Stochastic Gradient Descent，SGD）的思想，可以在每个时刻 $t$ 都做一次更新，而不必等到整个 Rollout 结束。于是参数更新公式可以进一步简化为：

$$
\theta \leftarrow \theta + \alpha G(t) \nabla_\theta \log \pi_\theta(a_t \mid s_t)
$$

## 带基线的 REINFORCE 算法

由前面 $R(\tau_{0:t})$ 对梯度更新方向没有影响的结论可以知道，策略梯度定理的表达式中可以加上一个常数 $b$，而不影响梯度更新的方向：

$$
\nabla_\theta J(\theta) = \mathbb{E}_{\tau \sim \pi_\theta} \left[ \sum_{t=0}^{T} (G(t) - b) \nabla_\theta \log \pi_\theta(a_t \mid s_t) \right]
$$

或者一个函数 $b(s_t)$，只要它与参数 $\theta$ 无关：

$$
\nabla_\theta J(\theta) = \mathbb{E}_{\tau \sim \pi_\theta} \left[ \sum_{t=0}^{T} (G(t) - b(s_t)) \nabla_\theta \log \pi_\theta(a_t \mid s_t) \right]
$$

之所以要额外引入这个常数 $b$ 或者函数 $b(s_t)$，是因为它可以减少梯度估计的方差。已经讲过，MC 方法是无偏的，但方差很大，会导致训练不稳定。通过引入这个常数 $b$ 或者函数 $b(s_t)$，可以让所有的梯度估计都减去一个常数，从而减少梯度估计的方差，提高训练效率。一般会将这个常数 $b$ 或者函数 $b(s_t)$ 称为基线（Baseline）。
