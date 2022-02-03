
var gl; 
var program; 
var canvas; 
var aspect; 


var left = -2;      // left limit of world coords
var right = 2;      // right limit of world coords
var bottom = -2;    // bottom limit of world coords
var topBound = 2;        // top limit of world coords
var near = -10;     //near clip plane
var far = 10;       //far clip plane


window.onload = function init() 
{
    canvas = document.getElementById("gl-canvas");  // Get HTML canvas

    gl = canvas.getContext('webgl2');               // get a WebGL 2.0 context

    if( !gl ) { alert("WebGL isn't available");}


    aspect = canvas.width / canvas.height;    // get the aspect raio of the canvas
    left *= aspect;                                 // updated left limit of world coords
    right *= aspect;                                // updated right limit of world coords



    // Vertices of two triangles in complex plane
    var vertices = [
        vec2(-2.0, 2.0),
        vec2(-2.0, -2.0),
        vec2(2.0, -2.0),
        vec2(-2.0, 2.0),
        vec2(2.0, 2.0),
        vec2(2.0, -2.0) 
    ]

    // Configure WebGl
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    //Load shaders and initialize attribute buffers
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Load the data into the GPU
    var bufferId = gl.createBuffer(); 
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId); 
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW); 

    // Associate our shader variables
    var vPosition = gl.getAttribLocation(program, 'vPosition');
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0); 
    gl.enableVertexAttribArray(vPosition);

    render();

};

window.addEventListener("keydown", dealWithKeyboard, false);

function dealWithKeyboard(e) {
    switch(e.keyCode) {

        case 33: // PageUp key , Zoom in
            {
                var range = (right - left);
                var delta = (range - range * 0.9) * 0.5;
                left += delta; right -= delta;
                range = topBound - bottom;
                delta = (range - range * 0.9) * 0.5;
                bottom += delta; topBound -= delta;
            }
            break;
        case 34: // PageDown key, zoom out
            {
                var range = (right - left);
                var delta = (range * 1.1 - range) * 0.5;
                left -= delta; right += delta;
                range = topBound - bottom;
                delta = (range * 1.1 - range) * 0.5;
                bottom -= delta; topBound += delta;
            }
            break;
        case 37: // left arrow pan left
            {left += -0.1; right += -0.1};
            break;
        case 38: // up arrow pan left
            {bottom += 0.1; topBound += 0.1};
            break;
        case 39: // right arrow pan left
            {left += 0.1; right += 0.1};
            break;
        case 40: // down arrow pan left
            {bottom += -0.1; topBound += -0.1};
            break;

    }
}
function render() 
{
    gl.clear(gl.COLOR_BUFFER_BIT);   //clear viewport with gl.clearColor defined above
    
    var PMat; //js variable to hold projection matrix
    console.log(left + " " + right);

    PMat = ortho(left,right,bottom,topBound,near,far); // Call function to compute orthographic projection matrix

    var P_loc = gl.getUniformLocation(program, "P"); // Get Vertex shader memory location for P
    gl.uniformMatrix4fv(P_loc, false, flatten(PMat)); // Set uniform variable P on GPU

    //Get Uniform locations
    //Set CPU-side variables for all of our shader variables
    var viewportDimensions = vec2(canvas.width, canvas.height); 

    var viewportDimensionLoc = gl.getUniformLocation(program, 'viewportDimensions');
    var leftLoc = gl.getUniformLocation(program, 'left');
    var rightLoc = gl.getUniformLocation(program, 'right');
    var bottomLoc = gl.getUniformLocation(program, 'bottom');
    var topBoundLoc = gl.getUniformLocation(program, 'topBound');

    gl.uniform2fv(viewportDimensionLoc, viewportDimensions);
    gl.uniform1f(leftLoc, left);
    gl.uniform1f(rightLoc, right);
    gl.uniform1f(bottomLoc, bottom);
    gl.uniform1f(topBoundLoc, topBound);

    gl.drawArrays(gl.TRIANGLES, 0, 6); //Draw 2 triangles using TRIANGLES primitive using 6 vertices
    requestAnimationFrame(render)

}