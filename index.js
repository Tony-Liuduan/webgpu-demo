async function main() {
	// 获取显卡适配器
	const adapter = await navigator.gpu.requestAdapter({
		powerPreference: 'high-performance',
	});
	console.log('adapter', adapter);
	// 获取设备
	const device = await adapter.requestDevice();

	// 获取gpu交互上下文
	// https://github.com/cwoffenden/hello-webgpu/issues/11
	const canvas = document.getElementById('canvas');
	canvas.width = 600;
	canvas.height = 600;
	const ctx = canvas.getContext('webgpu');

	// 交换链，用于显卡往显示器输出图像
	const size = [canvas.clientWidth * devicePixelRatio, canvas.clientHeight * devicePixelRatio];
	const format = ctx.getPreferredFormat(adapter);
	// 这个configure的作用主要是关联context和device实例，内部会做缓冲区实现(因为要跟显示器做交互嘛)，size是绘制图像的大小，usage是图像用途，一般是固定搭配，表示需要向外输出图像
	ctx.configure({
		device,
		format,
		size,
		usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
	});

	// 初始化顶点buffer，传入顶点数组给顶点着色器
	// const vertexArray = new Float32Array([0.0, 0.5, -0.5, -0.5, 0.5, -0.5]);
	// const verticesBuffer = device.createBuffer({
	// 	size: vertexArray.byteLength,
	// 	usage: GPUBufferUsage.VERTEX, //显示声明该buffer是给顶点着色器使用
	// 	mappedAtCreation: true,
	// });
	// new Float32Array(verticesBuffer.getMappedRange()).set(vertexArray);
	// verticesBuffer.unmap();

	/**
	 * @description 定义顶点和片元着色器
	 * WGSL: WebGPU Shading Language
	 * 这里的@，对应于WGSL的Attribute概念，用来进行对属性进行注解
	 * 第1行，stage(vertex)是内置关键词，用来声明这是顶点着色器
	 *
	 * 第2行，定义了名字为main的函数，对应上文中的entryPoint
	 * builtin 的意思就是将变量关联到内置参数中
	 * builtin(vertex_index) 表示当前顶点的下标位置
	 * 变量名字为VertexIndex，类型为u32，无符号32位整数
	 *
	 * 第3行，-> 定义此函数返回值类型
	 * TODO: builtin(position)：计算后顶点的最后位置。类型为vec4，即四元32位浮点类型。
	 * 没理解为什么是 vec4
	 *
	 * 第4行，进入函数体了
	 * 这里定义一个名字为 pos 的数组变量，元素类型为vec，数组长度为3
	 *
	 * 第5-7行，分别定义数组成员
	 * 也就是三角形三个顶点位置，这里和WebGL一样，坐标取值在[0.0, 1.0]之间
	 *
	 * 第9行，根据传入的下标 VertexIndex，找到刚才定义数组具体值并返回
	 * draw函数指定有3个顶点，这个顶点着色器就会运行3次，就能获取三个不同顶点了
	 *
	 * 片元着色器
	 * 返回类型中，需要显式使用[[location(0)]]表示第一个返回的元素是vec4类型。这是为了用下标的方式获取定义的任意元素
	 * 第3行，返回了一个vec4类型的元素，其中第1个元素(即R分量)为1.0，即把红色拉满，最后一个元素(即Alpha分量)为1.0，即把不透明度为100%
	 */
	const wgslShaders = {
		vertex: `
			@stage(vertex)
  			fn main(@builtin(vertex_index) VertexIndex : u32) 
			  	-> @builtin(position) vec4<f32> {
					var pos = array<vec2<f32>, 3>(
						vec2<f32>(0.0, 0.5), 
						vec2<f32>(-0.5, -0.5), 
      					vec2<f32>(0.5, -0.5)
					); 
					return vec4<f32>(pos[VertexIndex], 0.0, 1.0);
  				}
		`,
		fragment: `
			@stage(fragment)
			fn main() -> @location(0) vec4<f32> {
  				return vec4<f32>(1.0, 0.0, 0.0, 1.0);
			}
		`,
	};

	function frame() {
		// 创建一个『指令编码器』 CommandEncoder
		// 它的作用是把你需要让 GPU 执行的指令写入到 GPU 的指令缓冲区(Command Buffer)中
		// 例如我们要在渲染通道中输入顶点数据、设置背景颜色、绘制(draw call)等等
		const commandEncoder = device.createCommandEncoder();

		// 创建一个『渲染通道』RenderPass
		const renderPassDescriptor = {
			// colorAttachments是必填字段
			// 用于储存(或者临时储存)图像信息
			// 我们通常只会把渲染通道的结果存成一份，也就是只渲染到一个目标中，但是在某些高级渲染技巧中，我们需要把渲染结果储存成多份，也就是渲染到多个目标上，因此类型是一个数组。
			colorAttachments: [
				{
					// 指定存储图像的位置，表示在哪里储存当前通道渲染的图像数据，我们指定使用context创建一个二进制数组来表示
					view: ctx.getCurrentTexture().createView(),
					// 背景颜色 黑色
					loadValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
					loadOp: 'clear', // 加上这行，会把背景色清空
					// storeOp 表示储存时的操作，可选为'store'储存 或者 'clear' 清除数据，默认就用store。
					storeOp: 'store',
				},
			],
		};

		// 让指令编码器开启『渲染管道』
		const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

		// 创建渲染管线(pipeline)是最复杂的一个步骤
		// 着色器分为「顶点着色器」和「片元着色器」
		// 定义『渲染管线』
		const pipeline = device.createRenderPipeline({
			vertex: {
				module: device.createShaderModule({
					code: wgslShaders.vertex, // 顶点着色器代码
				}),
				entryPoint: 'main', // 入口函数
				// buffers: [
				// 	{
				// 		/**
				// 		 * 步进值，也就是每个顶点需要占用几个储存空间，单位是 byte。
				// 		 * 我们是用 Float32Array 来储存顶点位置的，每个 32 位浮点数需要 4 个 byte；
				// 		 * xyz三维顶点需要 3 个 32 位浮点数来分别表示，即 4 * 3 byte。
				// 		 * xy二维顶点需要 2个32 位浮点数来分别表示，即 4 * 2 个 byte。
				// 		 */
				// 		arrayStride: 4 * 2,
				// 		attributes: [
				// 			{
				// 				// position
				// 				// 对应顶点着色器中 (location = 0)
				// 				shaderLocation: 0,
				// 				// 0 代表从头开始，不设置位移，有时候可以将多个顶点写一个buffer,根据offset位移选择用于不同地方
				// 				offset: 0,
				// 				// 2 个32位 浮点数,如果3个32位浮点数，就可以写float32x3
				// 				format: 'float32x2',
				// 			},
				// 		],
				// 	},
				// ],
			},
			fragment: {
				module: device.createShaderModule({
					code: wgslShaders.fragment, // 片元着色器代码
				}),
				entryPoint: 'main',
				targets: [
					{
						format, // 即上文的最终渲染色彩格式
					},
				],
			},
			/**
			 * primitive 绘制模式
			 * enum GPUPrimitiveTopology {
			 * 	"point-list",
			 *  "line-list",
			 *  "line-strip",
			 *  "triangle-list",
			 *  "triangle-strip"
			 * };
			 */
			primitive: {
				topology: 'triangle-list', // 按照三角形绘制
			},
		});
		// 将pipeline和passencoder产生关联
		passEncoder.setPipeline(pipeline);

		// 设置顶点buffer，0就是渲染管线中shaderLocation：0定义的buffer位置
		// 意思在声明的位置绑定这个设置好的buffer
		// passEncoder.setVertexBuffer(0, verticesBuffer);

		/**
		 * @draw
		 * @param1 需要绘制的顶点数量，三角形当然是3个顶点
		 * @param2 需要绘制几个实例，我们绘制一个就好
		 * @param3 起始顶点位置
		 * @param4 先绘制第几个实例
		 */
		passEncoder.draw(3, 1, 0, 0);

		// 宣布绘制结束，表示当前的渲染通道已经结束了，不再向 GPU 发送指令
		passEncoder.end();

		// 结束指令编码器并提交数据
		device.queue.submit([commandEncoder.finish()]);
		requestAnimationFrame(frame);
	}
	requestAnimationFrame(frame);
}

main().catch(e => {
	console.log(e.message);
});
