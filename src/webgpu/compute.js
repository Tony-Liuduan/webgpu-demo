const ctx = document.querySelector('canvas').getContext('2d');

function randomBetween(a, b) {
	return Math.random() * (b - a) + a;
}

async function main() {
	if (!navigator.gpu) throw Error('WebGPU not supported.');

	const adapter = await navigator.gpu.requestAdapter();
	if (!adapter) throw Error('Couldn’t request WebGPU adapter.');

	/**
     * adapter.limits
     * device.limits
     * 
        maxBindGroups: 4
        maxComputeInvocationsPerWorkgroup: 256
        maxComputeWorkgroupSizeX: 256
        maxComputeWorkgroupSizeY: 256
        maxComputeWorkgroupSizeZ: 64
        maxComputeWorkgroupStorageSize: 32768
        maxComputeWorkgroupsPerDimension: 65535
        maxDynamicStorageBuffersPerPipelineLayout: 4
        maxDynamicUniformBuffersPerPipelineLayout: 8
        maxInterStageShaderComponents: 60
        maxSampledTexturesPerShaderStage: 16
        maxSamplersPerShaderStage: 16
        maxStorageBufferBindingSize: 2147483647
        maxStorageBuffersPerShaderStage: 8
        maxStorageTexturesPerShaderStage: 4
        maxTextureArrayLayers: 256
        maxTextureDimension1D: 8192
        maxTextureDimension2D: 8192
        maxTextureDimension3D: 2048
        maxUniformBufferBindingSize: 65536
        maxUniformBuffersPerShaderStage: 12
        maxVertexAttributes: 16
        maxVertexBufferArrayStride: 2048
        maxVertexBuffers: 8
        minStorageBufferOffsetAlignment: 256
        minUniformBufferOffsetAlignment: 256 
    */

	const device = await adapter.requestDevice();
	if (!device) throw Error('Couldn’t request WebGPU logical device.');

	const BUFFER_SIZE = 600 * Float32Array.BYTES_PER_ELEMENT;
	// createBuffer() 返回的是 GPUBuffer 对象，不是 ArrayBuffer
	const output = device.createBuffer({
		size: BUFFER_SIZE,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
	});
	const stagingBuffer = device.createBuffer({
		size: BUFFER_SIZE,
		usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST, //  Buffer 必须有 GPUBufferUsage.MAP_READ 或 GPUBufferUsage.MAP_WRITE 的用途才能读或写
	});
	const input = device.createBuffer({
		size: BUFFER_SIZE,
		usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
	});

	// 绑定组布局对象，记录了这些资源的数据类型、用途等元数据，使得 GPU 可以提前知道“噢，这么回事，提前告诉我我可以跑得更快”。
	const bindGroupLayout = device.createBindGroupLayout({
		entries: [
			{
				binding: 0,
				visibility: GPUShaderStage.COMPUTE,
				buffer: {
					type: 'read-only-storage',
				},
			},
			{
				binding: 1, // 可以自由设定（当然得按顺序），它的作用是在 WGSL 代码中与相同 binding 值的 buffer 变量绑定在一起。
				visibility: GPUShaderStage.COMPUTE,
				buffer: {
					type: 'storage', // storage 即说明这个 Buffer 的类型是存储型
				},
			},
		],
	});
	// 绑定组
	const bindGroup = device.createBindGroup({
		layout: bindGroupLayout,
		entries: [
			{
				binding: 0,
				resource: {
					buffer: input, // 输入初始化数据
				},
			},
			{
				binding: 1,
				resource: {
					buffer: output,
				},
			},
		],
	});

	/* const module = device.createShaderModule({
        // @group(0) 表示从第一个（索引为 0）绑定组中获取第 1 个绑定资源
		code: `
            @group(0) @binding(1)
            var<storage, write> output: array<f32>;
            
            @stage(compute) @workgroup_size(64)
            fn main(
            
              @builtin(global_invocation_id) //  工作负载 中此着色器调用时的全局 x/y/z 坐标
              global_id : vec3<u32>,
            
              @builtin(local_invocation_id) // 工作组 中此着色器调用时的局部 x/y/z 坐标
              local_id : vec3<u32>,
            
            ) {
                if (global_id.x >= arrayLength(&output)) {
                    return;
                }
                output[global_id.x] = f32(global_id.x) * 1000. + f32(local_id.x);
            }
        `,
	}); */

	const module = device.createShaderModule({
		// @group(0) 表示从第一个（索引为 0）绑定组中获取第 1 个绑定资源
		code: `
            // ... Ball 结构体定义 ...
            struct Ball {
                radius: f32;
                position: vec2<f32>;
                velocity: vec2<f32>;
            }

            @group(0) @binding(0)
            var<storage, read> input: array<Ball>;
            
            // ... output Buffer 的定义
            @group(0) @binding(1)
            var<storage, write> output: array<Ball>;

            let TIME_STEP: f32 = 0.016;
        
            @stage(compute) @workgroup_size(64)
            fn main(
                @builtin(global_invocation_id) global_id: vec3<u32>,
            ) {
                let num_balls = arrayLength(&output);
                if (global_id.x >= num_balls) {
                    return;
                }
                let src_ball = input[global_id.x];
                let dst_ball = &output[global_id.x];
                (*dst_ball) = src_ball;
                (*dst_ball).position = (*dst_ball).position + (*dst_ball).velocity * TIME_STEP;
            }
        `,
	});

	let inputBalls = new Float32Array(new ArrayBuffer(BUFFER_SIZE));
	for (let i = 0; i < 100; i++) {
		inputBalls[i * 6 + 0] = randomBetween(2, 10); // 半径
		inputBalls[i * 6 + 1] = 0; // 填充用
		inputBalls[i * 6 + 2] = randomBetween(0, ctx.canvas.width); // x坐标
		inputBalls[i * 6 + 3] = randomBetween(0, ctx.canvas.height); // y坐标
		inputBalls[i * 6 + 4] = randomBetween(-100, 100); // x 方向速度分量
		inputBalls[i * 6 + 5] = randomBetween(-100, 100); // y 方向速度分量
	}

	// 计算管线：它返回的是一个缓冲数据对象，意味着可以输出任意数据
	const pipeline = device.createComputePipeline({
		// 为了与 GPU 进行数据交换，需要一个叫绑定组的布局对象（类型是 GPUBindGroupLayout）来扩充管线的定义 绑定组
		layout: device.createPipelineLayout({
			bindGroupLayouts: [bindGroupLayout],
		}),
		compute: {
			module,
			entryPoint: 'main',
		},
	});

	async function frame() {
		performance.mark('webgpu start');

		// 把数据写进 input 缓冲区
		device.queue.writeBuffer(input, 0, inputBalls);

		// 指令队列，是一块内存（显示内存），编码了 GPU 待执行的指令
		const commandEncoder = device.createCommandEncoder();

		// 通道编码器，配置管线并调度编码指令
		// 运行 GPU 管线所需的所有数据、状态都要经过通道编码器来传递
		const passEncoder = commandEncoder.beginComputePass();
		passEncoder.setPipeline(pipeline);
		passEncoder.setBindGroup(0, bindGroup);

		// 告诉 GPU 在每个维度要创建多少个工作组
		// 计算着色器的调用次数等于工作组每个维度的大小与该维度调用次数的累积
		// 因为 workgroup_size 特性显式指定了 64 个工作组，且在这个维度上调用了 1 次，所以最终生成了 64 个线程
		// passEncoder.dispatch(1);
		passEncoder.dispatch(Math.ceil(100 / 64));

		passEncoder.end();

		// 将数据从 output 缓冲复制到 stagingBuffer 缓冲，最后才提交指令编码的指令缓冲到队列上。
		commandEncoder.copyBufferToBuffer(
			output,
			0, // 从哪里开始读取
			stagingBuffer,
			0, // 从哪里开始写
			BUFFER_SIZE
		);

		const commands = commandEncoder.finish();
		device.queue.submit([commands]);

		// GPU 会沿着队列来执行，没法推测什么时候会完成计算
		// 但是，可以异步地提交 stagingBuffer 缓冲的映射请求
		// 当 mapAsync 被 resolve 时，stagingBuffer 映射成功
		await stagingBuffer.mapAsync(
			GPUMapMode.READ,
			0, // 从哪里开始读，偏移量
			BUFFER_SIZE // 读多长
		);

		// 返回的缓冲数组对象就是显存的映射
		const copyArrayBuffer = stagingBuffer.getMappedRange(0, BUFFER_SIZE);
		// 如果 stagingBuffer 的状态是未映射时，返回的 ArrayBuffer 也随之没有了，所以用 slice() 方法来拷贝一份
		const buffer = copyArrayBuffer.slice();
		stagingBuffer.unmap();

		const ouputData = new Float32Array(buffer);
		performance.mark('webgpu end');
		performance.measure('webgpu', 'webgpu start', 'webgpu end');
		draw(ctx, ouputData);
		inputBalls = ouputData;
		requestAnimationFrame(frame);
	}
	requestAnimationFrame(frame);
}

main();

function draw(ctx, data) {
	ctx.save();
	ctx.scale(1, -1);
	ctx.translate(0, -ctx.canvas.height);
	ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	ctx.fillStyle = 'red';
	let len = data.length;

	for (let i = 0; i < len; i += 6) {
		const r = data[i + 0];
		const x = data[i + 2];
		const y = data[i + 3];
		const s1 = data[i + 4];
		const s2 = data[i + 5];

		let speed = Math.atan(s2 / (0 === s1 ? Number.EPSILON : s1));
		if (s1 < 0) {
			speed += Math.PI;
		}
		const px = x + Math.cos(speed) * Math.sqrt(2) * r;
		const py = y + Math.sin(speed) * Math.sqrt(2) * r;

		ctx.beginPath();
		ctx.arc(x, y, r, 0, 2 * Math.PI, true);
		ctx.moveTo(px, py);
		ctx.arc(x, y, r, speed - Math.PI / 4, speed + Math.PI / 4, true);
		ctx.lineTo(px, py);
		ctx.closePath();
		ctx.fill();
	}
	ctx.restore();
}
