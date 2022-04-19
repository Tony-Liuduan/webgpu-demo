# WebGPU

<https://forum.orillusion.com/topic/36/webgpu-%E4%B8%AD%E7%9A%84%E7%BC%93%E5%86%B2%E6%98%A0%E5%B0%84%E6%9C%BA%E5%88%B6>

## 缓冲映射

> 映射 (Mapping) 后的某块显存 (Buffer)，就能被 CPU 访问

避免 IO冲突：每一个时刻，CPU 和 GPU 是单边访问显存的，也就避免了竞争和冲突

当 JavaScript 请求映射显存时，所有权并不是马上就能移交给 CPU 的，GPU 这个时候可能手头上还有别的处理显存的操作。所以，GPUBuffer 的映射方法是一个异步方法：

```js
const someBuffer = device.createBuffer({ /* ... */ })
// mapAsync 方法将会直接在 WebGPU 内部往设备的默认队列中压入一个操作，此方法作用于 WebGPU 中三大时间轴中的 队列时间轴。而且在 mapAsync 成功后，内存才会增加（实测）
await someBuffer.mapAsync(GPUMapMode.READ, 0, 4) // 从 0 开始，只映射 4 个字节
 
// 之后就可以使用 getMappedRange 方法获取其对应的 ArrayBuffer 进行缓冲操作

// 解映射操作倒是一个同步操作，CPU 用完后就可以解映射：
somebuffer.unmap()
```


```js
const buffer = device.createBuffer({
  usage: GPUBufferUsage.UNIFORM,
  size: 256,
  mappedAtCreation: true,
})
// 然后马上就可以获取映射后的 ArrayBuffer
const mappedArrayBuffer = buffer.getMappedRange()
 
/* 在这里执行一些写入操作 */
 
// 解映射，还管理权给 GPU
buffer.unmap()
```
