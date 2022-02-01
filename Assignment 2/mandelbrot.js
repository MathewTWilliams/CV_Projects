
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


    aspect = canvas.width / canvas.clientHeight;    // get the aspect raio of the canvas
    left *= aspect;                                 // updated left limit of world coords
    right *= aspect;                                // updated right limit of world coords

    // Vertices of two triangles in complex plane
    var vertices = [
        vec2(-2.0, 2.0),
        vec2(-2.0, -2.0),
        vec2(2.0, -2.0),
        vec2(-2.0, 2.0),
        vec2(2.0, 2.0),
        vec2(2.0, -2.0), 
    ]

    render()

}


function render() 
{
    gl.clear(gl.COLOR_BUFFER_BIT)   //clear viewport with gl.clearColor defined above
    
    var PMat; //js variable to hold projection matrix
    console.log(left + " " + right)

    PMat = ortho(left,right,bottom,topBound,near,far); // Call function to compute orthographic projection matrix

    var P_loc = gl.getUniformLocation(program, "P"); // Get Vertex shader memory location for P
    gl.UniformMatrix4fv(P_loc, false, flatten(PMat)); // Set uniform variable P on GPU

    //Get Uniform locations
    //Set CPU-side variables for all of our shader variables
    var viewportDimensions = vec2(canvas.width, canvas.height); 

    var viewportDimensionLoc = gl.getUniformLocation(program, 'viewportDimensions');
    var leftLoc = gl.getUniformLocation(program, 'left');
    var rightLoc = gl.getUniformLocation(program, 'right');
    var bottomLoc = gl.getUniformLocation(program, 'bottom');
    var topBoundLoc = gl.getUniformLocation(program, 'top');

    gl.uniform2fv(viewportDimensionLoc, viewportDimensions);
    gl.uniform1f(leftLoc, left);
    gl.uniform1f(rightLoc, right);
    gl.uniform1f(bottomLoc, bottom);
    gl.uniform1f(topBoundLoc, topBound);

    gl.drawArrays(gl.Triangles, 0, 6); //Draw 2 triangles using TRIANGLES primitive using 6 vertices
    requestAnimationFrame(render)

}