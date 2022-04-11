window.onload = main;

// 顶点着色器，描述顶点特性（位置，颜色）
// attribute 表示 存储限定符
// 变量声明规则：attribute 类型 变量名
// 变量名规范：以 a_ 为前缀
const VSHADER_SOURCE = `
    attribute vec4 a_Position;
    void main() {
        gl_Position = a_Position; // 设置坐标(x,y,z,w)=(x/w,y/w,z/w)，最后一位是 齐次坐标，能够提高处理三维数据的效率
        gl_PointSize = 10.0; // 设置尺寸，必须是浮点型 float
    }
`;
// 片元着色器，fragment，片元可以理解为像素，图像单元
const FSHADER_SOURCE = `
    precision mediump float; // 精度限定词，来指定变量的范围和精度，mediump 中等精度
    uniform vec4 u_FragColor;
    void main() {
        gl_FragColor = u_FragColor; // 设置颜色
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

	// 获取 attribute 变量的存储地址
	const a_Position = gl.getAttribLocation(gl.program, 'a_Position');
	if (a_Position < 0) {
		console.log('Failed to get the storage location of a_Position');
		return;
	}

	// 获取 uniform 变量的存储地址
	const u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
	if (!u_FragColor) {
		console.log('Failed to get the storage location of u_FragColor');
		return;
	}

	// 将顶点位置传输给 attribute 变量，会自动补全缺失的第四个分量 1.0
	// gl.vertexAttrib1f 传输 1 个值
	// gl.vertexAttrib2f 传输 2 个值
	// gl.vertexAttrib3f 传输 3 个值
	// gl.vertexAttrib4f 传输 4 个值
	// 以 f 结尾表示 浮点数类型，以 i 结尾表示 整形，以 v 结尾表示 参数是数组
	// gl.vertexAttrib3f(a_Position, 0.0, 0.0, 0.0);
	gl.vertexAttrib4fv(a_Position, new Float32Array([0.0, 0.0, 0.0, 1.0]));

	canvas.onmousedown = function (event) {
		click(event, gl, a_Position, u_FragColor);
	};

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
	gl.drawArrays(gl.POINTS, 0, 1);
}

const g_points = [];
const g_colors = [];
function click(event, gl, a_Position, u_FragColor) {
	const rect = event.target.getBoundingClientRect();
	let x = event.clientX;
	let y = event.clientY;
	x = (x - rect.left - rect.width / 2) / (rect.width / 2);
	y = (rect.height / 2 - (y - rect.top)) / (rect.height / 2);
	g_points.push([x, y]);
	if (x >= 0.0 && y >= 0.0) {
		// First quadrant
		g_colors.push([1.0, 0.0, 0.0, 1.0]); // Red
	} else if (x < 0.0 && y < 0.0) {
		// Third quadrant
		g_colors.push([0.0, 1.0, 0.0, 1.0]); // Green
	} else {
		// Others
		g_colors.push([1.0, 1.0, 1.0, 1.0]); // White
	}
	// 清空画布颜色缓冲区
	gl.clear(gl.COLOR_BUFFER_BIT);
	const l = g_points.length;
	for (let i = 0; i < l; i++) {
		const xy = g_points[i];
		const rgba = g_colors[i];
		gl.vertexAttrib3f(a_Position, ...xy, 0.0);
		gl.uniform4f(u_FragColor, ...rgba);
		gl.drawArrays(gl.POINTS, 0, 1);
	}
}
