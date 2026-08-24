---
title: 'OJ 常识'
description: '记录 OJ 算法中常见且需要掌握的知识点。'
pubDate: '2026-08-22'
tags:
  - OJ
---

本文以 Python 为例，记录找工作时笔试、面试中做 OJ 算法题需要掌握的常见知识。

## 快速输入输出

一般而言，OJ 的输入输出都是标准输入输出（stdin/stdout），对应 Python3 中的 `input()` 和 `print()` 函数。

但是，OJ 的输入输出往往是大数据量的，使用 `input()` 和 `print()` 会比较慢，容易超时。为此，可以使用 `sys.stdin` 和 `sys.stdout` 来加速输入输出。

```python
import sys

input = sys.stdin.readline

# 读一个数
n = int(input())

# 读一行多个数
a, b = map(int, input().split())

# 读一行多个数，返回列表
arr = list(map(int, input().split()))

# 多组测试数据：首行 T 表示有多少组数据。每组两行输入构成，第一行是一个整数 n，表示这一组有几个数据，第二行是 n 个整数，表示这一组的数据
T = int(input())
for _ in range(T):
    n = int(input())
    arr = list(map(int, input().split()))
    # 处理每组数据
    ...

# 读二维数组：第一行是两个整数 n, m，表示有 n 行 m 列，接下来 n 行，每行 m 个整数，表示二维数组的每一行
n, m = map(int, input().split())
matrix = []
for _ in range(n):
    row = list(map(int, input().split()))
    matrix.append(row)

# 读到 EOF 为止（题目中一般说"输入直到结束"）
for line in sys.stdin:
    n = int(line)
    # 处理每行数据
    ...
```

可以把上述代码看作是 OJ 读数据的模板，遇到不同的题目时根据题目描述选择合适的读取方式即可。

## 常用的标准库数据结构

### 双向队列（deque）

`deque` 是标准库 `collections` 里**两端都能快速增删**的序列容器，一般用法是：

```python
from collections import deque

q = deque()
q.append(1)      # 右端加入
q.appendleft(2)  # 左端加入
q.popleft()      # 左端弹出 → 2
q.pop()          # 右端弹出 → 1
```

Python 中虽然支持普通 list 当队列用，通过 `append(0)` 实现左端加入，通过 `pop(0)` 实现左端弹出，但其时间复杂度是 O(n)。而 `deque` 的左端加入 / 弹出是 O(1)，因此在需要频繁左端加入 / 弹出的场景下，推荐使用 `deque`。

所以，需要队列（FIFO）时，推荐使用 `deque`，其他情况（栈，数组等）可以使用普通 list。

### 默认值字典（defaultdict）

普通字典（`dict`）在访问不存在的 key 时会抛出 KeyError 异常，而 `defaultdict` 可以在访问不存在的 key 时返回一个默认值。

例如统计一个列表中每个元素出现的次数。如果使用普通字典，需要先判断 key 是否存在：

```python
d = {}
for x in [1, 2, 1, 3, 2]:
    if x not in d:      # 每次都要先判断
        d[x] = 0
    d[x] += 1
# d = {1: 2, 2: 2, 3: 1}
```

使用 `defaultdict` 可以简化代码：

```python
from collections import defaultdict

d = defaultdict(int)  # 默认值为 int() → 0
for x in [1, 2, 1, 3, 2]:
    d[x] += 1
# d = {1: 2, 2: 2, 3: 1}
```

### 计数器（Counter）

Counter 用于统计元素出现的次数，返回一个字典，key 是元素，value 是出现的次数。

```python
from collections import Counter

c = Counter([1, 2, 1, 3, 2])
# c = {1: 2, 2: 2, 3: 1}

c[1] # 2

c[4] # 0，访问不存在的 key 返回 0

c.most_common() # [(1, 2), (2, 2), (3, 1)]，按出现次数从大到小排序
c.most_common(2) # [(1, 2), (2, 2)]，返回出现次数最多的前 2 个元素
len(c) # 3，返回不同元素的个数
sum(c.values()) # 5，返回总元素个数
```

Counter 可以看作是 `defaultdict(int)` 的一个特例，专门用于统计元素出现次数。

常用的场景为：

```python
from collections import Counter

# 判断两个字符串是否由相同的字符组成
Counter(s) == Counter(t) 

# 计算 s 中有多少个字符不在 t 中
Counter(s) - Counter(t) 

# 计算列表中出现次数最多的元素及其出现次数，返回 (元素, 出现次数)
Counter(a).most_common(1)[0] 
```

### 堆（heapq）

Python 中的堆是最小堆，即堆顶元素是最小值。常用的操作包括：

```python
import heapq

# 建堆
h = []

# 入堆
heapq.heappush(h, 3)
heapq.heappush(h, 1)
heapq.heappush(h, 2)

# 出堆
heapq.heappop(h) # 1，弹出最小值

# 看堆顶元素
h[0] # 2，堆顶元素是最小值

# 堆排序
h = [3, 1, 2]
heapq.heapify(h) # 建堆
sorted_h = [heapq.heappop(h) for _ in range(len(h))]
# sorted_h = [1, 2, 3]，堆排序结果
```

### 二分模块（bisect）

二分模块提供了对有序列表进行二分查找和插入的功能。常用的函数包括：

```python
import bisect

# 在有序列表 a 中查找 x 的插入位置，返回插入位置的索引
bisect.bisect_left(a, x)  # 返回左侧插入位置
bisect.bisect_right(a, x) # 返回右侧插入位置

# 在有序列表 a 中插入 x，保持列表有序
bisect.insort_left(a, x)  # 在左侧插入
bisect.insort_right(a, x) # 在右侧插入
```

经常用来统计有序列表中某个值出现的次数：`bisect.bisect_right(a, x) - bisect.bisect_left(a, x)`

### 数学工具（math）

Python 的标准库 `math` 提供了很多数学工具函数，常用的包括：

```python
import math

# 最大公约数
math.gcd(a, b) # a 和 b 的最大公约数

# 最小公倍数
def lcm(a, b):
    return a * b // math.gcd(a, b)

# 正无穷大
math.inf # 在求最小问题中可以用来初始化最小值（如最短路径等问题）

# 负无穷大
-math.inf # 在求最大问题中可以用来初始化最大值

# 平方根
math.sqrt(x) # x 的平方根
math.isqrt(x) # x 的整数平方根（向下取整）
```

### 其他常用的内置工具

```python

# 复合排序
tasks.sort(key=lambda x: (x[0], -x[1])) # 先按第一个元素升序排序，再按第二个元素降序排序

# enumerate：同时遍历下标和值
for i, x in enumerate(arr):
    ...

for i, x in enumerate(a, 1):
    ... # 下标从 1 开始

# zip：同时遍历多个可迭代对象
for x, y in zip(a, b):
    ...

# 列表推导式：一行生成列表
arr = [x for x in range(10) if x % 2 == 0] # [0, 2, 4, 6, 8]
```