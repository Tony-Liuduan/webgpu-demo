# WebGPU

<https://www.zhihu.com/question/315103318>
<https://www.51cto.com/article/698100.html>
<https://austin-eng.com/webgpu-samples/samples/helloTriangle#../../shaders/red.frag.wgsl>

## WebGL 问题

WebGL 的目的是支持浏览器上的原生 3D 功能。他的目标是 OpenGL

请注意，WebGL 不一定在 OpenGL 上运行，它实际上因平台而异。在 Linux / MacOS 上它在 OpenGL 上运行，在 Windows 上它在DirectX上运行。在 Edge 上，WebGL 内容将被转换为 DirectX 等效项以显示它；

使用WebGL，CPU成为巨大的瓶颈，每一帧需要花费81ms，而使用WebGPU，CPU一帧只需要花费0.18ms，减少CPU耗时意味能给GPU留出更多的运行时间，这是WebGPU强大的一点

每一次调用 <http://gl.xxx> 时，都会完成 CPU 到 GPU 的信号传递，改变 GPU 的状态，是立即生效的。熟悉计算机基础的朋友应该知道，计算机内部的时间和硬件之间的距离有多么重要，世人花了几十年时间无不为信号传递付出了努力，上述任意一条 gl 函数改变 GPU 状态的过程，大致要走完 CPU ~ 总线 ~ GPU 这么长一段距离。

综上所述，WebGL 是存在 CPU 负载隐患的，是由于 OpenGL 这个状态机制决定的。

现代三大图形API 可不是这样，它们更倾向于先把东西准备好，最后提交给 GPU 的就是一个完整的设计图纸和缓冲数据，GPU 只需要拿着就可以专注办事

在 WebGL 中，我们拥有一个默认的帧缓冲(Default Frame Buffer)，如果不做任何其他操作，那么当我们执行绘制命令(draw call)的时候，所有绘制的内容都会填充到默认帧缓冲中，而显卡会把这个默认的帧缓冲直接提交给显示器，並显示在显示器中。

这会带来两个问题：

1. 如果渲染过慢，显示器会取走未完成的图像，渲染出隔离的图像
2. 如果渲染过快，GPU在等待显示器取图，造成性能浪费。

解决第一个问题办法是应用双缓冲区技术，即用一个缓冲区缓存上次渲染好的内容，极其类似React Fiber的双缓存，看来技术都是相通的。解决第二个问题可以继续应用三重缓冲，充分榨干显卡性能。

## WebGPU 的特性

1. 直接和Vulkan、Metal、Direct3D 12等高性能的本地图形标准库对标

这意味着WebGPU将会是一个对高性能GPU的桥接层，只要按照这套标准就可以实现一个利用GPU的工具库，它的着色器是一套符合Vulkan SPIR-V 的二进制规范，只要是按照这个规范的产物，加上一个支持GPU的运行时，这会有相当大的潜力。

像WebAssembly当初也是被设计为浏览器可执行的二进制格式，但是随后在Server端获取了更广泛的应用，已经具备替代Docker的潜力了。

2. 支持GPU Compute Shader，支持GPU通用计算

这意味着在浏览器端可以用GPU跑计算任务了，不光可以用来绘制图形，还可以利用GPU并行计算能力来做更多的算法，像大数排序，机器学习等任务有可能放在浏览器端实现。

3. 自定义的着色器语言 WGSL

WGSL(WebGPU Shading Language)是全新的一门语言，WebGPU设计这门语言时大量参考了Vulkan SPIR-V，因为版权、利益分配等问题，最终决定新造一门语言，一门混合Rust、TypeScript、Metal的编程语言，之前用WebGL的同学应该知道着色器是用GLSL编写的，没关系，最终只要有工具转为Vulkan SPIR-V 二进制程序即可。

目前WGSL还没有定最终版本，学习成本也比GLSL要大一些。

4. 更好的架构设计

WebGPU摆脱了状态机机制，新增 Pipeline、Renderpass、CommandEncoder 等对象。

WebGPU对应的JavaScript对象，实际操作的就是GPU内部对象。

所有的WebGPU方法都是Promise，异步代码会交给GPU来实现，外层不需关心。

更好的TypeScript类型支持。

## 绘制 code

1. 创建一个『指令编码器』commandEncoder
2. 创建一个『渲染通道』renderPassDescriptor
   * 指令编码器开启渲染通道 `const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor)`
3. 创建『渲染管线』pipeline
   * 定义『顶点着色器』
   * 定义『片元着色器』
4. 将 pipeline 和 passencoder 产生关联 `passEncoder.setPipeline(pipeline)`
5. 开始绘制 `passEncoder.draw(3, 1, 0, 0)`
6. 结束绘制 `passEncoder.end()`
7. 结束指令编码器并提交数据 `device.queue.submit([commandEncoder.finish()])`
