window.onload = main;

// 顶点着色器，描述顶点特性（位置，颜色）
// attribute 表示 存储限定符
// 变量声明规则：attribute 类型 变量名
// 变量名规范：以 a_ 为前缀
const VSHADER_SOURCE = `
    attribute vec4 a_Position;
    void main() {
        gl_Position = a_Position; // 设置坐标(x,y,z,w)=(x/w,y/w,z/w)，最后一位是 齐次坐标，能够提高处理三维数据的效率
    }
`;
// 片元着色器，fragment，片元可以理解为像素，图像单元
const FSHADER_SOURCE = `
    void main() {
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); // 设置颜色
    }
`;

function main() {
	const canvas = document.getElementById('example');

	// 绘制结果被存储在 ctx 上下文变量中
	const gl = canvas.getContext('webgl');

	// 初始化着色器，创建 gl.program
	if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
		console.log('Failed to intialize shaders.');
		return;
	}

	// 设置顶点位置
	let n = initVertexBuffers(gl);
	if (n < 0) {
		console.log('Failed to set the positions of vertices');
		return;
	}

	// 设置清空颜色
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	// 清空画布颜色缓冲区
	gl.clear(gl.COLOR_BUFFER_BIT);

	/**
	 * 绘制
	 * @param1 第1个参数是绘制模式，内置 enum
	 * @param2 第2个参数是从哪个顶点开始绘制，整形
	 * @param2 第3个参数是指定绘制需要用到多少个顶点，整形，表示顶点着色器被执行的次数
	 *
	 * 先执行顶点着色器，当顶点着色器执行完成，片元做色器开始执行调用 main 函数
	 */
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, n);
}

function initVertexBuffers(gl) {
	// 缓冲区对象是 webgl 系统中的一块存储区，可以在缓冲区对象中保存想要绘制的所有顶点数据

	// 1.创建缓冲区对象，缓冲区对象中存储着顶点数据
	const vertexBuffer = gl.createBuffer();
	if (!vertexBuffer) {
		console.log('Failed to create the buffer object');
		return -1;
	}
	// 2.绑定缓冲区对象，将缓冲区对象 vertexBuffer 绑定到 gl.ARRAY_BUFFER 目标上
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

	// 使用类型化数组，限定元素类型，限定大量元素为同一类型，浏览器事先知道数组中的数据类型，处理起来更加有效率
	// 类型化数组，不支持 push pop
	const vertices = new Float32Array([-0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, -0.5]);

	// 3.将数据写入缓冲区对象，开辟空间，并向缓冲区写入数据
	// 不能直接向缓冲区写入数据，只能向绑定目标写入数据，所以要写入数据，必须先绑定
	gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

	// 获取 attribute 变量的存储地址
	const a_Position = gl.getAttribLocation(gl.program, 'a_Position');
	if (a_Position < 0) {
		console.log('Failed to get the storage location of a_Position');
		return -1;
	}
	// 4.将缓冲区对象分配给一个 attribute 变量
	// vertexAttribPointer 可以将整个缓冲区对象分配给 attribute 变量，而 vertexAttrib4fv 一次只能向 attribute 分配一个值
	// 第2个参数：每个顶点分配个数
	// 第3个参数：指定数据格式
	gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

	// 5. 开启 attribute 变量，分配真正生效，缓冲区对象和 attribute 之间的连接就真正建立起来了
	// 注意：开始 attribute 变量后，就不能再用 vertexAttrib4fv 向他传数据了，除非显示关闭 attribute 变量
	gl.enableVertexAttribArray(a_Position); // 对应 disableVertexAttribArray 关闭分配

	return 4; // 点的个数
}
