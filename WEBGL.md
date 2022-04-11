# WebGL

## 三维渲染技术

* Direct3D: : 应用于 windows 平台
* OpenGL: 应用于 Linux/Mac
  * 维护: Khronos

## OpenGL、OpenGL SE、WebGL 关系

OpenGL 1.5 -> OpenGL ES 1.1
OpenGL 2.0 -> OpenGL ES 2.0 -> WebGL 1.0 (2011 发布)
OpenGL 3.3 -> OpenGL ES 3.0
OpenGL 4.3

OpenGL ES 是 OpenGL 的一个特殊版本，主要应用于移动设备

WebGL 继承自 OpenGL 标准，web 版 OpenGL

### GLSL

OpenGL 2.0 重要特性：可编程着色器方法 programmable shader functions，也是 WebGL 1.0 的核心部分

着色器语言 **shading language**

GLSL(OpenGL) -> GLSL ES(OpenGL ES)

## WebGL 程序结构

* HTML5
  * 下层是 HTML 渲染引擎
* JavaScript
* GLSL SE (字符串)
  * 下层是 WebGL -> OpenGL/OpenGL SE

## WebGL 介绍

WebGL 基于 canvas，如果没有 WebGL，js 只能在 canvas 上绘制二维图形，有了 WebGL 就可以在 canvas 上绘制三维图形了

### WebGL 坐标系统

笛卡尔坐标系、右手坐标系
(0,0,0)点位于 canvas 中中
x -> 向右为正
y -> 向上为正
z -> 向外为正

(1,0,0)点位于 canvas 右中
(-1,0,0)点位于 canvas 左中
(0,1,0)点位于 canvas 中上
(0, 01,0)点位于 canvas 中下

#### canvas 坐标

(0,0)点位于 canvas 左上
x -> 向右为正
y -> 向下为正

### webgl draw

webgl 只能绘制这三种图形

* POINTS
* LINES
* TRIANGLES
