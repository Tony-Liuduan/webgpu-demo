window.onload = main;

// 顶点着色器，描述顶点特性（位置，颜色）
// vec4 表示由 4 个浮点数组成的矢量
const VSHADER_SOURCE = `
    void main() {
        gl_Position = vec4(0, 0, 0.0, 1.0); // 设置坐标(x,y,z,w)=(x/w,y/w,z/w)，最后一位是 齐次坐标，能够提高处理三维数据的效率
        gl_PointSize = 10.0; // 设置尺寸，必须是浮点型 float
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

	// 初始化着色器
	if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
		console.log('Failed to intialize shaders.');
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
	gl.drawArrays(gl.POINTS, 0, 1);
}
