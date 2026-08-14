---
title: '贝尔曼方程'
description: '介绍状态价值函数和状态-动作价值函数，推导贝尔曼方程与贝尔曼最优方程，并说明自举和动态规划之间的联系。'
pubDate: '2026-08-14'
tags:
    - 强化学习
    - 贝尔曼方程
    - 价值函数
    - 动态规划
---

## 贝尔曼方程

状态价值函数 $V_\pi(s)$ 按照之前的定义是：

$$
\begin{aligned}
V_\pi(s) &= \mathbb{E}_\pi[G_t \mid s_t = s] \\
	&= \mathbb{E}_\pi[r_t + \gamma r_{t+1} + \gamma^2 r_{t+2} + \ldots \mid s_t = s]
\end{aligned}
$$

状态-动作价值函数 $Q_\pi(s, a)$ 按照之前的定义是：

$$
\begin{aligned}
Q_\pi(s, a) &= \mathbb{E}_\pi[G_t \mid s_t = s, a_t = a] \\
    &= \mathbb{E}_\pi[r_t + \gamma r_{t+1} + \gamma^2 r_{t+2} + \ldots \mid s_t = s, a_t = a]
\end{aligned}
$$

值得注意的是公式中都有下标 $\pi$，即对于不同的策略，即使在同一个状态下，Agent 状态 / 状态-动作对价值的判断也可能不同。

虽然定义很清晰，但由于公式中设计“未来”的奖励，似乎看起来是没办法计算的。实际上，贝尔曼方程（Bellman Equation）提供了一个递归的方式来计算这些函数。

以状态价值函数为例，假设当前时刻是 $t$，则：

$$
\begin{aligned}
V_\pi(s_t) 
    &= \mathbb{E}_\pi[G_t \mid s_t] \\
    &= \mathbb{E}_\pi[r_t + \gamma r_{t+1} + \gamma^2 r_{t+2} + \ldots \mid s_t] \\
    &= \mathbb{E}_\pi[r_t + \gamma (r_{t+1} + \gamma r_{t+2} + \ldots) \mid s_t] \\
    &= \mathbb{E}_\pi[r_t + \gamma G_{t+1} \mid s_t] \\
    &= \mathbb{E}_\pi[r_t \mid s_t] + \gamma \mathbb{E}_\pi[G_{t+1} \mid s_t]
\end{aligned}
$$

把两项分别展开，左边这一项可以表示为：

$$
\mathbb{E}_\pi[r_t \mid s_t] = \sum_{a} \pi(a \mid s_t) \sum_{s_{t+1}} p(s_{t+1} \mid s_t, a) r(s_t, a, s_{t+1})
$$

右边这一项可以表示为：

$$
\begin{aligned}
\mathbb{E}_\pi[G_{t+1} \mid s_t] 
    &= \sum_{a} \pi(a \mid s_t) \sum_{s_{t+1}} p(s_{t+1} \mid s_t, a) \mathbb{E}[G_{t+1} \mid s_{t+1}] \\
    &= \sum_{a} \pi(a \mid s_t) \sum_{s_{t+1}} p(s_{t+1} \mid s_t, a) V_\pi(s_{t+1})
\end{aligned}
$$

提取公因式可以得到：

$$
V_\pi(s_t) = \sum_{a} \pi(a \mid s_t) \sum_{s_{t+1}} p(s_{t+1} \mid s_t, a) [r(s_t, a, s_{t+1}) + \gamma V_\pi(s_{t+1})]
$$

上述公式对所有的策略 $\pi$ 都成立，对于最优策略 $\pi^*$ 当然也成立，于是有贝尔曼最优方程（Bellman Optimality Equation）：

$$
V_{\pi^*}(s_t) = \max_{a} \sum_{s_{t+1}} p(s_{t+1} \mid s_t, a) [r(s_t, a, s_{t+1}) + \gamma V_{\pi^*}  (s_{t+1})]
$$

即每个时刻总选择使得 $\sum_{s_{t+1}} p(s_{t+1} \mid s_t, a) [r(s_t, a, s_{t+1}) + \gamma V_{\pi^*}  (s_{t+1})]$ 最大的动作。

对于状态-动作价值函数 $Q_\pi(s, a)$，同样可以得到贝尔曼方程：

$$
Q_\pi(s_t, a_t) = \sum_{s_{t+1}} p(s_{t+1} \mid s_t, a_t) [r(s_t, a_t, s_{t+1}) + \gamma \sum_{a_{t+1}} \pi(a_{t+1} \mid s_{t+1}) Q_\pi(s_{t+1}, a_{t+1})]
$$

贝尔曼最优方程：

$$
Q_{\pi^*}(s_t, a_t) = \sum_{s_{t+1}} p(s_{t+1} \mid s_t, a_t) [r(s_t, a_t, s_{t+1}) + \gamma \max_{a_{t+1}} Q_{\pi^*}(s_{t+1}, a_{t+1})]
$$

虽然贝尔曼方程看着很复杂，但它的核心思想是递归的。状态价值函数 $V_\pi(s)$ 的计算只依赖于下一时刻的状态价值函数 $V_\pi(s_{t+1})$。同时，贝尔曼方程还满足了最优子结构性质（Optimal Substructure）。因此，贝尔曼方程可以用动态规划（Dynamic Programming）的方法来求解。

于是，贝尔曼方程可以改成这样的迭代更新式：

$$
V_\pi(s_t) \leftarrow \sum_{a} \pi(a \mid s_t) \sum_{s_{t+1}} p(s_{t+1} \mid s_t, a) [r(s_t, a, s_{t+1}) + \gamma V_\pi(s_{t+1})]
$$

值得一提的是，贝尔曼方程的迭代更新式中包含状态价值函数的准确值 $V_\pi(s)$，但实际计算中这个值是不知道的。解决方法是自举（Bootstrapping）。用当前的估计值来代替真实值。

自举在直观上是不成立的，看起来如果当前估计是不准确的，甚至刚开始的时候是完全错误的，那么用这个错误的值去更新，最终得到的结果也会是错误的。但数学上可以证明，经过足够多的迭代，最终的结果会收敛到真实值。

数学上的证明很复杂、枯燥，这里不做介绍，读者如果感兴趣可以自行查阅相关资料。

由贝尔曼方程和贝尔曼最优方程出发，可以得到两个实际算法：策略迭代（Policy Iteration）和价值迭代（Value Iteration）。这两个算法都是动态规划的应用。

