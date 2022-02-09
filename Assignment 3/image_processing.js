// Prof R CV lect 6, Image Processing
// Editied by Matt Williams

var gl; 
var program; 
var canvas; 
var aspect; 
var warmth = 0.0;
var brightness = 0.0; 

var left = -2;                  //left limit of world coords
var right = 2;                  //right limit of world coords
var bottom = -2;                //bottom limit of world coords
var topBound = 2;               //top limit of world coords
var near = -10;                 //near clip plane
var far = 10;                   //far clip plane



window.onload = function init()
{
    canvas = document.getElementById("gl-canvas");  // Get HTML canvas

    gl = canvas.getContext('webgl2');               //Get a WebGL 2.0 context
    if ( !gl ) {alert("WebGL isn't available");}

    aspect = canvas.width / canvas.height;    // Get aspect ratio
    left *= aspect; 
    right *= aspect; 


    // Vertices of two triangles 
    var vertices = [
        vec2(-2.0 * 1.942, 2.0),
        vec2(-2.0 * 1.942,-2.0),
        vec2( 2.0 * 1.942,-2.0),
        vec2(-2.0 * 1.942, 2.0),
        vec2( 2.0 * 1.942, 2.0),
        vec2( 2.0 * 1.942,-2.0)
    ];

    //texture coordinates
    var texCoordsArray = [
        vec2(0.0, 1.0),
        vec2(0.0, 0.0),
        vec2(1.0, 0.0),
        vec2(0.0, 1.0),
        vec2(1.0, 1.0),
        vec2(1.0, 0.0)
    ];

    // Configure WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);  // What part of the html are we looking at? 
    gl.clearColor(0.0, 0.0, 0.0, 1.0);               // Set background color of the viewport to black

    //Load shaders and initialize attribute buffers
    program = initShaders(gl, "vertex-shader", "fragment-shader"); // Compile and link shaders to form a program
    gl.useProgram(program);                                        // Make this the active shader program


    // Texture attribute VBO
    var tBuffer = gl.createBuffer(); 
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer); 
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW);

    var vTexCoord = gl.getAttribLocation(program, "vTexCoord"); 
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0); 
    gl.enableVertexAttribArray(vTexCoord); 

    // Load the data into the GPU
    var bufferId = gl.createBuffer();                                   // Generate a VBO id
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);                           // Bind this VBO to the active one
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);  // Load the VBO with vertex data

    // Associate our shader variables with our data buffer
    var vPosition = gl.getAttribLocation(program, "vPosition");         // Link js vPosition with "vertex shader attribute variable" - vPosition
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0); 
    gl.enableVertexAttribArray(vPosition); 

    // Set up texture
    var image = document.getElementById("texImage"); 

    configureTexture(image); 
    render();

};

// Two callback functions for 2 sliders, one for warmth and 1 for brightness
document.getElementById("Warmth").onchange = function () {
    warmth = (event.srcElement.value / 128) * 0.5; 
};


document.getElementById("Brightness").onchange = function () {
    brightness = (event.srcElement.value / 128) * 0.5; 
};

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);                  //Clear viewport with gl.clearColor defined above

    var PMat;                                       // js variable to hold projection matrix
    PMat = ortho(left, right, bottom, topBound, near, far); 
    var P_loc = gl.getUniformLocation(program, "P");
    gl.uniformMatrix4fv(P_loc, false, flatten(PMat)); 

    var brightnessLoc = gl.getUniformLocation(program, 'brightness'); 
    var warmthLoc = gl.getUniformLocation(program, "warmth"); 

    // Get uniform locations
    gl.uniform1f(brightnessLoc, brightness);
    gl.uniform1f(warmthLoc, warmth);

    gl.drawArrays(gl.TRIANGLES, 0, 6);              //Draw two triangles using the TRIANGLES primitive using 6 vertices

    requestAnimationFrame(render); 

}



function configureTexture(image) {
    texture = gl.createTexture(); 
    gl.bindTexture(gl.TEXTURE_2D, texture); 
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); 
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image); 

    gl.generateMipmap(gl.TEXTURE_2D); 
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); 

    gl.uniform1i(gl.getUniformLocation(program, "texture"), 0); 
}